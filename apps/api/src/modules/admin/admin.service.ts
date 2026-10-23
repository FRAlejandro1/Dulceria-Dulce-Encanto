
import type { PoolConnection } from 'mysql2/promise';

import { registrarAuditoria } from '../audit/audit.repository.js';
import { ejecutarTransaccion } from '../../shared/database/transaction.js';
import { ErrorAplicacion } from '../../shared/http/app-error.js';
import {
  actualizarCategoria as actualizarCategoriaRepo,
  actualizarProducto as actualizarProductoRepo,
  actualizarVariante as actualizarVarianteRepo,
  crearCategoria as crearCategoriaRepo,
  crearProducto as crearProductoRepo,
  crearVariante as crearVarianteRepo,
  existeCategoria,
  existeProducto,
  existeVariante,
  listarCategoriasAdmin,
  listarProductosAdmin,
} from './admin.repository.js';
import type {
  ActualizarCategoria,
  ActualizarProducto,
  ActualizarVariante,
  CrearCategoria,
  CrearProducto,
  CrearVariante,
} from './admin.schemas.js';

function normalizarSlug(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
}

function mensajeDeConflicto(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ER_DUP_ENTRY'
  );
}

async function conConflictos<T>(
  operacion: () => Promise<T>,
): Promise<T> {
  try {
    return await operacion();
  } catch (error: unknown) {
    if (mensajeDeConflicto(error)) {
      throw new ErrorAplicacion(
        409,
        'Ya existe una categoría con ese slug o una variante con ese SKU',
      );
    }

    throw error;
  }
}

async function auditar(
  conexion: PoolConnection,
  actorId: string,
  accion: string,
  entidad: string,
  entidadId: string,
  detalles?: Record<string, unknown>,
): Promise<void> {
  await registrarAuditoria(conexion, {
    actorUserId: actorId,
    action: accion,
    entityType: entidad,
    entityId: entidadId,
    details: detalles ?? null,
  });
}

function validarSlug(slug: string): string {
  const normalizado = normalizarSlug(slug);

  if (normalizado.length === 0) {
    throw new ErrorAplicacion(
      400,
      'No se pudo generar un slug válido para la categoría',
    );
  }

  return normalizado;
}

export { listarCategoriasAdmin, listarProductosAdmin };

export async function crearCategoria(
  actorId: string,
  datos: CrearCategoria,
): Promise<{ id: string }> {
  return conConflictos(() => ejecutarTransaccion(async (conexion) => {
    const slug = validarSlug(datos.slug ?? datos.nombre);

    const id = await crearCategoriaRepo(conexion, {
      nombre: datos.nombre,
      slug,
    });

    await auditar(
      conexion,
      actorId,
      'ADMIN_CATEGORY_CREATED',
      'category',
      id,
      { slug },
    );

    return { id };
  }));
}

export async function actualizarCategoria(
  actorId: string,
  id: string,
  datos: ActualizarCategoria,
): Promise<void> {
  await conConflictos(() => ejecutarTransaccion(async (conexion) => {
    if (!(await existeCategoria(conexion, id))) {
      throw new ErrorAplicacion(404, 'La categoría no existe');
    }

    const cambios = {
      ...datos,
      ...(datos.slug !== undefined
        ? { slug: validarSlug(datos.slug) }
        : {}),
    };

    await actualizarCategoriaRepo(conexion, id, cambios);

    await auditar(
      conexion,
      actorId,
      'ADMIN_CATEGORY_UPDATED',
      'category',
      id,
      { campos: Object.keys(cambios) },
    );
  }));
}

export async function crearProducto(
  actorId: string,
  datos: CrearProducto,
): Promise<{ id: string }> {
  return conConflictos(() => ejecutarTransaccion(async (conexion) => {
    if (!(await existeCategoria(conexion, datos.categoriaId))) {
      throw new ErrorAplicacion(404, 'La categoría no existe');
    }

    const id = await crearProductoRepo(conexion, {
      nombre: datos.nombre,
      descripcion: datos.descripcion ?? null,
      imagenUrl: datos.imagenUrl ?? null,
      categoriaId: datos.categoriaId,
      activo: datos.activo ?? true,
    });

    for (const variante of datos.variantes) {
      await crearVarianteRepo(conexion, id, {
        nombre: variante.nombre,
        sku: variante.sku,
        precio: variante.precio,
        imagenUrl: variante.imagenUrl ?? null,
        activa: variante.activa ?? true,
      });
    }

    await auditar(
      conexion,
      actorId,
      'ADMIN_PRODUCT_CREATED',
      'product',
      id,
      { cantidadVariantes: datos.variantes.length },
    );

    return { id };
  }));
}

export async function actualizarProducto(
  actorId: string,
  id: string,
  datos: ActualizarProducto,
): Promise<void> {
  await conConflictos(() => ejecutarTransaccion(async (conexion) => {
    if (!(await existeProducto(conexion, id))) {
      throw new ErrorAplicacion(404, 'El producto no existe');
    }

    if (
      datos.categoriaId !== undefined &&
      !(await existeCategoria(conexion, datos.categoriaId))
    ) {
      throw new ErrorAplicacion(404, 'La categoría no existe');
    }

    await actualizarProductoRepo(conexion, id, datos);

    await auditar(
      conexion,
      actorId,
      'ADMIN_PRODUCT_UPDATED',
      'product',
      id,
      { campos: Object.keys(datos) },
    );
  }));
}

export async function crearVariante(
  actorId: string,
  productoId: string,
  datos: CrearVariante,
): Promise<{ id: string }> {
  return conConflictos(() => ejecutarTransaccion(async (conexion) => {
    if (!(await existeProducto(conexion, productoId))) {
      throw new ErrorAplicacion(404, 'El producto no existe');
    }

    const id = await crearVarianteRepo(conexion, productoId, {
      nombre: datos.nombre,
      sku: datos.sku,
      precio: datos.precio,
      imagenUrl: datos.imagenUrl ?? null,
      activa: datos.activa ?? true,
    });

    await auditar(
      conexion,
      actorId,
      'ADMIN_VARIANT_CREATED',
      'product_variant',
      id,
      { productoId },
    );

    return { id };
  }));
}

export async function actualizarVariante(
  actorId: string,
  id: string,
  datos: ActualizarVariante,
): Promise<void> {
  await conConflictos(() => ejecutarTransaccion(async (conexion) => {
    if (!(await existeVariante(conexion, id))) {
      throw new ErrorAplicacion(404, 'La variante no existe');
    }

    await actualizarVarianteRepo(conexion, id, datos);

    await auditar(
      conexion,
      actorId,
      'ADMIN_VARIANT_UPDATED',
      'product_variant',
      id,
      { campos: Object.keys(datos) },
    );
  }));
}
