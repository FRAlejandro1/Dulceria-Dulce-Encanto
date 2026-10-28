import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  registrarAuditoria: vi.fn(),
  ejecutarTransaccion: vi.fn(),
  registrarError: vi.fn(),
  actualizarImagenCategoria: vi.fn(),
  actualizarImagenProducto: vi.fn(),
  actualizarImagenVariante: vi.fn(),
  actualizarImagenPrincipalVariante: vi.fn(),
  actualizarPosicionImagenVariante: vi.fn(),
  contarImagenesVariante: vi.fn(),
  eliminarImagenVarianteRepo: vi.fn(),
  guardarImagenVariante: vi.fn(),
  listarImagenesVariante: vi.fn(),
  obtenerImagenCategoria: vi.fn(),
  obtenerImagenProducto: vi.fn(),
  obtenerImagenPrincipalVariante: vi.fn(),
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
  actualizarImagenProducto: mocks.actualizarImagenProducto,
  actualizarImagenVariante: mocks.actualizarImagenVariante,
  actualizarImagenPrincipalVariante: mocks.actualizarImagenPrincipalVariante,
  actualizarPosicionImagenVariante: mocks.actualizarPosicionImagenVariante,
  contarImagenesVariante: mocks.contarImagenesVariante,
  eliminarImagenVariante: mocks.eliminarImagenVarianteRepo,
  guardarImagenVariante: mocks.guardarImagenVariante,
  listarImagenesVariante: mocks.listarImagenesVariante,
  obtenerImagenCategoria: mocks.obtenerImagenCategoria,
  obtenerImagenProducto: mocks.obtenerImagenProducto,
  obtenerImagenPrincipalVariante: mocks.obtenerImagenPrincipalVariante,
  obtenerImagenVariantePorPosicion: mocks.obtenerImagenVariantePorPosicion,
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
  cargarImagenProducto,
  cargarImagenPrincipalVariante,
  cargarImagenVariante,
  eliminarImagenProducto,
  eliminarImagenPrincipalVariante,
  listarImagenesAdicionalesVariante,
} from '../../src/modules/admin/admin-images.service.js';
import { ErrorAplicacion } from '../../src/shared/http/app-error.js';

const conexion = {} as never;

function crearArchivo(): Express.Multer.File {
  return {
    buffer: Buffer.from('imagen-prueba'),
    mimetype: 'image/jpeg',
    originalname: 'postre.jpg',
    fieldname: 'imagen',
    encoding: '7bit',
    size: 13,
    destination: '',
    filename: 'postre.jpg',
    path: '',
    stream: {} as never,
  };
}

function imagenGuardada() {
  return {
    url: '/uploads/product/nueva.jpg',
    nombreArchivo: 'product/nueva.jpg',
    mimeType: 'image/jpeg',
    tamanoBytes: 100,
  };
}

function ejecutarTransaccionDirectamente() {
  mocks.ejecutarTransaccion.mockImplementation(
    async (operacion: (conexion: never) => unknown) => operacion(conexion),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  ejecutarTransaccionDirectamente();

  mocks.registrarAuditoria.mockResolvedValue(undefined);
  mocks.actualizarImagenProducto.mockResolvedValue(undefined);
  mocks.actualizarImagenPrincipalVariante.mockResolvedValue(undefined);
  mocks.actualizarImagenVariante.mockResolvedValue(undefined);
  mocks.actualizarPosicionImagenVariante.mockResolvedValue(undefined);
  mocks.contarImagenesVariante.mockResolvedValue(0);
  mocks.guardarImagenVariante.mockResolvedValue('imagen-id');
  mocks.listarImagenesVariante.mockResolvedValue([]);
  mocks.almacenamientoGuardar.mockResolvedValue(imagenGuardada());
  mocks.almacenamientoEliminar.mockResolvedValue(undefined);
  mocks.obtenerReferenciaLocal.mockImplementation((url: string | null) =>
    url?.startsWith('/uploads/') ? url.slice('/uploads/'.length) : null,
  );
});

