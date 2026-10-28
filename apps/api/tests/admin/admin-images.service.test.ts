
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  registrarAuditoria: vi.fn(),
  ejecutarTransaccion: vi.fn(),
  registrarError: vi.fn(),
  actualizarImagenCategoria: vi.fn(),
  actualizarImagenVariante: vi.fn(),
  actualizarPosicionImagenVariante: vi.fn(),
  contarImagenesVariante: vi.fn(),
  eliminarImagenVarianteRepo: vi.fn(),
  guardarImagenVariante: vi.fn(),
  listarImagenesVariante: vi.fn(),
  obtenerImagenCategoria: vi.fn(),
  obtenerImagenVariantePorPosicion: vi.fn(),
  obtenerVarianteParaImagen: vi.fn(),
  almacenamientoGuardar: vi.fn(),
  almacenamientoEliminar: vi.fn(),
  obtenerReferenciaLocal: vi.fn(),
}));

vi.mock('../../src/modules/audit/audit.repository.js', () => ({
  registrarAuditoria: mocks.registrarAuditoria,
}));

vi.mock('../../src/shared/database/transaction.js', () => ({
  ejecutarTransaccion: mocks.ejecutarTransaccion,
}));

vi.mock('../../src/shared/logging/logger.js', () => ({
  registrarError: mocks.registrarError,
}));

vi.mock('../../src/modules/admin/admin-images.repository.js', () => ({
  actualizarImagenCategoria: mocks.actualizarImagenCategoria,
  actualizarImagenVariante: mocks.actualizarImagenVariante,
  actualizarPosicionImagenVariante:
    mocks.actualizarPosicionImagenVariante,
  contarImagenesVariante: mocks.contarImagenesVariante,
  eliminarImagenVariante: mocks.eliminarImagenVarianteRepo,
  guardarImagenVariante: mocks.guardarImagenVariante,
  listarImagenesVariante: mocks.listarImagenesVariante,
  obtenerImagenCategoria: mocks.obtenerImagenCategoria,
  obtenerImagenVariantePorPosicion:
    mocks.obtenerImagenVariantePorPosicion,
  obtenerVarianteParaImagen: mocks.obtenerVarianteParaImagen,
}));

vi.mock('../../src/modules/admin/storage/local-image-storage.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../src/modules/admin/storage/local-image-storage.js')
  >('../../src/modules/admin/storage/local-image-storage.js');

  return {
    ...actual,
    AlmacenamientoImagenesLocal: class {
      guardar = mocks.almacenamientoGuardar;
      eliminar = mocks.almacenamientoEliminar;
      obtenerReferenciaLocal = mocks.obtenerReferenciaLocal;
    },
  };
});

import {
  cargarImagenCategoria,
  cargarImagenVariante,
  eliminarImagenCategoria,
  eliminarImagenVariante,
} from '../../src/modules/admin/admin-images.service.js';

import { ErrorAplicacion } from '../../src/shared/http/app-error.js';
import {
  AlmacenamientoImagenesLocal,
  ErrorImagenInvalida,
} from '../../src/modules/admin/storage/local-image-storage.js';

const conexion = {} as never;

function crearArchivo(): Express.Multer.File {
  return {
    buffer: Buffer.from('imagen-de-prueba'),
    mimetype: 'image/jpeg',
    originalname: 'postre.jpg',
    fieldname: 'imagen',
    encoding: '7bit',
    size: 17,
    destination: '',
    filename: 'postre.jpg',
    path: '',
    stream: {} as never,
  };
}

function imagenGuardada(
  sobreescrituras: Record<string, unknown> = {},
) {
  return {
    url: '/uploads/postre.jpg',
    nombreArchivo: 'postre.jpg',
    ...sobreescrituras,
  };
}

function ejecutarTransaccionDirectamente() {
  mocks.ejecutarTransaccion.mockImplementation(
    async (operacion: (conn: never) => Promise<unknown>) =>
      operacion(conexion),
  );
}

