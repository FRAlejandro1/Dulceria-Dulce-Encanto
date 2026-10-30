import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import { pool } from '../../config/database.js';

export async function listarNotificacionesUsuario(usuarioId: string) {
  const [filas] = await pool.execute<RowDataPacket[]>(
    `SELECT
       id,
       order_id AS pedidoId,
       title AS titulo,
       message AS mensaje,
       read_at AS leidaEn,
       created_at AS creadaEn
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 100`,
    [usuarioId],
  );

  return filas;
}

export async function marcarNotificacionLeida(
  usuarioId: string,
  notificacionId: string,
): Promise<boolean> {
  const [resultado] = await pool.execute<ResultSetHeader>(
    `UPDATE notifications
     SET read_at = CURRENT_TIMESTAMP(3)
     WHERE id = ? AND user_id = ? AND read_at IS NULL`,
    [notificacionId, usuarioId],
  );

  if (resultado.affectedRows > 0) return true;

  const [filas] = await pool.execute<RowDataPacket[]>(
    `SELECT id
     FROM notifications
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    [notificacionId, usuarioId],
  );

  return filas.length > 0;
}
