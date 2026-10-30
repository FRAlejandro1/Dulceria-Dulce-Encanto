import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executePool } = vi.hoisted(() => ({
  executePool: vi.fn(),
}));

vi.mock('../../src/config/database.js', () => ({
  pool: {
    execute: executePool,
  },
}));

import type { PoolConnection } from 'mysql2/promise';

import {
  actualizarCategoria,
  actualizarProducto,
  actualizarVariante,
  actualizarStockFisico,
  obtenerInventarioParaAjuste,
  registrarMovimientoAjuste,
  crearCategoria,
  crearProducto,
  crearVariante,
  existeCategoria,
  existeProducto,
  existeVariante,
  listarCategoriasAdmin,
  listarProductosAdmin,
} from '../../src/modules/admin/admin.repository.js';

function crearConexion(
  execute: ReturnType<typeof vi.fn> = vi.fn(),
): PoolConnection {
  return { execute } as unknown as PoolConnection;
}

function filasResultado(filas: unknown[]) {
  return [filas, []] as never;
}

function resultadoInsercion(insertId: number) {
  return [{ insertId }, []] as never;
}

function filaProducto(
  sobreescrituras: Record<string, unknown> = {},
) {
  return {
    producto_id: '10',
    producto_nombre: 'Caja de alfajores',
    descripcion: 'Alfajores artesanales',
    producto_imagen_url: 'https://example.com/producto.jpg',
    producto_activo: 1,
    categoria_id: '2',
    categoria_nombre: 'Tradicionales',
    categoria_slug: 'tradicionales',
    categoria_activa: 1,
    variante_id: '20',
    variante_nombre: 'Caja pequeña',
    sku: 'CAJA-PEQ',
    precio: '2.50',
    variante_imagen_url: 'https://example.com/variante.jpg',
    variante_activa: 1,
    stock_fisico: 10,
    stock_reservado: 3,
    ...sobreescrituras,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listarCategoriasAdmin', () => {
  it('mapea las categorías y convierte el estado a booleano', async () => {
    executePool.mockResolvedValueOnce(
      filasResultado([
        {
          id: '1',
          nombre: 'Tradicionales',
          slug: 'tradicionales',
          activa: 1,
        },
        {
          id: '2',
          nombre: 'Temporada',
          slug: 'temporada',
          activa: 0,
        },
      ]),
    );

    await expect(listarCategoriasAdmin()).resolves.toEqual([
      {
        id: '1',
        nombre: 'Tradicionales',
        slug: 'tradicionales',
        activa: true,
      },
      {
        id: '2',
        nombre: 'Temporada',
        slug: 'temporada',
        activa: false,
      },
    ]);

    expect(executePool).toHaveBeenCalledOnce();
    expect(executePool.mock.calls[0][0]).toContain('FROM categories');
    expect(executePool.mock.calls[0][0]).toContain(
      'ORDER BY name ASC, id ASC',
    );
  });

  it('devuelve un arreglo vacío cuando no existen categorías', async () => {
    executePool.mockResolvedValueOnce(filasResultado([]));

    await expect(listarCategoriasAdmin()).resolves.toEqual([]);
  });

  it('propaga los errores de consulta', async () => {
    const error = new Error('Error de consulta');
    executePool.mockRejectedValueOnce(error);

    await expect(listarCategoriasAdmin()).rejects.toBe(error);
  });
});

