import type { RowDataPacket } from 'mysql2/promise';

import { pool } from '../../config/database.js';
import { ErrorAplicacion } from '../../shared/http/app-error.js';
import { listarPedidosUsuario } from './orders-history.repository.js';

interface DetallePedidoFila extends RowDataPacket {
  varianteId: string;
  producto: string;
  variante: string;
  sku: string;
  precioUnitario: string;
  cantidad: number;
  subtotal: string;
}

export async function obtenerHistorialPedidos(usuarioId: string) {
  return listarPedidosUsuario(usuarioId);
}

export async function obtenerDetallePedido(
  usuarioId: string,
  pedidoId: string,
) {
  const [pedidos] = await pool.execute<RowDataPacket[]>(
    `SELECT
       id,
       order_number AS numero,
       status AS estado,
       payment_method AS metodoPago,
       subtotal,
       total,
       notes AS notas,
       created_at AS creadoEn
     FROM orders
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    [pedidoId, usuarioId],
  );

  const pedido = pedidos[0];

  if (!pedido) {
    throw new ErrorAplicacion(404, 'El pedido no existe.');
  }

  const [items] = await pool.execute<DetallePedidoFila[]>(
    `SELECT
       product_variant_id AS varianteId,
       product_name_snapshot AS producto,
       variant_name_snapshot AS variante,
       sku_snapshot AS sku,
       unit_price AS precioUnitario,
       quantity AS cantidad,
       line_total AS subtotal
     FROM order_items
     WHERE order_id = ?
     ORDER BY id`,
    [pedidoId],
  );

  return { ...pedido, items };
}
