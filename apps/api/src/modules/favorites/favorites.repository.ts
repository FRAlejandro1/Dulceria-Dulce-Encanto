import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import { pool } from '../../config/database.js';

export async function listarFavoritos(usuarioId: string): Promise<string[]> {
  const [filas] = await pool.execute<RowDataPacket[]>(
    `SELECT f.product_id AS productoId
     FROM favorites f
     INNER JOIN products p ON p.id = f.product_id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC, f.id DESC`,
    [usuarioId],
  );

  return filas.map((fila) => String(fila.productoId));
}

export async function agregarFavorito(
  usuarioId: string,
  productoId: string,
): Promise<boolean> {
  const [productos] = await pool.execute<RowDataPacket[]>(
    `SELECT id
     FROM products
     WHERE id = ? AND is_active = 1
     LIMIT 1`,
    [productoId],
  );

  if (productos.length === 0) {
    return false;
  }

  await pool.execute<ResultSetHeader>(
    `INSERT IGNORE INTO favorites (user_id, product_id)
     VALUES (?, ?)`,
    [usuarioId, productoId],
  );

  return true;
}

export async function eliminarFavorito(
  usuarioId: string,
  productoId: string,
): Promise<void> {
  await pool.execute<ResultSetHeader>(
    `DELETE FROM favorites
     WHERE user_id = ? AND product_id = ?`,
    [usuarioId, productoId],
  );
}