describe('listarProductosAdmin', () => {
  it('agrupa variantes del mismo producto y calcula el stock disponible', async () => {
    executePool.mockResolvedValueOnce(
      filasResultado([
        filaProducto(),
        filaProducto({
          variante_id: '21',
          variante_nombre: 'Caja grande',
          sku: 'CAJA-GRA',
          precio: '5.00',
          variante_activa: 0,
          stock_fisico: 20,
          stock_reservado: 4,
        }),
        filaProducto({
          producto_id: '11',
          producto_nombre: 'Brownies',
          descripcion: null,
          producto_imagen_url: null,
          producto_activo: 0,
          categoria_activa: 0,
          variante_id: '22',
          variante_nombre: 'Unidad',
          sku: 'BROWNIE-UNI',
          precio: '1.25',
          variante_imagen_url: null,
          variante_activa: 0,
          stock_fisico: 0,
          stock_reservado: 0,
        }),
      ]),
    );

    await expect(listarProductosAdmin()).resolves.toEqual([
      {
        id: '10',
        nombre: 'Caja de alfajores',
        descripcion: 'Alfajores artesanales',
        imagenUrl: 'https://example.com/producto.jpg',
        activo: true,
        categoriaId: '2',
        categoria: {
          nombre: 'Tradicionales',
          slug: 'tradicionales',
          activa: true,
        },
        variantes: [
          {
            id: '20',
            nombre: 'Caja pequeña',
            sku: 'CAJA-PEQ',
            precio: '2.50',
            imagenUrl: 'https://example.com/variante.jpg',
            activa: true,
            stockFisico: 10,
            stockReservado: 3,
            stockDisponible: 7,
          },
          {
            id: '21',
            nombre: 'Caja grande',
            sku: 'CAJA-GRA',
            precio: '5.00',
            imagenUrl: 'https://example.com/variante.jpg',
            activa: false,
            stockFisico: 20,
            stockReservado: 4,
            stockDisponible: 16,
          },
        ],
      },
      {
        id: '11',
        nombre: 'Brownies',
        descripcion: null,
        imagenUrl: null,
        activo: false,
        categoriaId: '2',
        categoria: {
          nombre: 'Tradicionales',
          slug: 'tradicionales',
          activa: false,
        },
        variantes: [
          {
            id: '22',
            nombre: 'Unidad',
            sku: 'BROWNIE-UNI',
            precio: '1.25',
            imagenUrl: null,
            activa: false,
            stockFisico: 0,
            stockReservado: 0,
            stockDisponible: 0,
          },
        ],
      },
    ]);

    expect(executePool).toHaveBeenCalledOnce();
    expect(executePool.mock.calls[0][0]).toContain(
      'LEFT JOIN product_variants',
    );
    expect(executePool.mock.calls[0][0]).toContain('LEFT JOIN inventory');
  });

  it('devuelve una lista vacía si no hay productos', async () => {
    executePool.mockResolvedValueOnce(filasResultado([]));

    await expect(listarProductosAdmin()).resolves.toEqual([]);
  });

  it('conserva un producto sin variantes', async () => {
    executePool.mockResolvedValueOnce(
      filasResultado([
        filaProducto({
          variante_id: null,
          variante_nombre: null,
          sku: null,
          precio: null,
          variante_imagen_url: null,
          variante_activa: null,
          stock_fisico: null,
          stock_reservado: null,
        }),
      ]),
    );

    const resultado = await listarProductosAdmin();

    expect(resultado).toHaveLength(1);
    expect(resultado[0].variantes).toEqual([]);
    expect(resultado[0].id).toBe('10');
  });

  it.each([
    ['nombre de variante nulo', { variante_nombre: null }],
    ['SKU nulo', { sku: null }],
    ['precio nulo', { precio: null }],
  ])('omite la variante si tiene %s', async (_caso, datos) => {
    executePool.mockResolvedValueOnce(
      filasResultado([filaProducto(datos)]),
    );

    const resultado = await listarProductosAdmin();

    expect(resultado).toHaveLength(1);
    expect(resultado[0].variantes).toEqual([]);
  });

  it('usa cero cuando los valores de inventario son nulos', async () => {
    executePool.mockResolvedValueOnce(
      filasResultado([
        filaProducto({
          stock_fisico: null,
          stock_reservado: null,
        }),
      ]),
    );

    const resultado = await listarProductosAdmin();

    expect(resultado[0].variantes[0]).toMatchObject({
      stockFisico: 0,
      stockReservado: 0,
      stockDisponible: 0,
    });
  });

  it('convierte los valores de inventario numéricos representados como texto', async () => {
    executePool.mockResolvedValueOnce(
      filasResultado([
        filaProducto({
          stock_fisico: '12',
          stock_reservado: '5',
        }),
      ]),
    );

    const resultado = await listarProductosAdmin();

    expect(resultado[0].variantes[0]).toMatchObject({
      stockFisico: 12,
      stockReservado: 5,
      stockDisponible: 7,
    });
  });

  it('propaga los errores de consulta', async () => {
    const error = new Error('Error de consulta');
    executePool.mockRejectedValueOnce(error);

    await expect(listarProductosAdmin()).rejects.toBe(error);
  });
});

