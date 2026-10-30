import type { Pool, RowDataPacket } from 'mysql2/promise';

import { pool } from '../../config/database.js';

type Ejecutor = Pool;

interface PedidoFila extends RowDataPacket {
  id: string;
  numero: string;
  estado: string;
  metodoPago: string;
  total: string;
  creadoEn: Date;
  cantidadItems: number;
}

export async function listarPedidosUsuario(
  usuarioId: string,
  conexion: Ejecutor = pool,
): Promise<PedidoFila[]> {
  const [filas] = await conexion.execute<PedidoFila[]>(
    `SELECT
       o.id,
       o.order_number AS numero,
       o.status AS estado,
       o.payment_method AS metodoPago,
       o.total,
       o.created_at AS creadoEn,
       COUNT(oi.id) AS cantidadItems
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.user_id = ?
     GROUP BY o.id
     ORDER BY o.created_at DESC, o.id DESC`,
    [usuarioId],
  );

  return filas;
}