beforeEach(() => {
  vi.clearAllMocks();

  ejecutarTransaccionDirectamente();

  mocks.registrarAuditoria.mockResolvedValue(undefined);
  mocks.actualizarImagenCategoria.mockResolvedValue(undefined);
  mocks.actualizarImagenVariante.mockResolvedValue(undefined);
  mocks.actualizarPosicionImagenVariante.mockResolvedValue(undefined);
  mocks.contarImagenesVariante.mockResolvedValue(0);
  mocks.guardarImagenVariante.mockResolvedValue('imagen-nueva');
  mocks.listarImagenesVariante.mockResolvedValue([]);
  mocks.almacenamientoGuardar.mockResolvedValue(imagenGuardada());
  mocks.almacenamientoEliminar.mockResolvedValue(undefined);
  mocks.obtenerReferenciaLocal.mockImplementation(
    (url: string | null) =>
      url?.startsWith('/uploads/') ? url.slice('/uploads/'.length) : null,
  );
});

describe('cargarImagenCategoria', () => {
  it('rechaza la petición si no se adjunta una imagen', async () => {
    await expect(
      cargarImagenCategoria('usuario-1', 'categoria-1', undefined),
    ).rejects.toMatchObject({
      status: 400,
      mensajePublico: 'Debe adjuntar una imagen.',
    });

    expect(mocks.almacenamientoGuardar).not.toHaveBeenCalled();
  });

  it('guarda la imagen, actualiza la categoría y registra auditoría', async () => {
    mocks.obtenerImagenCategoria.mockResolvedValue({
      imagenUrl: null,
    });

    const resultado = await cargarImagenCategoria(
      'usuario-1',
      'categoria-1',
      crearArchivo(),
    );

    expect(resultado).toEqual({ imagenUrl: '/uploads/postre.jpg' });
    expect(mocks.almacenamientoGuardar).toHaveBeenCalledWith(
      'category',
      expect.any(Buffer),
      'image/jpeg',
    );
    expect(mocks.actualizarImagenCategoria).toHaveBeenCalledWith(
      conexion,
      'categoria-1',
      '/uploads/postre.jpg',
    );
    expect(mocks.registrarAuditoria).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        actorUserId: 'usuario-1',
        action: 'ADMIN_CATEGORY_IMAGE_UPDATED',
        entityType: 'category',
        entityId: 'categoria-1',
      }),
    );
  });

  it('rechaza una categoría inexistente y limpia la imagen nueva', async () => {
    mocks.obtenerImagenCategoria.mockResolvedValue(null);

    await expect(
      cargarImagenCategoria(
        'usuario-1',
        'categoria-inexistente',
        crearArchivo(),
      ),
    ).rejects.toMatchObject({
      status: 404,
      mensajePublico: expect.stringMatching(/La categor.*no existe\./),
    });

    expect(mocks.almacenamientoEliminar).toHaveBeenCalledWith(
      'postre.jpg',
    );
  });

  it('limpia la imagen anterior local después de reemplazarla', async () => {
    mocks.obtenerImagenCategoria.mockResolvedValue({
      imagenUrl: '/uploads/anterior.jpg',
    });

    await cargarImagenCategoria(
      'usuario-1',
      'categoria-1',
      crearArchivo(),
    );

    expect(mocks.almacenamientoEliminar).toHaveBeenCalledWith(
      'anterior.jpg',
    );
  });

  it('no interrumpe la operación si falla la limpieza de la imagen anterior', async () => {
    mocks.obtenerImagenCategoria.mockResolvedValue({
      imagenUrl: '/uploads/anterior.jpg',
    });
    mocks.almacenamientoEliminar.mockRejectedValue(
      new Error('No se pudo borrar el archivo'),
    );

    await expect(
      cargarImagenCategoria(
        'usuario-1',
        'categoria-1',
        crearArchivo(),
      ),
    ).resolves.toEqual({ imagenUrl: '/uploads/postre.jpg' });

    expect(mocks.registrarError).toHaveBeenCalledWith(
      'admin.category_old_image_cleanup_failed',
      expect.any(Error),
    );
  });

  it('convierte errores de procesamiento de imagen en error HTTP 400', async () => {
    mocks.almacenamientoGuardar.mockRejectedValue(
      new ErrorImagenInvalida('Formato inválido'),
    );

    await expect(
      cargarImagenCategoria(
        'usuario-1',
        'categoria-1',
        crearArchivo(),
      ),
    ).rejects.toBeInstanceOf(ErrorAplicacion);
  });

  it('propaga errores inesperados al guardar la imagen', async () => {
    const error = new Error('Fallo inesperado');
    mocks.almacenamientoGuardar.mockRejectedValue(error);

    await expect(
      cargarImagenCategoria(
        'usuario-1',
        'categoria-1',
        crearArchivo(),
      ),
    ).rejects.toBe(error);
  });

  it('limpia la imagen nueva si falla la transacción', async () => {
    mocks.obtenerImagenCategoria.mockResolvedValue({
      imagenUrl: null,
    });
    mocks.ejecutarTransaccion.mockRejectedValue(
      new Error('Error de base de datos'),
    );

    await expect(
      cargarImagenCategoria(
        'usuario-1',
        'categoria-1',
        crearArchivo(),
      ),
    ).rejects.toThrow('Error de base de datos');

    expect(mocks.almacenamientoEliminar).toHaveBeenCalledWith(
      'postre.jpg',
    );
  });
});

