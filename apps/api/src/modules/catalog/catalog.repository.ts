import type { RowDataPacket } from 'mysql2/promise';

import { pool } from '../../config/database.js';

export interface FiltrosCatalogo {
  busqueda?: string;
  categoria?: string;
  ordenarPrecio?: 'asc' | 'desc';
}

interface FilaCatalogo extends RowDataPacket {
  producto_id: string;
  producto_nombre: string;
  descripcion: string | null;
  categoria_nombre: string;
  categoria_slug: string;
  variante_id: string;
  variante_nombre: string;
  sku: string;
  precio: string;
  stock_disponible: number;
}

export interface VarianteCatalogo {
  id: string;
  nombre: string;
  sku: string;
  precio: string;
  stockDisponible: number;
}

export interface ProductoCatalogo {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: {
    nombre: string;
    slug: string;
  };
  variantes: VarianteCatalogo[];
}

export async function listarProductosCatalogo(
  filtros: FiltrosCatalogo = {},
): Promise<ProductoCatalogo[]> {
  const condiciones = [
    'p.is_active = 1',
    'c.is_active = 1',
    'pv.is_active = 1',
  ];
  const parametros: (string | number)[] = [];

  if (filtros.busqueda !== undefined) {
    condiciones.push('p.name LIKE ?');
    parametros.push(`%${filtros.busqueda}%`);
  }

  if (filtros.categoria !== undefined) {
    condiciones.push('c.slug = ?');
    parametros.push(filtros.categoria);
  }

  const ordenPrecio =
    filtros.ordenarPrecio === undefined
      ? ''
      : `ORDER BY precio_referencia ${filtros.ordenarPrecio === 'desc' ? 'DESC' : 'ASC'}, p.name ASC`;

  const [filas] = await pool.execute<FilaCatalogo[]>(
    `SELECT
      CAST(p.id AS CHAR) AS producto_id,
      p.name AS producto_nombre,
      p.description AS descripcion,
      c.name AS categoria_nombre,
      c.slug AS categoria_slug,
      CAST(pv.id AS CHAR) AS variante_id,
      pv.name AS variante_nombre,
      pv.sku AS sku,
      CAST(pv.price AS CHAR) AS precio,
      COALESCE(i.stock_on_hand - i.stock_reserved, 0) AS stock_disponible,
      MIN(pv.price) OVER (PARTITION BY p.id) AS precio_referencia
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    INNER JOIN product_variants pv ON pv.product_id = p.id
    LEFT JOIN inventory i ON i.product_variant_id = pv.id
    WHERE ${condiciones.join(' AND ')}
    ${ordenPrecio}`,
    parametros,
  );

  const productos = new Map<string, ProductoCatalogo>();

  for (const fila of filas) {
    let producto = productos.get(fila.producto_id);

    if (producto === undefined) {
      producto = {
        id: fila.producto_id,
        nombre: fila.producto_nombre,
        descripcion: fila.descripcion,
        categoria: {
          nombre: fila.categoria_nombre,
          slug: fila.categoria_slug,
        },
        variantes: [],
      };

      productos.set(fila.producto_id, producto);
    }

    producto.variantes.push({
      id: fila.variante_id,
      nombre: fila.variante_nombre,
      sku: fila.sku,
      precio: fila.precio,
      stockDisponible: Number(fila.stock_disponible),
    });
  }

  return [...productos.values()];
}