describe('comprobaciones de existencia', () => {
  it.each([
    ['categoría', existeCategoria, 'categories'],
    ['producto', existeProducto, 'products'],
    ['variante', existeVariante, 'product_variants'],
  ])(
    'detecta una entidad existente: %s',
    async (_nombre, comprobar, tabla) => {
      const conexion = crearConexion(
        vi.fn().mockResolvedValue(filasResultado([{ id: '7' }])),
      );

      await expect(comprobar(conexion, '7')).resolves.toBe(true);

      expect(conexion.execute).toHaveBeenCalledWith(
        `SELECT id FROM ${tabla} WHERE id = ? LIMIT 1`,
        ['7'],
      );
    },
  );

  it.each([
    ['categoría', existeCategoria],
    ['producto', existeProducto],
    ['variante', existeVariante],
  ])(
    'devuelve false si no existe la entidad: %s',
    async (_nombre, comprobar) => {
      const conexion = crearConexion(
        vi.fn().mockResolvedValue(filasResultado([])),
      );

      await expect(comprobar(conexion, '999')).resolves.toBe(false);
    },
  );
});

describe('crearCategoria', () => {
  it('inserta la categoría y devuelve el identificador como texto', async () => {
    const execute = vi.fn().mockResolvedValue(resultadoInsercion(15));
    const conexion = crearConexion(execute);

    await expect(
      crearCategoria(conexion, {
        nombre: 'Tradicionales',
        slug: 'tradicionales',
      }),
    ).resolves.toBe('15');

    expect(execute).toHaveBeenCalledWith(
      'INSERT INTO categories (name, slug, is_active) VALUES (?, ?, 1)',
      ['Tradicionales', 'tradicionales'],
    );
  });
});

describe('actualizarCategoria', () => {
  it('actualiza todos los campos y convierte activa a número', async () => {
    const execute = vi.fn().mockResolvedValue([{}, []]);
    const conexion = crearConexion(execute);

    await actualizarCategoria(conexion, '5', {
      nombre: 'Especiales',
      slug: 'especiales',
      activa: false,
    });

    expect(execute).toHaveBeenCalledWith(
      'UPDATE categories SET name = ?, slug = ?, is_active = ? WHERE id = ?',
      ['Especiales', 'especiales', 0, '5'],
    );
  });

  it('permite activar una categoría', async () => {
    const execute = vi.fn().mockResolvedValue([{}, []]);
    const conexion = crearConexion(execute);

    await actualizarCategoria(conexion, '5', { activa: true });

    expect(execute).toHaveBeenCalledWith(
      'UPDATE categories SET is_active = ? WHERE id = ?',
      [1, '5'],
    );
  });

  it('no ejecuta SQL si no hay campos para actualizar', async () => {
    const execute = vi.fn();
    const conexion = crearConexion(execute);

    await expect(
      actualizarCategoria(conexion, '5', {}),
    ).resolves.toBeUndefined();

    expect(execute).not.toHaveBeenCalled();
  });
});

describe('crearProducto', () => {
  it('inserta el producto y convierte el identificador a texto', async () => {
    const execute = vi.fn().mockResolvedValue(resultadoInsercion(25));
    const conexion = crearConexion(execute);

    await expect(
      crearProducto(conexion, {
        nombre: 'Brownies',
        descripcion: null,
        imagenUrl: null,
        categoriaId: '3',
        activo: false,
      }),
    ).resolves.toBe('25');

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO products'),
      ['3', 'Brownies', null, null, 0],
    );
  });

  it('inserta un producto activo', async () => {
    const execute = vi.fn().mockResolvedValue(resultadoInsercion(26));
    const conexion = crearConexion(execute);

    await crearProducto(conexion, {
      nombre: 'Alfajores',
      descripcion: 'Producto artesanal',
      imagenUrl: 'https://example.com/alfajores.jpg',
      categoriaId: '3',
      activo: true,
    });

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO products'),
      [
        '3',
        'Alfajores',
        'Producto artesanal',
        'https://example.com/alfajores.jpg',
        1,
      ],
    );
  });
});

