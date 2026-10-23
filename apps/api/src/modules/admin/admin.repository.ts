
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';

import { pool } from '../../config/database.js';

export interface CategoriaAdmin {
  id: string;
  nombre: string;
  slug: string;
  activa: boolean;
}

export interface VarianteAdmin {
  id: string;
  nombre: string;
  sku: string;
  precio: string;
  imagenUrl: string | null;
  activa: boolean;
  stockDisponible: number;
  stockFisico: number;
  stockReservado: number;
}

export interface ProductoAdmin {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  activo: boolean;
  categoriaId: string;
  categoria: {
    nombre: string;
    slug: string;
    activa: boolean;
  };
  variantes: VarianteAdmin[];
}

interface FilaProducto extends RowDataPacket {
  producto_id: string;
  producto_nombre: string;
  descripcion: string | null;
  producto_imagen_url: string | null;
  producto_activo: number;
  categoria_id: string;
  categoria_nombre: string;
  categoria_slug: string;
  categoria_activa: number;
  variante_id: string | null;
  variante_nombre: string | null;
  sku: string | null;
  precio: string | null;
  variante_imagen_url: string | null;
  variante_activa: number | null;
  stock_fisico: number | null;
  stock_reservado: number | null;
}

interface FilaCategoria extends RowDataPacket {
  id: string;
  nombre: string;
  slug: string;
  activa: number;
}

interface FilaId extends RowDataPacket {
  id: string;
}

export async function listarCategoriasAdmin(): Promise<CategoriaAdmin[]> {
  const [filas] = await pool.execute<FilaCategoria[]>(
    `SELECT
       CAST(id AS CHAR) AS id,
       name AS nombre,
       slug,
       is_active AS activa
     FROM categories
     ORDER BY name ASC, id ASC`,
  );

  return filas.map((fila) => ({
    id: fila.id,
    nombre: fila.nombre,
    slug: fila.slug,
    activa: Boolean(fila.activa),
  }));
}

export async function listarProductosAdmin(): Promise<ProductoAdmin[]> {
  const [filas] = await pool.execute<FilaProducto[]>(
    `SELECT
       CAST(p.id AS CHAR) AS producto_id,
       p.name AS producto_nombre,
       p.description AS descripcion,
       p.image_url AS producto_imagen_url,
       p.is_active AS producto_activo,
       CAST(c.id AS CHAR) AS categoria_id,
       c.name AS categoria_nombre,
       c.slug AS categoria_slug,
       c.is_active AS categoria_activa,
       CAST(pv.id AS CHAR) AS variante_id,
       pv.name AS variante_nombre,
       pv.sku,
       CAST(pv.price AS CHAR) AS precio,
       pv.image_url AS variante_imagen_url,
       pv.is_active AS variante_activa,
       COALESCE(i.stock_on_hand, 0) AS stock_fisico,
       COALESCE(i.stock_reserved, 0) AS stock_reservado
     FROM products p
     INNER JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_variants pv ON pv.product_id = p.id
     LEFT JOIN inventory i ON i.product_variant_id = pv.id
     ORDER BY p.name ASC, p.id ASC, pv.name ASC, pv.id ASC`,
  );

  const productos = new Map<string, ProductoAdmin>();

  for (const fila of filas) {
    let producto = productos.get(fila.producto_id);

    if (producto === undefined) {
      producto = {
        id: fila.producto_id,
        nombre: fila.producto_nombre,
        descripcion: fila.descripcion,
        imagenUrl: fila.producto_imagen_url,
        activo: Boolean(fila.producto_activo),
        categoriaId: fila.categoria_id,
        categoria: {
          nombre: fila.categoria_nombre,
          slug: fila.categoria_slug,
          activa: Boolean(fila.categoria_activa),
        },
        variantes: [],
      };

      productos.set(fila.producto_id, producto);
    }

    if (
      fila.variante_id === null ||
      fila.variante_nombre === null ||
      fila.sku === null ||
      fila.precio === null
    ) {
      continue;
    }

    const stockFisico = Number(fila.stock_fisico ?? 0);
    const stockReservado = Number(fila.stock_reservado ?? 0);

    producto.variantes.push({
      id: fila.variante_id,
      nombre: fila.variante_nombre,
      sku: fila.sku,
      precio: fila.precio,
      imagenUrl: fila.variante_imagen_url,
      activa: Boolean(fila.variante_activa),
      stockFisico,
      stockReservado,
      stockDisponible: stockFisico - stockReservado,
    });
  }

  return [...productos.values()];
}

export async function existeCategoria(
  conexion: PoolConnection,
  id: string,
): Promise<boolean> {
  const [filas] = await conexion.execute<FilaId[]>(
    'SELECT id FROM categories WHERE id = ? LIMIT 1',
    [id],
  );

  return filas.length > 0;
}

export async function existeProducto(
  conexion: PoolConnection,
  id: string,
): Promise<boolean> {
  const [filas] = await conexion.execute<FilaId[]>(
    'SELECT id FROM products WHERE id = ? LIMIT 1',
    [id],
  );

  return filas.length > 0;
}

