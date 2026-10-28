import type { PoolConnection } from 'mysql2/promise';

import { registrarAuditoria } from '../audit/audit.repository.js';
import { ejecutarTransaccion } from '../../shared/database/transaction.js';
import { ErrorAplicacion } from '../../shared/http/app-error.js';
import { registrarError } from '../../shared/logging/logger.js';
import {
  actualizarImagenCategoria,
  actualizarImagenProducto,
  actualizarImagenVariante,
  actualizarImagenPrincipalVariante,
  actualizarPosicionImagenVariante,
  contarImagenesVariante,
  eliminarImagenVariante as eliminarImagenVarianteRepo,
  guardarImagenVariante,
  listarImagenesVariante,
  obtenerImagenCategoria,
  obtenerImagenProducto,
  obtenerImagenPrincipalVariante,
  obtenerImagenVariantePorPosicion,
  obtenerVarianteParaImagen,
} from './admin-images.repository.js';
import {
  AlmacenamientoImagenesLocal,
  ErrorImagenInvalida,
} from './storage/local-image-storage.js';

const almacenamiento = new AlmacenamientoImagenesLocal();

type ImagenGuardada = Awaited<
  ReturnType<typeof almacenamiento.guardar>
>;

interface ResultadoImagenVariante {
  id: string;
  imagenUrl: string;
  posicion: number;
}

async function auditarImagen(
  conexion: PoolConnection,
  actorId: string,
  accion: string,
  entidad: string,
  entidadId: string,
  detalles: Record<string, unknown>,
): Promise<void> {
  await registrarAuditoria(conexion, {
    actorUserId: actorId,
    action: accion,
    entityType: entidad,
    entityId: entidadId,
    details: detalles,
  });
}

async function limpiarImagen(
  referencia: string | null,
  evento: string,
): Promise<void> {
  if (referencia === null) {
    return;
  }

  try {
    await almacenamiento.eliminar(referencia);
  } catch (error: unknown) {
    registrarError(evento, error);
  }
}

function validarArchivo(
  archivo: Express.Multer.File | undefined,
): Express.Multer.File {
  if (archivo === undefined) {
    throw new ErrorAplicacion(400, 'Debe adjuntar una imagen.');
  }

  return archivo;
}

function validarPosicion(posicion: number): void {
  if (!Number.isInteger(posicion) || posicion < 1 || posicion > 3) {
    throw new ErrorAplicacion(
      400,
      'La posición de la imagen debe estar entre 1 y 3.',
    );
  }
}

async function guardarImagen(
  tipo: 'category' | 'product' | 'variant',
  archivo: Express.Multer.File,
): Promise<ImagenGuardada> {
  try {
    return await almacenamiento.guardar(
      tipo,
      archivo.buffer,
      archivo.mimetype,
    );
  } catch (error: unknown) {
    if (error instanceof ErrorImagenInvalida) {
      throw new ErrorAplicacion(
        400,
        'No se pudo procesar la imagen. Verifique su formato, contenido y dimensiones.',
      );
    }

    throw error;
  }
}

export async function cargarImagenCategoria(
  actorId: string,
  categoriaId: string,
  archivoEntrada: Express.Multer.File | undefined,
): Promise<{ imagenUrl: string }> {
  const archivo = validarArchivo(archivoEntrada);
  const imagenNueva = await guardarImagen('category', archivo);

  let imagenAnterior: string | null = null;

  try {
    await ejecutarTransaccion(async (conexion) => {
      const categoria = await obtenerImagenCategoria(
        conexion,
        categoriaId,
        true,
      );

      if (categoria === null) {
        throw new ErrorAplicacion(404, 'La categoría no existe.');
      }

      imagenAnterior = categoria.imagenUrl;

      await actualizarImagenCategoria(
        conexion,
        categoriaId,
        imagenNueva.url,
      );

      await auditarImagen(
        conexion,
        actorId,
        'ADMIN_CATEGORY_IMAGE_UPDATED',
        'category',
        categoriaId,
        { imagenUrl: imagenNueva.url },
      );
    });
  } catch (error: unknown) {
    await limpiarImagen(
      imagenNueva.nombreArchivo,
      'admin.category_image_cleanup_failed',
    );

    throw error;
  }

  await limpiarImagen(
    almacenamiento.obtenerReferenciaLocal(imagenAnterior),
    'admin.category_old_image_cleanup_failed',
  );

  return { imagenUrl: imagenNueva.url };
}

export async function eliminarImagenCategoria(
  actorId: string,
  categoriaId: string,
): Promise<void> {
  let referenciaAnterior: string | null = null;

  await ejecutarTransaccion(async (conexion) => {
    const categoria = await obtenerImagenCategoria(
      conexion,
      categoriaId,
      true,
    );

    if (categoria === null) {
      throw new ErrorAplicacion(404, 'La categoría no existe.');
    }

    if (categoria.imagenUrl === null) {
      throw new ErrorAplicacion(
        404,
        'La categoría no tiene una imagen asignada.',
      );
    }

    referenciaAnterior = almacenamiento.obtenerReferenciaLocal(
      categoria.imagenUrl,
    );

    await actualizarImagenCategoria(conexion, categoriaId, null);

    await auditarImagen(
      conexion,
      actorId,
      'ADMIN_CATEGORY_IMAGE_DELETED',
      'category',
      categoriaId,
      {},
    );
  });

  await limpiarImagen(
    referenciaAnterior,
    'admin.category_image_cleanup_failed',
  );
}

