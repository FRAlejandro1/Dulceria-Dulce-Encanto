import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';

export interface ImagenCategoriaAdmin {
  id: string;
  imagenUrl: string | null;
}

export interface ImagenProductoAdmin {
  id: string;
  imagenUrl: string | null;
}

export interface ImagenPrincipalVarianteAdmin {
  id: string;
  imagenUrl: string | null;
}

export interface ImagenVarianteAdmin {
  id: string;
  varianteId: string;
  imagenUrl: string;
  posicion: number;
}

interface FilaImagenCategoria extends RowDataPacket {
  id: string;
  imagenUrl: string | null;
}

interface FilaImagenProducto extends RowDataPacket {
  id: string;
  imagenUrl: string | null;
}

interface FilaImagenPrincipalVariante extends RowDataPacket {
  id: string;
  imagenUrl: string | null;
}

interface FilaImagenVariante extends RowDataPacket {
  id: string;
  varianteId: string;
  imagenUrl: string;
  posicion: number;
}

interface FilaId extends RowDataPacket {
  id: string;
}

export async function obtenerImagenCategoria(
  conexion: PoolConnection,
  categoriaId: string,
  bloquear = false,
): Promise<ImagenCategoriaAdmin | null> {
  const [filas] = await conexion.execute<FilaImagenCategoria[]>(
    `SELECT
       CAST(id AS CHAR) AS id,
       image_url AS imagenUrl
     FROM categories
     WHERE id = ?
     LIMIT 1${bloquear ? ' FOR UPDATE' : ''}`,
    [categoriaId],
  );

  return filas[0] ?? null;
}

export async function actualizarImagenCategoria(
  conexion: PoolConnection,
  categoriaId: string,
  imagenUrl: string | null,
): Promise<void> {
  await conexion.execute(
    'UPDATE categories SET image_url = ? WHERE id = ?',
    [imagenUrl, categoriaId],
  );
}

export async function obtenerImagenProducto(
  conexion: PoolConnection,
  productoId: string,
  bloquear = false,
): Promise<ImagenProductoAdmin | null> {
  const [filas] = await conexion.execute<FilaImagenProducto[]>(
    `SELECT
       CAST(id AS CHAR) AS id,
       image_url AS imagenUrl
     FROM products
     WHERE id = ?
     LIMIT 1${bloquear ? ' FOR UPDATE' : ''}`,
    [productoId],
  );

  return filas[0] ?? null;
}

export async function actualizarImagenProducto(
  conexion: PoolConnection,
  productoId: string,
  imagenUrl: string | null,
): Promise<void> {
  await conexion.execute(
    'UPDATE products SET image_url = ? WHERE id = ?',
    [imagenUrl, productoId],
  );
}

export async function obtenerImagenPrincipalVariante(
  conexion: PoolConnection,
  varianteId: string,
  bloquear = false,
): Promise<ImagenPrincipalVarianteAdmin | null> {
  const [filas] =
    await conexion.execute<FilaImagenPrincipalVariante[]>(
      `SELECT
         CAST(id AS CHAR) AS id,
         image_url AS imagenUrl
       FROM product_variants
       WHERE id = ?
       LIMIT 1${bloquear ? ' FOR UPDATE' : ''}`,
      [varianteId],
    );

  return filas[0] ?? null;
}

export async function actualizarImagenPrincipalVariante(
  conexion: PoolConnection,
  varianteId: string,
  imagenUrl: string | null,
): Promise<void> {
  await conexion.execute(
    'UPDATE product_variants SET image_url = ? WHERE id = ?',
    [imagenUrl, varianteId],
  );
}

export async function obtenerVarianteParaImagen(
  conexion: PoolConnection,
  varianteId: string,
  bloquear = false,
): Promise<boolean> {
  const [filas] = await conexion.execute<FilaId[]>(
    `SELECT id
     FROM product_variants
     WHERE id = ?
     LIMIT 1${bloquear ? ' FOR UPDATE' : ''}`,
    [varianteId],
  );

  return filas.length > 0;
}

