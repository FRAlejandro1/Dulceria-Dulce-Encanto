
import type { PoolConnection } from 'mysql2/promise';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  actualizarImagenCategoria,
  actualizarImagenProducto,
  actualizarImagenPrincipalVariante,
  actualizarImagenVariante,
  actualizarPosicionImagenVariante,
  contarImagenesVariante,
  eliminarImagenVariante,
  guardarImagenVariante,
  listarImagenesVariante,
  obtenerImagenCategoria,
  obtenerImagenProducto,
  obtenerImagenPrincipalVariante,
  obtenerImagenVariantePorPosicion,
  obtenerVarianteParaImagen,
} from '../../src/modules/admin/admin-images.repository.js';

const execute = vi.fn();
const conexion = { execute } as unknown as PoolConnection;

const filaImagen = {
  id: '10',
  varianteId: '20',
  imagenUrl: '/uploads/variant/imagen.jpg',
  posicion: '2',
};

beforeEach(() => {
  vi.clearAllMocks();
  execute.mockResolvedValue([[], []]);
});

describe('imágenes de categorías', () => {
  it('obtiene una categoría con bloqueo', async () => {
    const fila = { id: '1', imagenUrl: '/uploads/category/a.jpg' };
    execute.mockResolvedValueOnce([[fila], []]);

    await expect(obtenerImagenCategoria(conexion, '1', true)).resolves.toEqual(fila);
    expect(execute.mock.calls[0]?.[0]).toContain('FOR UPDATE');
    expect(execute.mock.calls[0]?.[1]).toEqual(['1']);
  });

  it('devuelve null si la categoría no existe', async () => {
    await expect(obtenerImagenCategoria(conexion, '404')).resolves.toBeNull();
    expect(execute.mock.calls[0]?.[0]).not.toContain('FOR UPDATE');
  });

  it('actualiza la imagen de una categoría, incluida la eliminación', async () => {
    await actualizarImagenCategoria(conexion, '1', '/uploads/category/a.jpg');
    expect(execute).toHaveBeenCalledWith(
      'UPDATE categories SET image_url = ? WHERE id = ?',
      ['/uploads/category/a.jpg', '1'],
    );

    execute.mockClear();
    await actualizarImagenCategoria(conexion, '1', null);
    expect(execute).toHaveBeenCalledWith(
      'UPDATE categories SET image_url = ? WHERE id = ?',
      [null, '1'],
    );
  });
});

describe('imágenes de productos', () => {
  it('obtiene un producto con bloqueo', async () => {
    const fila = { id: '2', imagenUrl: '/uploads/product/a.jpg' };
    execute.mockResolvedValueOnce([[fila], []]);

    await expect(obtenerImagenProducto(conexion, '2', true)).resolves.toEqual(fila);
    expect(execute.mock.calls[0]?.[0]).toContain('FOR UPDATE');
    expect(execute.mock.calls[0]?.[1]).toEqual(['2']);
  });

  it('devuelve null si el producto no existe', async () => {
    await expect(obtenerImagenProducto(conexion, '404')).resolves.toBeNull();
    expect(execute.mock.calls[0]?.[0]).not.toContain('FOR UPDATE');
  });

  it('actualiza o elimina la imagen de un producto', async () => {
    await actualizarImagenProducto(conexion, '2', '/uploads/product/a.jpg');
    expect(execute).toHaveBeenCalledWith(
      'UPDATE products SET image_url = ? WHERE id = ?',
      ['/uploads/product/a.jpg', '2'],
    );

    execute.mockClear();
    await actualizarImagenProducto(conexion, '2', null);
    expect(execute).toHaveBeenCalledWith(
      'UPDATE products SET image_url = ? WHERE id = ?',
      [null, '2'],
    );
  });
});

describe('imagen principal de variante', () => {
  it('obtiene una variante con bloqueo', async () => {
    const fila = { id: '3', imagenUrl: null };
    execute.mockResolvedValueOnce([[fila], []]);

    await expect(
      obtenerImagenPrincipalVariante(conexion, '3', true),
    ).resolves.toEqual(fila);

    expect(execute.mock.calls[0]?.[0]).toContain('FOR UPDATE');
    expect(execute.mock.calls[0]?.[1]).toEqual(['3']);
  });

  it('devuelve null si la variante no existe', async () => {
    await expect(
      obtenerImagenPrincipalVariante(conexion, '404'),
    ).resolves.toBeNull();

    expect(execute.mock.calls[0]?.[0]).not.toContain('FOR UPDATE');
  });

  it('actualiza o elimina la imagen principal', async () => {
    await actualizarImagenPrincipalVariante(
      conexion,
      '3',
      '/uploads/variant/a.jpg',
    );

    expect(execute).toHaveBeenCalledWith(
      'UPDATE product_variants SET image_url = ? WHERE id = ?',
      ['/uploads/variant/a.jpg', '3'],
    );

    execute.mockClear();
    await actualizarImagenPrincipalVariante(conexion, '3', null);

    expect(execute).toHaveBeenCalledWith(
      'UPDATE product_variants SET image_url = ? WHERE id = ?',
      [null, '3'],
    );
  });

  it('detecta si la variante existe y si no existe', async () => {
    execute.mockResolvedValueOnce([[{ id: '3' }], []]);

    await expect(
      obtenerVarianteParaImagen(conexion, '3', true),
    ).resolves.toBe(true);
    expect(execute.mock.calls[0]?.[0]).toContain('FOR UPDATE');

    execute.mockResolvedValueOnce([[], []]);

    await expect(
      obtenerVarianteParaImagen(conexion, '404'),
    ).resolves.toBe(false);
    expect(execute.mock.calls[1]?.[0]).not.toContain('FOR UPDATE');
  });
});