describe('actualizarProducto', () => {
  it('actualiza todos los campos permitidos', async () => {
    const execute = vi.fn().mockResolvedValue([{}, []]);
    const conexion = crearConexion(execute);

    await actualizarProducto(conexion, '8', {
      nombre: 'Producto actualizado',
      descripcion: null,
      imagenUrl: null,
      categoriaId: '4',
      activo: true,
    });

    expect(execute).toHaveBeenCalledWith(
      'UPDATE products SET name = ?, description = ?, image_url = ?, category_id = ?, is_active = ? WHERE id = ?',
      ['Producto actualizado', null, null, '4', 1, '8'],
    );
  });

  it('actualiza únicamente el nombre', async () => {
    const execute = vi.fn().mockResolvedValue([{}, []]);
    const conexion = crearConexion(execute);

    await actualizarProducto(conexion, '8', {
      nombre: 'Nuevo nombre',
    });

    expect(execute).toHaveBeenCalledWith(
      'UPDATE products SET name = ? WHERE id = ?',
      ['Nuevo nombre', '8'],
    );
  });

  it('permite desactivar un producto', async () => {
    const execute = vi.fn().mockResolvedValue([{}, []]);
    const conexion = crearConexion(execute);

    await actualizarProducto(conexion, '8', { activo: false });

    expect(execute).toHaveBeenCalledWith(
      'UPDATE products SET is_active = ? WHERE id = ?',
      [0, '8'],
    );
  });

  it('no ejecuta SQL si no hay campos para actualizar', async () => {
    const execute = vi.fn();
    const conexion = crearConexion(execute);

    await expect(
      actualizarProducto(conexion, '8', {}),
    ).resolves.toBeUndefined();

    expect(execute).not.toHaveBeenCalled();
  });
});

describe('crearVariante', () => {
  it('crea la variante y su registro de inventario inicial en cero', async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(resultadoInsercion(35))
      .mockResolvedValueOnce([{}, []]);
    const conexion = crearConexion(execute);

    await expect(
      crearVariante(conexion, '12', {
        nombre: 'Caja pequeña',
        sku: 'CAJA-PEQ',
        precio: '2.50',
        imagenUrl: null,
        activa: true,
      }),
    ).resolves.toBe('35');

    expect(execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO product_variants'),
      ['12', 'Caja pequeña', 'CAJA-PEQ', null, '2.50', 1],
    );

    expect(execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO inventory'),
      ['35'],
    );

    expect(execute.mock.calls[1][0]).toContain('VALUES (?, 0, 0)');
  });

  it('crea una variante inactiva', async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(resultadoInsercion(36))
      .mockResolvedValueOnce([{}, []]);
    const conexion = crearConexion(execute);

    await crearVariante(conexion, '12', {
      nombre: 'Caja grande',
      sku: 'CAJA-GRA',
      precio: '5.00',
      imagenUrl: 'https://example.com/caja.jpg',
      activa: false,
    });

    expect(execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO product_variants'),
      [
        '12',
        'Caja grande',
        'CAJA-GRA',
        'https://example.com/caja.jpg',
        '5.00',
        0,
      ],
    );
  });

  it('propaga el error si falla la inserción de la variante', async () => {
    const error = new Error('No se pudo crear la variante');
    const execute = vi.fn().mockRejectedValueOnce(error);
    const conexion = crearConexion(execute);

    await expect(
      crearVariante(conexion, '12', {
        nombre: 'Caja',
        sku: 'CAJA',
        precio: '2.50',
        imagenUrl: null,
        activa: true,
      }),
    ).rejects.toBe(error);

    expect(execute).toHaveBeenCalledOnce();
  });

  it('propaga el error si falla la creación del inventario inicial', async () => {
    const error = new Error('No se pudo crear el inventario');
    const execute = vi.fn()
      .mockResolvedValueOnce(resultadoInsercion(37))
      .mockRejectedValueOnce(error);
    const conexion = crearConexion(execute);

    await expect(
      crearVariante(conexion, '12', {
        nombre: 'Caja',
        sku: 'CAJA',
        precio: '2.50',
        imagenUrl: null,
        activa: true,
      }),
    ).rejects.toBe(error);

    expect(execute).toHaveBeenCalledTimes(2);
  });
});