describe('eliminarImagenCategoria', () => {
  it('rechaza una categoría inexistente', async () => {
    mocks.obtenerImagenCategoria.mockResolvedValue(null);

    await expect(
      eliminarImagenCategoria('usuario-1', 'categoria-1'),
    ).rejects.toMatchObject({
      status: 404,
      mensajePublico: expect.stringMatching(/La categor.*no existe\./),
    });
  });

  it('rechaza una categoría que no tiene imagen', async () => {
    mocks.obtenerImagenCategoria.mockResolvedValue({
      imagenUrl: null,
    });

    await expect(
      eliminarImagenCategoria('usuario-1', 'categoria-1'),
    ).rejects.toMatchObject({
      status: 404,
      mensajePublico: expect.stringMatching(/La categor.*no tiene una imagen asignada\./),
    });
  });

  it('elimina la referencia de imagen, registra auditoría y limpia el archivo', async () => {
    mocks.obtenerImagenCategoria.mockResolvedValue({
      imagenUrl: '/uploads/postre.jpg',
    });

    await eliminarImagenCategoria('usuario-1', 'categoria-1');

    expect(mocks.actualizarImagenCategoria).toHaveBeenCalledWith(
      conexion,
      'categoria-1',
      null,
    );
    expect(mocks.registrarAuditoria).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        action: 'ADMIN_CATEGORY_IMAGE_DELETED',
        entityType: 'category',
        entityId: 'categoria-1',
      }),
    );
    expect(mocks.almacenamientoEliminar).toHaveBeenCalledWith(
      'postre.jpg',
    );
  });

  it('registra el error si falla la limpieza del archivo eliminado', async () => {
    mocks.obtenerImagenCategoria.mockResolvedValue({
      imagenUrl: '/uploads/postre.jpg',
    });
    mocks.almacenamientoEliminar.mockRejectedValue(
      new Error('Error al borrar'),
    );

    await expect(
      eliminarImagenCategoria('usuario-1', 'categoria-1'),
    ).resolves.toBeUndefined();

    expect(mocks.registrarError).toHaveBeenCalledWith(
      'admin.category_image_cleanup_failed',
      expect.any(Error),
    );
  });
});

