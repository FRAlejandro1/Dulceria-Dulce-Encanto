import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';

import { pool } from '../../config/database.js';

export interface FiltrosPedidosAdmin {
  estado?: string;
  usuarioId?: string;
  desde?: string;
  hasta?: string;
  pagina: number;
  limite: number;
}

interface PedidoBloqueado extends RowDataPacket {
  id: string;
  numero: string;
  usuarioId: string;
  estado: string;
}

interface ItemInventario extends RowDataPacket {
  varianteId: string;
  cantidad: number;
  stockFisico: number;
  stockReservado: number;
}

export async function listarPedidosAdmin(
  filtros: FiltrosPedidosAdmin,
) {
  const condiciones: string[] = [];
  const valores: (string | number)[] = [];

  if (filtros.estado) {
    condiciones.push('o.status = ?');
    valores.push(filtros.estado);
  }

  if (filtros.usuarioId) {
    condiciones.push('o.user_id = ?');
    valores.push(filtros.usuarioId);
  }

  if (filtros.desde) {
    condiciones.push('o.created_at >= ?');
    valores.push(`${filtros.desde} 00:00:00`);
  }

  if (filtros.hasta) {
    condiciones.push('o.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
    valores.push(filtros.hasta);
  }

  const where = condiciones.length
    ? `WHERE ${condiciones.join(' AND ')}`
    : '';

  const desplazamiento = (filtros.pagina - 1) * filtros.limite;

  const [pedidos] = await pool.execute<RowDataPacket[]>(
    `SELECT
       o.id,
       o.order_number AS numero,
       o.user_id AS usuarioId,
       u.name AS cliente,
       u.email AS correo,
       o.status AS estado,
       o.payment_method AS metodoPago,
       o.total,
       o.created_at AS creadoEn,
       COUNT(oi.id) AS cantidadItems
     FROM orders o
     INNER JOIN users u ON u.id = o.user_id
     LEFT JOIN order_items oi ON oi.order_id = o.id
     ${where}
     GROUP BY o.id
     ORDER BY o.created_at DESC, o.id DESC
     LIMIT ? OFFSET ?`,
    [...valores, filtros.limite, desplazamiento],
  );

  const [conteo] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM orders o
     ${where}`,
    valores,
  );

  return {
    pedidos,
    total: Number(conteo[0]?.total ?? 0),
    pagina: filtros.pagina,
    limite: filtros.limite,
  };
}

export async function obtenerVentasMensualesAdmin(anio: number) {
  const [filas] = await pool.execute<RowDataPacket[]>(
    `SELECT
       MONTH(created_at) AS mes,
       COUNT(*) AS cantidadPedidos,
       COALESCE(SUM(total), 0) AS ventas
     FROM orders
     WHERE YEAR(created_at) = ?
       AND status = 'CONFIRMADO'
     GROUP BY MONTH(created_at)
     ORDER BY mes`,
    [anio],
  );

  return filas;
}

export async function bloquearPedidoAdmin(
  conexion: PoolConnection,
  pedidoId: string,
): Promise<PedidoBloqueado | undefined> {
  const [filas] = await conexion.execute<PedidoBloqueado[]>(
    `SELECT
       id,
       order_number AS numero,
       user_id AS usuarioId,
       status AS estado
     FROM orders
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [pedidoId],
  );

  return filas[0];
}

export async function obtenerItemsInventarioPedido(
  conexion: PoolConnection,
  pedidoId: string,
): Promise<ItemInventario[]> {
  const [filas] = await conexion.execute<ItemInventario[]>(
    `SELECT
       oi.product_variant_id AS varianteId,
       oi.quantity AS cantidad,
       i.stock_on_hand AS stockFisico,
       i.stock_reserved AS stockReservado
     FROM order_items oi
     INNER JOIN inventory i
       ON i.product_variant_id = oi.product_variant_id
     WHERE oi.order_id = ?
     ORDER BY oi.product_variant_id
     FOR UPDATE`,
    [pedidoId],
  );

  return filas;
}

export async function actualizarEstadoPedidoAdmin(
  conexion: PoolConnection,
  pedidoId: string,
  estado: 'CONFIRMADO' | 'RECHAZADO' | 'CANCELADO',
): Promise<void> {
  await conexion.execute(
    `UPDATE orders
     SET status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [estado, pedidoId],
  );
}

export async function actualizarInventarioPedidoAdmin(
  conexion: PoolConnection,
  datos: {
    varianteId: string;
    pedidoId: string;
    cantidad: number;
    stockFisico: number;
    stockReservado: number;
    estado: 'CONFIRMADO' | 'RECHAZADO' | 'CANCELADO';
    administradorId: string;
  },
): Promise<void> {
  const confirmado = datos.estado === 'CONFIRMADO';

  const stockFisicoNuevo = confirmado
    ? datos.stockFisico - datos.cantidad
    : datos.stockFisico;

  const stockReservadoNuevo = datos.stockReservado - datos.cantidad;

  if (
    stockReservadoNuevo < 0 ||
    stockFisicoNuevo < 0
  ) {
    throw new Error(
      `Inventario inconsistente para la variante ${datos.varianteId}.`,
    );
  }

  const [resultado] = await conexion.execute<ResultSetHeader>(
    `UPDATE inventory
     SET stock_on_hand = ?, stock_reserved = ?
     WHERE product_variant_id = ?
       AND stock_on_hand = ?
       AND stock_reserved = ?`,
    [
      stockFisicoNuevo,
      stockReservadoNuevo,
      datos.varianteId,
      datos.stockFisico,
      datos.stockReservado,
    ],
  );

  if (resultado.affectedRows !== 1) {
    throw new Error(
      `No se pudo actualizar el inventario de la variante ${datos.varianteId}.`,
    );
  }

  await conexion.execute(
    `INSERT INTO inventory_movements (
       product_variant_id,
       order_id,
       movement_type,
       quantity,
       stock_on_hand_before,
       stock_on_hand_after,
       stock_reserved_before,
       stock_reserved_after,
       reason,
       created_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.varianteId,
      datos.pedidoId,
      confirmado ? 'SALE' : 'RELEASE',
      datos.cantidad,
      datos.stockFisico,
      stockFisicoNuevo,
      datos.stockReservado,
      stockReservadoNuevo,
      confirmado
        ? 'Pedido confirmado por administración'
        : `Reserva liberada por pedido ${datos.estado.toLowerCase()}`,
      datos.administradorId,
    ],
  );
}
