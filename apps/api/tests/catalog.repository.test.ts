import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ejecutarConsulta } = vi.hoisted(() => ({
  ejecutarConsulta: vi.fn(),
}));

vi.mock('../src/config/database.js', () => ({
  pool: {
    execute: ejecutarConsulta,
  },
}));

import { listarProductosCatalogo } from '../src/modules/catalog/catalog.repository.js';

function crearFila(overrides: Record<string, unknown> = {}) {
  return {
    producto_id: '1',
    producto_nombre: 'Alfajores artesanales',
    producto_imagen_url: 'https://example.com/producto.jpg',
    descripcion: 'Rellenos de dulce de leche',
    categoria_nombre: 'Tradicionales',
    categoria_slug: 'tradicionales',
    variante_id: '10',
    variante_nombre: 'Caja de 6',
    variante_imagen_url: 'https://example.com/variante.jpg',
    sku: 'ALF-006',
    precio: '3.50',
    stock_disponible: 8,
    precio_referencia: '3.50',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  ejecutarConsulta.mockResolvedValue([[], []]);
});

describe('listarProductosCatalogo', () => {
  it('devuelve una lista vacía cuando no existen productos', async () => {
    await expect(listarProductosCatalogo()).resolves.toEqual([]);

    expect(ejecutarConsulta).toHaveBeenCalledOnce();
    const [sql, parametros] = ejecutarConsulta.mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(sql).toContain('p.is_active = 1');
    expect(sql).toContain('c.is_active = 1');
    expect(sql).toContain('pv.is_active = 1');
    expect(sql).toContain('LEFT JOIN inventory');
    expect(parametros).toEqual([]);
  });

  it('agrupa las variantes del mismo producto y convierte las existencias a número', async () => {
    ejecutarConsulta.mockResolvedValueOnce([
      [
        crearFila(),
        crearFila({
          variante_id: '11',
          variante_nombre: 'Caja de 12',
          sku: 'ALF-012',
          precio: '6.50',
          stock_disponible: '4',
        }),
      ],
      [],
    ]);

    await expect(listarProductosCatalogo()).resolves.toEqual([
      {
        id: '1',
        nombre: 'Alfajores artesanales',
        descripcion: 'Rellenos de dulce de leche',
        imagenUrl: 'https://example.com/producto.jpg',
        categoria: {
          nombre: 'Tradicionales',
          slug: 'tradicionales',
        },
        variantes: [
          {
            id: '10',
            nombre: 'Caja de 6',
            sku: 'ALF-006',
            precio: '3.50',
            imagenUrl: 'https://example.com/variante.jpg',
            stockDisponible: 8,
          },
          {
            id: '11',
            nombre: 'Caja de 12',
            sku: 'ALF-012',
            precio: '6.50',
            imagenUrl: 'https://example.com/variante.jpg',
            stockDisponible: 4,
          },
        ],
      },
    ]);
  });

  it('agrupa productos diferentes y conserva descripciones nulas', async () => {
    ejecutarConsulta.mockResolvedValueOnce([
      [
        crearFila(),
        crearFila({
          producto_id: '2',
          producto_nombre: 'Galletas',
          descripcion: null,
          categoria_nombre: 'Galletas',
          categoria_slug: 'galletas',
          variante_id: '20',
          variante_nombre: 'Unidad',
          sku: 'GAL-001',
          precio: '2.75',
          stock_disponible: 0,
        }),
      ],
      [],
    ]);

    const productos = await listarProductosCatalogo();

    expect(productos).toHaveLength(2);
    expect(productos[1]).toMatchObject({
      id: '2',
      nombre: 'Galletas',
      descripcion: null,
      variantes: [{ id: '20', stockDisponible: 0 }],
    });
  });

  it('aplica el filtro de búsqueda mediante parámetros SQL', async () => {
    await listarProductosCatalogo({ busqueda: 'alfajor' });

    const [sql, parametros] = ejecutarConsulta.mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(sql).toContain('p.name LIKE ?');
    expect(parametros).toEqual(['%alfajor%']);
  });

  it('aplica el filtro de categoría mediante parámetros SQL', async () => {
    await listarProductosCatalogo({ categoria: 'galletas' });

    const [sql, parametros] = ejecutarConsulta.mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(sql).toContain('c.slug = ?');
    expect(parametros).toEqual(['galletas']);
  });

  it('combina los filtros de búsqueda y categoría', async () => {
    await listarProductosCatalogo({
      busqueda: 'galleta',
      categoria: 'galletas',
    });

    const [sql, parametros] = ejecutarConsulta.mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(sql).toContain('p.name LIKE ?');
    expect(sql).toContain('c.slug = ?');
    expect(parametros).toEqual(['%galleta%', 'galletas']);
  });

  it('ordena ascendentemente por precio de referencia', async () => {
    await listarProductosCatalogo({ ordenarPrecio: 'asc' });

    const [sql] = ejecutarConsulta.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('ORDER BY precio_referencia ASC, p.name ASC');
  });

  it('ordena descendentemente por precio de referencia', async () => {
    await listarProductosCatalogo({ ordenarPrecio: 'desc' });

    const [sql] = ejecutarConsulta.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('ORDER BY precio_referencia DESC, p.name ASC');
  });

  it('conserva las imágenes nulas de productos y variantes', async () => {
    ejecutarConsulta.mockResolvedValueOnce([
      [
        crearFila({
          producto_imagen_url: null,
          variante_imagen_url: null,
        }),
      ],
      [],
    ]);

    const productos = await listarProductosCatalogo();

    expect(productos[0]).toMatchObject({
      imagenUrl: null,
      variantes: [{ imagenUrl: null }],
    });
  });
  it('propaga los errores de consulta', async () => {
    const error = new Error('Fallo de consulta');
    ejecutarConsulta.mockRejectedValueOnce(error);

    await expect(listarProductosCatalogo()).rejects.toBe(error);
  });
});