describe('imágenes adicionales de variante', () => {
  it('lista imágenes y convierte las posiciones a números', async () => {
    execute.mockResolvedValueOnce([[
      { ...filaImagen, posicion: '1' },
      { ...filaImagen, id: '11', posicion: '3' },
    ], []]);

    await expect(listarImagenesVariante(conexion, '20')).resolves.toEqual([
      { ...filaImagen, posicion: 1 },
      { ...filaImagen, id: '11', posicion: 3 },
    ]);

    expect(execute.mock.calls[0]?.[0]).toContain(
      'ORDER BY position ASC, id ASC',
    );
    expect(execute.mock.calls[0]?.[1]).toEqual(['20']);
  });

  it('devuelve una lista vacía si no hay imágenes', async () => {
    await expect(listarImagenesVariante(conexion, '20')).resolves.toEqual([]);
  });

  it('obtiene una imagen por posición y convierte su posición a número', async () => {
    execute.mockResolvedValueOnce([[filaImagen], []]);

    await expect(
      obtenerImagenVariantePorPosicion(conexion, '20', 2),
    ).resolves.toEqual({ ...filaImagen, posicion: 2 });

    expect(execute.mock.calls[0]?.[0]).toContain('FOR UPDATE');
    expect(execute.mock.calls[0]?.[1]).toEqual(['20', 2]);
  });

  it('devuelve null si no hay imagen en la posición solicitada', async () => {
    await expect(
      obtenerImagenVariantePorPosicion(conexion, '20', 3),
    ).resolves.toBeNull();
  });

  it('cuenta imágenes y convierte el resultado a número', async () => {
    execute.mockResolvedValueOnce([[{ cantidad: '2' }], []]);

    await expect(contarImagenesVariante(conexion, '20')).resolves.toBe(2);
    expect(execute.mock.calls[0]?.[1]).toEqual(['20']);
  });

  it('devuelve cero si el resultado de conteo está vacío', async () => {
    execute.mockResolvedValueOnce([[], []]);

    await expect(contarImagenesVariante(conexion, '20')).resolves.toBe(0);
  });

  it('inserta una imagen y devuelve el identificador como texto', async () => {
    execute.mockResolvedValueOnce([{ insertId: 42 }, []]);

    await expect(
      guardarImagenVariante(
        conexion,
        '20',
        '/uploads/variant/a.jpg',
        1,
      ),
    ).resolves.toBe('42');

    expect(execute.mock.calls[0]?.[0]).toContain(
      'INSERT INTO product_variant_images',
    );
    expect(execute.mock.calls[0]?.[1]).toEqual([
      '20',
      '/uploads/variant/a.jpg',
      1,
    ]);
  });

  it('actualiza la URL de una imagen adicional', async () => {
    await actualizarImagenVariante(
      conexion,
      '10',
      '/uploads/variant/nueva.jpg',
    );

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE product_variant_images'),
      ['/uploads/variant/nueva.jpg', '10'],
    );
  });

  it.each([0, 4, 1.5, Number.NaN])(
    'rechaza la posición inválida %s',
    async (posicion) => {
      await expect(
        actualizarPosicionImagenVariante(conexion, '10', posicion),
      ).rejects.toThrow(
        'La posición de la imagen debe estar entre 1 y 3.',
      );

      expect(execute).not.toHaveBeenCalled();
    },
  );

  it.each([1, 2, 3])(
    'actualiza correctamente la posición %s',
    async (posicion) => {
      await actualizarPosicionImagenVariante(conexion, '10', posicion);

      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining('SET position = ?'),
        [posicion, '10'],
      );
    },
  );

  it('elimina una imagen existente y devuelve sus datos', async () => {
    execute.mockResolvedValueOnce([[filaImagen], []]);
    execute.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    await expect(
      eliminarImagenVariante(conexion, '20', '10'),
    ).resolves.toEqual({ ...filaImagen, posicion: 2 });

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[0]?.[0]).toContain('FOR UPDATE');
    expect(execute.mock.calls[0]?.[1]).toEqual(['10', '20']);
    expect(execute.mock.calls[1]?.[0]).toContain('DELETE FROM product_variant_images');
    expect(execute.mock.calls[1]?.[1]).toEqual(['10', '20']);
  });

  it('no ejecuta DELETE si la imagen no existe', async () => {
    await expect(
      eliminarImagenVariante(conexion, '20', '404'),
    ).resolves.toBeNull();

    expect(execute).toHaveBeenCalledTimes(1);
  });
});