export async function cargarImagenProducto(
  actorId: string,
  productoId: string,
  archivoEntrada: Express.Multer.File | undefined,
): Promise<{ imagenUrl: string }> {
  const archivo = validarArchivo(archivoEntrada);
  const imagenNueva = await guardarImagen('product', archivo);

  let imagenAnterior: string | null = null;

  try {
    await ejecutarTransaccion(async (conexion) => {
      const producto = await obtenerImagenProducto(
        conexion,
        productoId,
        true,
      );

      if (producto === null) {
        throw new ErrorAplicacion(404, 'El producto no existe.');
      }

      imagenAnterior = producto.imagenUrl;

      await actualizarImagenProducto(
        conexion,
        productoId,
        imagenNueva.url,
      );

      await auditarImagen(
        conexion,
        actorId,
        'ADMIN_PRODUCT_IMAGE_UPDATED',
        'product',
        productoId,
        { imagenUrl: imagenNueva.url },
      );
    });
  } catch (error: unknown) {
    await limpiarImagen(
      imagenNueva.nombreArchivo,
      'admin.product_image_cleanup_failed',
    );

    throw error;
  }

  await limpiarImagen(
    almacenamiento.obtenerReferenciaLocal(imagenAnterior),
    'admin.product_old_image_cleanup_failed',
  );

  return { imagenUrl: imagenNueva.url };
}

export async function eliminarImagenProducto(
  actorId: string,
  productoId: string,
): Promise<void> {
  let referenciaAnterior: string | null = null;

  await ejecutarTransaccion(async (conexion) => {
    const producto = await obtenerImagenProducto(
      conexion,
      productoId,
      true,
    );

    if (producto === null) {
      throw new ErrorAplicacion(404, 'El producto no existe.');
    }

    if (producto.imagenUrl === null) {
      throw new ErrorAplicacion(
        404,
        'El producto no tiene una imagen asignada.',
      );
    }

    referenciaAnterior = almacenamiento.obtenerReferenciaLocal(
      producto.imagenUrl,
    );

    await actualizarImagenProducto(conexion, productoId, null);

    await auditarImagen(
      conexion,
      actorId,
      'ADMIN_PRODUCT_IMAGE_DELETED',
      'product',
      productoId,
      {},
    );
  });

  await limpiarImagen(
    referenciaAnterior,
    'admin.product_image_cleanup_failed',
  );
}

export async function cargarImagenPrincipalVariante(
  actorId: string,
  varianteId: string,
  archivoEntrada: Express.Multer.File | undefined,
): Promise<{ imagenUrl: string }> {
  const archivo = validarArchivo(archivoEntrada);
  const imagenNueva = await guardarImagen('variant', archivo);

  let imagenAnterior: string | null = null;

  try {
    await ejecutarTransaccion(async (conexion) => {
      const variante = await obtenerImagenPrincipalVariante(
        conexion,
        varianteId,
        true,
      );

      if (variante === null) {
        throw new ErrorAplicacion(404, 'La variante no existe.');
      }

      imagenAnterior = variante.imagenUrl;

      await actualizarImagenPrincipalVariante(
        conexion,
        varianteId,
        imagenNueva.url,
      );

      await auditarImagen(
        conexion,
        actorId,
        'ADMIN_VARIANT_MAIN_IMAGE_UPDATED',
        'product_variant',
        varianteId,
        { imagenUrl: imagenNueva.url },
      );
    });
  } catch (error: unknown) {
    await limpiarImagen(
      imagenNueva.nombreArchivo,
      'admin.variant_main_image_cleanup_failed',
    );

    throw error;
  }

  await limpiarImagen(
    almacenamiento.obtenerReferenciaLocal(imagenAnterior),
    'admin.variant_old_main_image_cleanup_failed',
  );

  return { imagenUrl: imagenNueva.url };
}

export async function eliminarImagenPrincipalVariante(
  actorId: string,
  varianteId: string,
): Promise<void> {
  let referenciaAnterior: string | null = null;

  await ejecutarTransaccion(async (conexion) => {
    const variante = await obtenerImagenPrincipalVariante(
      conexion,
      varianteId,
      true,
    );

    if (variante === null) {
      throw new ErrorAplicacion(404, 'La variante no existe.');
    }

    if (variante.imagenUrl === null) {
      throw new ErrorAplicacion(
        404,
        'La variante no tiene una imagen principal asignada.',
      );
    }

    referenciaAnterior = almacenamiento.obtenerReferenciaLocal(
      variante.imagenUrl,
    );

    await actualizarImagenPrincipalVariante(
      conexion,
      varianteId,
      null,
    );

    await auditarImagen(
      conexion,
      actorId,
      'ADMIN_VARIANT_MAIN_IMAGE_DELETED',
      'product_variant',
      varianteId,
      {},
    );
  });

  await limpiarImagen(
    referenciaAnterior,
    'admin.variant_main_image_cleanup_failed',
  );
}