describe('cargarImagenVariante', () => {
  it('rechaza la petición si no se adjunta una imagen', async () => {
    await expect(
      cargarImagenVariante('usuario-1', 'variante-1', undefined, 1),
    ).rejects.toMatchObject({
      status: 400,
      mensajePublico: 'Debe adjuntar una imagen.',
    });
  });

  it.each([0, 4, 1.5, Number.NaN])(
    'rechaza la posición inválida %s',
    async (posicion) => {
      await expect(
        cargarImagenVariante(
          'usuario-1',
          'variante-1',
          crearArchivo(),
          posicion,
        ),
      ).rejects.toMatchObject({
        status: 400,
        mensajePublico: expect.stringMatching(/La posici.*de la imagen debe estar entre 1 y 3\./),
      });
    },
  );

  it('rechaza una variante inexistente y limpia el archivo nuevo', async () => {
    mocks.obtenerVarianteParaImagen.mockResolvedValue(false);

    await expect(
      cargarImagenVariante(
        'usuario-1',
        'variante-inexistente',
        crearArchivo(),
        1,
      ),
    ).rejects.toMatchObject({
      status: 404,
      mensajePublico: 'La variante no existe.',
    });

    expect(mocks.almacenamientoEliminar).toHaveBeenCalledWith(
      'postre.jpg',
    );
  });

  it('crea una imagen nueva para la variante', async () => {
    mocks.obtenerVarianteParaImagen.mockResolvedValue(true);
    mocks.obtenerImagenVariantePorPosicion.mockResolvedValue(null);
    mocks.contarImagenesVariante.mockResolvedValue(1);
    mocks.guardarImagenVariante.mockResolvedValue('imagen-1');

    await expect(
      cargarImagenVariante(
        'usuario-1',
        'variante-1',
        crearArchivo(),
        2,
      ),
    ).resolves.toEqual({
      id: 'imagen-1',
      imagenUrl: '/uploads/postre.jpg',
      posicion: 2,
    });

    expect(mocks.guardarImagenVariante).toHaveBeenCalledWith(
      conexion,
      'variante-1',
      '/uploads/postre.jpg',
      2,
    );
    expect(mocks.registrarAuditoria).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        action: 'ADMIN_VARIANT_IMAGE_CREATED',
        entityType: 'product_variant',
      }),
    );
  });

  it('reemplaza una imagen existente en la posición indicada', async () => {
    mocks.obtenerVarianteParaImagen.mockResolvedValue(true);
    mocks.obtenerImagenVariantePorPosicion.mockResolvedValue({
      id: 'imagen-anterior',
      imagenUrl: '/uploads/anterior.jpg',
      posicion: 1,
    });

    await expect(
      cargarImagenVariante(
        'usuario-1',
        'variante-1',
        crearArchivo(),
        1,
      ),
    ).resolves.toEqual({
      id: 'imagen-anterior',
      imagenUrl: '/uploads/postre.jpg',
      posicion: 1,
    });

    expect(mocks.actualizarImagenVariante).toHaveBeenCalledWith(
      conexion,
      'imagen-anterior',
      '/uploads/postre.jpg',
    );
    expect(mocks.almacenamientoEliminar).toHaveBeenCalledWith(
      'anterior.jpg',
    );
    expect(mocks.registrarAuditoria).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        action: 'ADMIN_VARIANT_IMAGE_UPDATED',
      }),
    );
  });

  it('rechaza una cuarta imagen para la variante', async () => {
    mocks.obtenerVarianteParaImagen.mockResolvedValue(true);
    mocks.obtenerImagenVariantePorPosicion.mockResolvedValue(null);
    mocks.contarImagenesVariante.mockResolvedValue(3);

    await expect(
      cargarImagenVariante(
        'usuario-1',
        'variante-1',
        crearArchivo(),
        3,
      ),
    ).rejects.toMatchObject({
      status: 409,
      mensajePublico: expect.stringMatching(/La variante ya tiene el .*ximo de tres im.*genes\./),
    });

    expect(mocks.almacenamientoEliminar).toHaveBeenCalledWith(
      'postre.jpg',
    );
  });

  it('convierte errores de almacenamiento inválido en error HTTP 400', async () => {
    mocks.almacenamientoGuardar.mockRejectedValue(
      new ErrorImagenInvalida('Imagen inválida'),
    );

    await expect(
      cargarImagenVariante(
        'usuario-1',
        'variante-1',
        crearArchivo(),
        1,
      ),
    ).rejects.toBeInstanceOf(ErrorAplicacion);
  });

  it('propaga errores inesperados del almacenamiento', async () => {
    const error = new Error('Fallo inesperado');
    mocks.almacenamientoGuardar.mockRejectedValue(error);

    await expect(
      cargarImagenVariante(
        'usuario-1',
        'variante-1',
        crearArchivo(),
        1,
      ),
    ).rejects.toBe(error);
  });

  it('limpia la imagen nueva si falla la transacción', async () => {
    mocks.obtenerVarianteParaImagen.mockResolvedValue(true);
    mocks.obtenerImagenVariantePorPosicion.mockResolvedValue(null);
    mocks.ejecutarTransaccion.mockRejectedValue(
      new Error('Error de base de datos'),
    );

    await expect(
      cargarImagenVariante(
        'usuario-1',
        'variante-1',
        crearArchivo(),
        1,
      ),
    ).rejects.toThrow('Error de base de datos');

    expect(mocks.almacenamientoEliminar).toHaveBeenCalledWith(
      'postre.jpg',
    );
  });
});