describe('actualizarVariante', () => {
  it('actualiza todos los campos permitidos', async () => {
    const execute = vi.fn().mockResolvedValue([{}, []]);
    const conexion = crearConexion(execute);

    await actualizarVariante(conexion, '35', {
      nombre: 'Caja mediana',
      sku: 'CAJA-MED',
      precio: '3.50',
      imagenUrl: null,
      activa: false,
    });

    expect(execute).toHaveBeenCalledWith(
      'UPDATE product_variants SET name = ?, sku = ?, price = ?, image_url = ?, is_active = ? WHERE id = ?',
      ['Caja mediana', 'CAJA-MED', '3.50', null, 0, '35'],
    );
  });

  it('actualiza únicamente el precio', async () => {
    const execute = vi.fn().mockResolvedValue([{}, []]);
    const conexion = crearConexion(execute);

    await actualizarVariante(conexion, '35', { precio: '4.25' });

    expect(execute).toHaveBeenCalledWith(
      'UPDATE product_variants SET price = ? WHERE id = ?',
      ['4.25', '35'],
    );
  });

  it('permite activar una variante', async () => {
    const execute = vi.fn().mockResolvedValue([{}, []]);
    const conexion = crearConexion(execute);

    await actualizarVariante(conexion, '35', { activa: true });

    expect(execute).toHaveBeenCalledWith(
      'UPDATE product_variants SET is_active = ? WHERE id = ?',
      [1, '35'],
    );
  });

  it('no ejecuta SQL si no hay campos para actualizar', async () => {
    const execute = vi.fn();
    const conexion = crearConexion(execute);

    await expect(
      actualizarVariante(conexion, '35', {}),
    ).resolves.toBeUndefined();

    expect(execute).not.toHaveBeenCalled();
  });
});


describe('obtenerInventarioParaAjuste', () => {
  it('devuelve el stock físico y reservado de la variante', async () => {
    const execute = vi.fn().mockResolvedValue(
      filasResultado([
        { stock_fisico: '15', stock_reservado: '4' },
      ]),
    );
    const conexion = crearConexion(execute);

    await expect(
      obtenerInventarioParaAjuste(conexion, '35'),
    ).resolves.toEqual({
      stockFisico: 15,
      stockReservado: 4,
    });

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('FOR UPDATE'),
      ['35'],
    );
  });

  it('devuelve null cuando la variante no tiene inventario', async () => {
    const execute = vi.fn().mockResolvedValue(filasResultado([]));
    const conexion = crearConexion(execute);

    await expect(
      obtenerInventarioParaAjuste(conexion, '35'),
    ).resolves.toBeNull();

    expect(execute).toHaveBeenCalledTimes(1);
  });
});

describe('actualizarStockFisico', () => {
  it('actualiza el stock físico de la variante', async () => {
    const execute = vi.fn().mockResolvedValue([{}, []]);
    const conexion = crearConexion(execute);

    await expect(
      actualizarStockFisico(conexion, '35', 20),
    ).resolves.toBeUndefined();

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE inventory'),
      [20, '35'],
    );
  });
});

describe('registrarMovimientoAjuste', () => {
  it('registra el movimiento de ajuste con los datos del inventario', async () => {
    const execute = vi.fn().mockResolvedValue([{}, []]);
    const conexion = crearConexion(execute);

    await expect(
      registrarMovimientoAjuste(conexion, {
        varianteId: '35',
        cantidad: 5,
        stockFisicoAnterior: 10,
        stockFisicoNuevo: 15,
        stockReservado: 3,
        motivo: 'Corrección de inventario',
        actorId: '20',
      }),
    ).resolves.toBeUndefined();

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO inventory_movements'),
      ['35', 5, 10, 15, 3, 3, 'Corrección de inventario', '20'],
    );
  });
});