export async function existeVariante(
  conexion: PoolConnection,
  id: string,
): Promise<boolean> {
  const [filas] = await conexion.execute<FilaId[]>(
    'SELECT id FROM product_variants WHERE id = ? LIMIT 1',
    [id],
  );

  return filas.length > 0;
}

export async function crearCategoria(
  conexion: PoolConnection,
  datos: { nombre: string; slug: string },
): Promise<string> {
  const [resultado] = await conexion.execute<ResultSetHeader>(
    'INSERT INTO categories (name, slug, is_active) VALUES (?, ?, 1)',
    [datos.nombre, datos.slug],
  );

  return String(resultado.insertId);
}

export async function actualizarCategoria(
  conexion: PoolConnection,
  id: string,
  datos: {
    nombre?: string;
    slug?: string;
    activa?: boolean;
  },
): Promise<void> {
  const campos: string[] = [];
  const valores: (string | number)[] = [];

  if (datos.nombre !== undefined) {
    campos.push('name = ?');
    valores.push(datos.nombre);
  }

  if (datos.slug !== undefined) {
    campos.push('slug = ?');
    valores.push(datos.slug);
  }

  if (datos.activa !== undefined) {
    campos.push('is_active = ?');
    valores.push(datos.activa ? 1 : 0);
  }

  if (campos.length === 0) return;

  valores.push(id);

  await conexion.execute(
    `UPDATE categories SET ${campos.join(', ')} WHERE id = ?`,
    valores,
  );
}

export async function crearProducto(
  conexion: PoolConnection,
  datos: {
    nombre: string;
    descripcion: string | null;
    imagenUrl: string | null;
    categoriaId: string;
    activo: boolean;
  },
): Promise<string> {
  const [resultado] = await conexion.execute<ResultSetHeader>(
    `INSERT INTO products
       (category_id, name, description, image_url, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [
      datos.categoriaId,
      datos.nombre,
      datos.descripcion,
      datos.imagenUrl,
      datos.activo ? 1 : 0,
    ],
  );

  return String(resultado.insertId);
}

export async function actualizarProducto(
  conexion: PoolConnection,
  id: string,
  datos: {
    nombre?: string;
    descripcion?: string | null;
    imagenUrl?: string | null;
    categoriaId?: string;
    activo?: boolean;
  },
): Promise<void> {
  const campos: string[] = [];
  const valores: (string | number | null)[] = [];

  if (datos.nombre !== undefined) {
    campos.push('name = ?');
    valores.push(datos.nombre);
  }

  if (datos.descripcion !== undefined) {
    campos.push('description = ?');
    valores.push(datos.descripcion);
  }

  if (datos.imagenUrl !== undefined) {
    campos.push('image_url = ?');
    valores.push(datos.imagenUrl);
  }

  if (datos.categoriaId !== undefined) {
    campos.push('category_id = ?');
    valores.push(datos.categoriaId);
  }

  if (datos.activo !== undefined) {
    campos.push('is_active = ?');
    valores.push(datos.activo ? 1 : 0);
  }

  if (campos.length === 0) return;

  valores.push(id);

  await conexion.execute(
    `UPDATE products SET ${campos.join(', ')} WHERE id = ?`,
    valores,
  );
}

export async function crearVariante(
  conexion: PoolConnection,
  productoId: string,
  datos: {
    nombre: string;
    sku: string;
    precio: string;
    imagenUrl: string | null;
    activa: boolean;
  },
): Promise<string> {
  const [resultado] = await conexion.execute<ResultSetHeader>(
    `INSERT INTO product_variants
       (product_id, name, sku, image_url, price, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      productoId,
      datos.nombre,
      datos.sku,
      datos.imagenUrl,
      datos.precio,
      datos.activa ? 1 : 0,
    ],
  );

  const varianteId = String(resultado.insertId);

  await conexion.execute(
    `INSERT INTO inventory
       (product_variant_id, stock_on_hand, stock_reserved)
     VALUES (?, 0, 0)`,
    [varianteId],
  );

  return varianteId;
}

export async function actualizarVariante(
  conexion: PoolConnection,
  id: string,
  datos: {
    nombre?: string;
    sku?: string;
    precio?: string;
    imagenUrl?: string | null;
    activa?: boolean;
  },
): Promise<void> {
  const campos: string[] = [];
  const valores: (string | number | null)[] = [];

  if (datos.nombre !== undefined) {
    campos.push('name = ?');
    valores.push(datos.nombre);
  }

  if (datos.sku !== undefined) {
    campos.push('sku = ?');
    valores.push(datos.sku);
  }

  if (datos.precio !== undefined) {
    campos.push('price = ?');
    valores.push(datos.precio);
  }

  if (datos.imagenUrl !== undefined) {
    campos.push('image_url = ?');
    valores.push(datos.imagenUrl);
  }

  if (datos.activa !== undefined) {
    campos.push('is_active = ?');
    valores.push(datos.activa ? 1 : 0);
  }

  if (campos.length === 0) return;

  valores.push(id);

  await conexion.execute(
    `UPDATE product_variants SET ${campos.join(', ')} WHERE id = ?`,
    valores,
  );
}