describe('cargarImagenProducto', () => {
  it('guarda la imagen y limpia la anterior', async () => {
    mocks.obtenerImagenProducto.mockResolvedValue({
      imagenUrl: '/uploads/product/anterior.jpg',
    });

    await expect(
      cargarImagenProducto('admin-1', 'producto-1', crearArchivo()),
    ).resolves.toEqual({ imagenUrl: '/uploads/product/nueva.jpg' });

    expect(mocks.almacenamientoGuardar).toHaveBeenCalledWith(
      'product',
      expect.any(Buffer),
      'image/jpeg',
    );
    expect(mocks.actualizarImagenProducto).toHaveBeenCalledWith(
      conexion,
      'producto-1',
      '/uploads/product/nueva.jpg',
    );
    expect(mocks.almacenamientoEliminar).toHaveBeenCalledWith(
      'product/anterior.jpg',
    );
    expect(mocks.registrarAuditoria).toHaveBeenCalledOnce();
  });

  it('limpia la nueva imagen si el producto no existe', async () => {
    mocks.obtenerImagenProducto.mockResolvedValue(null);

    await expect(
      cargarImagenProducto('admin-1', 'inexistente', crearArchivo()),
    ).rejects.toBeInstanceOf(ErrorAplicacion);

    expect(mocks.almacenamientoEliminar).toHaveBeenCalledWith(
      'product/nueva.jpg',
    );
  });

  it('registra el error si falla la limpieza de la imagen anterior', async () => {
    mocks.obtenerImagenProducto.mockResolvedValue({
      imagenUrl: '/uploads/product/anterior.jpg',
    });
    mocks.almacenamientoEliminar.mockRejectedValue(new Error('fallo de disco'));

    await expect(
      cargarImagenProducto('admin-1', 'producto-1', crearArchivo()),
    ).resolves.toEqual({ imagenUrl: '/uploads/product/nueva.jpg' });

    expect(mocks.registrarError).toHaveBeenCalledWith(
      'admin.product_old_image_cleanup_failed',
      expect.any(Error),
    );
  });
});

describe('eliminarImagenProducto', () => {
  it('rechaza un producto inexistente', async () => {
    mocks.obtenerImagenProducto.mockResolvedValue(null);

    await expect(
      eliminarImagenProducto('admin-1', 'inexistente'),
    ).rejects.toBeInstanceOf(ErrorAplicacion);
  });

  it('rechaza un producto sin imagen', async () => {
    mocks.obtenerImagenProducto.mockResolvedValue({ imagenUrl: null });

    await expect(
      eliminarImagenProducto('admin-1', 'producto-1'),
    ).rejects.toThrow('El producto no tiene una imagen asignada.');
  });

  it('elimina la referencia y limpia la imagen local', async () => {
    mocks.obtenerImagenProducto.mockResolvedValue({
      imagenUrl: '/uploads/product/anterior.jpg',
    });

    await expect(
      eliminarImagenProducto('admin-1', 'producto-1'),
    ).resolves.toBeUndefined();

    expect(mocks.actualizarImagenProducto).toHaveBeenCalledWith(
      conexion,
      'producto-1',
      null,
    );
    expect(mocks.almacenamientoEliminar).toHaveBeenCalledWith(
      'product/anterior.jpg',
    );
    expect(mocks.registrarAuditoria).toHaveBeenCalledOnce();
  });

  it('no intenta borrar una imagen externa', async () => {
    mocks.obtenerImagenProducto.mockResolvedValue({
      imagenUrl: 'https://example.com/postre.jpg',
    });

    await eliminarImagenProducto('admin-1', 'producto-1');

    expect(mocks.almacenamientoEliminar).not.toHaveBeenCalled();
  });
});