export async function listarImagenesVariante(
  conexion: PoolConnection,
  varianteId: string,
): Promise<ImagenVarianteAdmin[]> {
  const [filas] = await conexion.execute<FilaImagenVariante[]>(
    `SELECT
       CAST(id AS CHAR) AS id,
       CAST(product_variant_id AS CHAR) AS varianteId,
       image_url AS imagenUrl,
       position AS posicion
     FROM product_variant_images
     WHERE product_variant_id = ?
     ORDER BY position ASC, id ASC`,
    [varianteId],
  );

  return filas.map((fila) => ({
    id: fila.id,
    varianteId: fila.varianteId,
    imagenUrl: fila.imagenUrl,
    posicion: Number(fila.posicion),
  }));
}

export async function obtenerImagenVariantePorPosicion(
  conexion: PoolConnection,
  varianteId: string,
  posicion: number,
): Promise<ImagenVarianteAdmin | null> {
  const [filas] = await conexion.execute<FilaImagenVariante[]>(
    `SELECT
       CAST(id AS CHAR) AS id,
       CAST(product_variant_id AS CHAR) AS varianteId,
       image_url AS imagenUrl,
       position AS posicion
     FROM product_variant_images
     WHERE product_variant_id = ? AND position = ?
     LIMIT 1
     FOR UPDATE`,
    [varianteId, posicion],
  );

  const fila = filas[0];

  if (fila === undefined) {
    return null;
  }

  return {
    id: fila.id,
    varianteId: fila.varianteId,
    imagenUrl: fila.imagenUrl,
    posicion: Number(fila.posicion),
  };
}

export async function contarImagenesVariante(
  conexion: PoolConnection,
  varianteId: string,
): Promise<number> {
  const [filas] = await conexion.execute<
    (RowDataPacket & { cantidad: number })[]
  >(
    `SELECT COUNT(*) AS cantidad
     FROM product_variant_images
     WHERE product_variant_id = ?`,
    [varianteId],
  );

  return Number(filas[0]?.cantidad ?? 0);
}

export async function guardarImagenVariante(
  conexion: PoolConnection,
  varianteId: string,
  imagenUrl: string,
  posicion: number,
): Promise<string> {
  const [resultado] = await conexion.execute<ResultSetHeader>(
    `INSERT INTO product_variant_images
       (product_variant_id, image_url, position)
     VALUES (?, ?, ?)`,
    [varianteId, imagenUrl, posicion],
  );

  return String(resultado.insertId);
}

export async function actualizarImagenVariante(
  conexion: PoolConnection,
  imagenId: string,
  imagenUrl: string,
): Promise<void> {
  await conexion.execute(
    `UPDATE product_variant_images
     SET image_url = ?
     WHERE id = ?`,
    [imagenUrl, imagenId],
  );
}

export async function actualizarPosicionImagenVariante(
  conexion: PoolConnection,
  imagenId: string,
  posicion: number,
): Promise<void> {
  if (!Number.isInteger(posicion) || posicion < 1 || posicion > 3) {
    throw new Error('La posición de la imagen debe estar entre 1 y 3.');
  }

  await conexion.execute(
    `UPDATE product_variant_images
     SET position = ?
     WHERE id = ?`,
    [posicion, imagenId],
  );
}

export async function eliminarImagenVariante(
  conexion: PoolConnection,
  varianteId: string,
  imagenId: string,
): Promise<ImagenVarianteAdmin | null> {
  const [filas] = await conexion.execute<FilaImagenVariante[]>(
    `SELECT
       CAST(id AS CHAR) AS id,
       CAST(product_variant_id AS CHAR) AS varianteId,
       image_url AS imagenUrl,
       position AS posicion
     FROM product_variant_images
     WHERE id = ? AND product_variant_id = ?
     LIMIT 1
     FOR UPDATE`,
    [imagenId, varianteId],
  );

  const fila = filas[0];

  if (fila === undefined) {
    return null;
  }

  await conexion.execute(
    `DELETE FROM product_variant_images
     WHERE id = ? AND product_variant_id = ?`,
    [imagenId, varianteId],
  );

  return {
    id: fila.id,
    varianteId: fila.varianteId,
    imagenUrl: fila.imagenUrl,
    posicion: Number(fila.posicion),
  };
}