export async function listarImagenesAdicionalesVariante(
  varianteId: string,
) {
  return ejecutarTransaccion(async (conexion) => {
    const existe = await obtenerVarianteParaImagen(conexion, varianteId);

    if (!existe) {
      throw new Error('Variante no encontrada');
    }

    return listarImagenesVariante(conexion, varianteId);
  });
}
export async function cargarImagenVariante(
  actorId: string,
  varianteId: string,
  archivoEntrada: Express.Multer.File | undefined,
  posicion: number,
): Promise<ResultadoImagenVariante> {
  const archivo = validarArchivo(archivoEntrada);
  validarPosicion(posicion);

  const imagenNueva = await guardarImagen('variant', archivo);

  let referenciaAnterior: string | null = null;
  let imagenResultado: ResultadoImagenVariante | null = null;

  try {
    await ejecutarTransaccion(async (conexion) => {
      const existe = await obtenerVarianteParaImagen(
        conexion,
        varianteId,
        true,
      );

      if (!existe) {
        throw new ErrorAplicacion(404, 'La variante no existe.');
      }

      const imagenExistente = await obtenerImagenVariantePorPosicion(
        conexion,
        varianteId,
        posicion,
      );

      if (imagenExistente !== null) {
        referenciaAnterior = almacenamiento.obtenerReferenciaLocal(
          imagenExistente.imagenUrl,
        );

        await actualizarImagenVariante(
          conexion,
          imagenExistente.id,
          imagenNueva.url,
        );

        imagenResultado = {
          id: imagenExistente.id,
          imagenUrl: imagenNueva.url,
          posicion,
        };
      } else {
        const cantidad = await contarImagenesVariante(
          conexion,
          varianteId,
        );

        if (cantidad >= 3) {
          throw new ErrorAplicacion(
            409,
            'La variante ya tiene el máximo de tres imágenes.',
          );
        }

        const id = await guardarImagenVariante(
          conexion,
          varianteId,
          imagenNueva.url,
          posicion,
        );

        imagenResultado = {
          id,
          imagenUrl: imagenNueva.url,
          posicion,
        };
      }

      await auditarImagen(
        conexion,
        actorId,
        imagenExistente === null
          ? 'ADMIN_VARIANT_IMAGE_CREATED'
          : 'ADMIN_VARIANT_IMAGE_UPDATED',
        'product_variant',
        varianteId,
        {
          imagenId: imagenResultado.id,
          posicion,
          imagenUrl: imagenNueva.url,
        },
      );
    });
  } catch (error: unknown) {
    await limpiarImagen(
      imagenNueva.nombreArchivo,
      'admin.variant_image_cleanup_failed',
    );

    throw error;
  }

  await limpiarImagen(
    referenciaAnterior,
    'admin.variant_old_image_cleanup_failed',
  );

  if (imagenResultado === null) {
    throw new ErrorAplicacion(
      500,
      'No se pudo confirmar el resultado de la imagen.',
    );
  }

  return imagenResultado;
}

export async function eliminarImagenVariante(
  actorId: string,
  varianteId: string,
  imagenId: string,
): Promise<void> {
  let referenciaAnterior: string | null = null;

  await ejecutarTransaccion(async (conexion) => {
    const existe = await obtenerVarianteParaImagen(
      conexion,
      varianteId,
      true,
    );

    if (!existe) {
      throw new ErrorAplicacion(404, 'La variante no existe.');
    }

    const imagen = await eliminarImagenVarianteRepo(
      conexion,
      varianteId,
      imagenId,
    );

    if (imagen === null) {
      throw new ErrorAplicacion(
        404,
        'La imagen no existe en esta variante.',
      );
    }

    referenciaAnterior = almacenamiento.obtenerReferenciaLocal(
      imagen.imagenUrl,
    );

    const restantes = await listarImagenesVariante(
      conexion,
      varianteId,
    );

    const posteriores = restantes
      .filter((item) => item.posicion > imagen.posicion)
      .sort((a, b) => a.posicion - b.posicion);

    for (const posterior of posteriores) {
      await actualizarPosicionImagenVariante(
        conexion,
        posterior.id,
        posterior.posicion - 1,
      );
    }

    await auditarImagen(
      conexion,
      actorId,
      'ADMIN_VARIANT_IMAGE_DELETED',
      'product_variant',
      varianteId,
      {
        imagenId,
        posicionAnterior: imagen.posicion,
      },
    );
  });

  await limpiarImagen(
    referenciaAnterior,
    'admin.variant_image_cleanup_failed',
  );
}