describe('cargarImagenPrincipalVariante', () => {
  it('guarda la imagen principal y limpia la anterior', async () => {
    mocks.almacenamientoGuardar.mockResolvedValue({
      ...imagenGuardada(),
      url: '/uploads/variant/nueva.jpg',
      nombreArchivo: 'variant/nueva.jpg',
    });
    mocks.obtenerImagenPrincipalVariante.mockResolvedValue({
      imagenUrl: '/uploads/variant/anterior.jpg',
    });

    await expect(
      cargarImagenPrincipalVariante('admin-1', 'variante-1', crearArchivo()),
    ).resolves.toEqual({ imagenUrl: '/uploads/variant/nueva.jpg' });

    expect(mocks.almacenamientoGuardar).toHaveBeenCalledWith(
      'variant',
      expect.any(Buffer),
      'image/jpeg',
    );
    expect(mocks.actualizarImagenPrincipalVariante).toHaveBeenCalledWith(
      conexion,
      'variante-1',
      '/uploads/variant/nueva.jpg',
    );
    expect(mocks.almacenamientoEliminar).toHaveBeenCalledWith(
      'variant/anterior.jpg',
    );
  });

  it('limpia la imagen nueva si la variante no existe', async () => {
    mocks.obtenerImagenPrincipalVariante.mockResolvedValue(null);

    await expect(
      cargarImagenPrincipalVariante('admin-1', 'inexistente', crearArchivo()),
    ).rejects.toBeInstanceOf(ErrorAplicacion);

    expect(mocks.almacenamientoEliminar).toHaveBeenCalledWith(
      'product/nueva.jpg',
    );
  });
});

describe('eliminarImagenPrincipalVariante', () => {
  it('rechaza una variante inexistente', async () => {
    mocks.obtenerImagenPrincipalVariante.mockResolvedValue(null);

    await expect(
      eliminarImagenPrincipalVariante('admin-1', 'inexistente'),
    ).rejects.toBeInstanceOf(ErrorAplicacion);
  });

  it('rechaza una variante sin imagen principal', async () => {
    mocks.obtenerImagenPrincipalVariante.mockResolvedValue({
      imagenUrl: null,
    });

    await expect(
      eliminarImagenPrincipalVariante('admin-1', 'variante-1'),
    ).rejects.toThrow(
      'La variante no tiene una imagen principal asignada.',
    );
  });

  it('elimina la imagen principal y limpia el archivo local', async () => {
    mocks.obtenerImagenPrincipalVariante.mockResolvedValue({
      imagenUrl: '/uploads/variant/anterior.jpg',
    });

    await expect(
      eliminarImagenPrincipalVariante('admin-1', 'variante-1'),
    ).resolves.toBeUndefined();

    expect(mocks.actualizarImagenPrincipalVariante).toHaveBeenCalledWith(
      conexion,
      'variante-1',
      null,
    );
    expect(mocks.almacenamientoEliminar).toHaveBeenCalledWith(
      'variant/anterior.jpg',
    );
    expect(mocks.registrarAuditoria).toHaveBeenCalledOnce();
  });

  it('no intenta borrar una imagen externa', async () => {
    mocks.obtenerImagenPrincipalVariante.mockResolvedValue({
      imagenUrl: 'https://example.com/variante.jpg',
    });

    await eliminarImagenPrincipalVariante('admin-1', 'variante-1');

    expect(mocks.almacenamientoEliminar).not.toHaveBeenCalled();
  });
});

describe('listarImagenesAdicionalesVariante', () => {
  it('devuelve las imágenes de una variante existente', async () => {
    const imagenes = [
      { id: 'imagen-1', imagenUrl: '/uploads/variant/a.jpg', posicion: 1 },
      { id: 'imagen-2', imagenUrl: '/uploads/variant/b.jpg', posicion: 2 },
    ];
    mocks.obtenerVarianteParaImagen.mockResolvedValue(true);
    mocks.listarImagenesVariante.mockResolvedValue(imagenes);

    await expect(
      listarImagenesAdicionalesVariante('variante-1'),
    ).resolves.toEqual(imagenes);
  });

  it('rechaza una variante inexistente', async () => {
    mocks.obtenerVarianteParaImagen.mockResolvedValue(false);

    await expect(
      listarImagenesAdicionalesVariante('inexistente'),
    ).rejects.toThrow('Variante no encontrada');
  });
});

describe('rama de confirmación de imagen adicional', () => {
  it('lanza error si la transacción no devuelve un resultado de imagen', async () => {
    mocks.ejecutarTransaccion.mockResolvedValue(undefined);

    await expect(
      cargarImagenVariante('admin-1', 'variante-1', crearArchivo(), 1),
    ).rejects.toThrow(
      'No se pudo confirmar el resultado de la imagen.',
    );
  });
});