describe('eliminarImagenVariante', () => {
  it('rechaza una variante inexistente', async () => {
    mocks.obtenerVarianteParaImagen.mockResolvedValue(false);

    await expect(
      eliminarImagenVariante(
        'usuario-1',
        'variante-1',
        'imagen-1',
      ),
    ).rejects.toMatchObject({
      status: 404,
      mensajePublico: 'La variante no existe.',
    });
  });

  it('rechaza una imagen que no pertenece a la variante', async () => {
    mocks.obtenerVarianteParaImagen.mockResolvedValue(true);
    mocks.eliminarImagenVarianteRepo.mockResolvedValue(null);

    await expect(
      eliminarImagenVariante(
        'usuario-1',
        'variante-1',
        'imagen-1',
      ),
    ).rejects.toMatchObject({
      status: 404,
      mensajePublico: 'La imagen no existe en esta variante.',
    });
  });

  it('elimina la imagen, reordena las posiciones posteriores y audita', async () => {
    mocks.obtenerVarianteParaImagen.mockResolvedValue(true);
    mocks.eliminarImagenVarianteRepo.mockResolvedValue({
      imagenUrl: '/uploads/eliminada.jpg',
      posicion: 1,
    });
    mocks.listarImagenesVariante.mockResolvedValue([
      { id: 'imagen-3', posicion: 3 },
      { id: 'imagen-2', posicion: 2 },
      { id: 'imagen-1', posicion: 1 },
    ]);

    await eliminarImagenVariante(
      'usuario-1',
      'variante-1',
      'imagen-eliminada',
    );

    expect(mocks.actualizarPosicionImagenVariante).toHaveBeenNthCalledWith(
      1,
      conexion,
      'imagen-2',
      1,
    );
    expect(mocks.actualizarPosicionImagenVariante).toHaveBeenNthCalledWith(
      2,
      conexion,
      'imagen-3',
      2,
    );
    expect(mocks.registrarAuditoria).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        action: 'ADMIN_VARIANT_IMAGE_DELETED',
        entityType: 'product_variant',
        entityId: 'variante-1',
      }),
    );
    expect(mocks.almacenamientoEliminar).toHaveBeenCalledWith(
      'eliminada.jpg',
    );
  });

  it('no falla si la imagen eliminada no tiene archivo local', async () => {
    mocks.obtenerVarianteParaImagen.mockResolvedValue(true);
    mocks.eliminarImagenVarianteRepo.mockResolvedValue({
      imagenUrl: 'https://example.com/externa.jpg',
      posicion: 2,
    });
    mocks.obtenerReferenciaLocal.mockReturnValue(null);
    mocks.listarImagenesVariante.mockResolvedValue([]);

    await expect(
      eliminarImagenVariante(
        'usuario-1',
        'variante-1',
        'imagen-1',
      ),
    ).resolves.toBeUndefined();

    expect(mocks.almacenamientoEliminar).not.toHaveBeenCalled();
  });
});

describe('AlmacenamientoImagenesLocal', () => {
  it('permite verificar que el almacenamiento real se exporta', () => {
    expect(AlmacenamientoImagenesLocal).toBeDefined();
  });
});
