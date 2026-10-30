import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';

import type { CrearPedido } from './orders.schemas.js';

interface VariantePedido extends RowDataPacket {
  varianteId: string;
  productoNombre: string;
  varianteNombre: string;
  sku: string;
  precio: string;
  activa: number;
  stockFisico: number;
  stockReservado: number;
}

export async function obtenerVariantesParaPedido(
  conexion: PoolConnection,
  variantesIds: string[],
): Promise<VariantePedido[]> {
  const marcadores = variantesIds.map(() => '?').join(', ');

  const [filas] = await conexion.execute<VariantePedido[]>(
    `SELECT
       pv.id AS varianteId,
       p.name AS productoNombre,
       pv.name AS varianteNombre,
       pv.sku,
       pv.price AS precio,
       pv.is_active AS activa,
       i.stock_on_hand AS stockFisico,
       i.stock_reserved AS stockReservado
     FROM product_variants pv
     INNER JOIN products p ON p.id = pv.product_id
     INNER JOIN inventory i ON i.product_variant_id = pv.id
     WHERE pv.id IN (${marcadores})
     ORDER BY pv.id
     FOR UPDATE`,
    variantesIds,
  );

  return filas;
}

export async function crearRegistroPedido(
  conexion: PoolConnection,
  datos: {
    numero: string;
    usuarioId: string;
    metodoPago: CrearPedido['metodoPago'];
    subtotal: number;
    notas: string | null;
  },
): Promise<string> {
  const [resultado] = await conexion.execute<ResultSetHeader>(
    `INSERT INTO orders (
       order_number,
       user_id,
       status,
       payment_method,
       subtotal,
       total,
       notes
     ) VALUES (?, ?, 'PENDIENTE_CONFIRMACION', ?, ?, ?, ?)`,
    [
      datos.numero,
      datos.usuarioId,
      datos.metodoPago,
      datos.subtotal,
      datos.subtotal,
      datos.notas,
    ],
  );

  return String(resultado.insertId);
}

export async function crearDetallePedido(
  conexion: PoolConnection,
  datos: {
    pedidoId: string;
    varianteId: string;
    productoNombre: string;
    varianteNombre: string;
    sku: string;
    precio: number;
    cantidad: number;
  },
): Promise<void> {
  await conexion.execute(
    `INSERT INTO order_items (
       order_id,
       product_variant_id,
       product_name_snapshot,
       variant_name_snapshot,
       sku_snapshot,
       unit_price,
       quantity,
       line_total
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.pedidoId,
      datos.varianteId,
      datos.productoNombre,
      datos.varianteNombre,
      datos.sku,
      datos.precio,
      datos.cantidad,
      datos.precio * datos.cantidad,
    ],
  );
}

export async function reservarInventario(
  conexion: PoolConnection,
  varianteId: string,
  cantidad: number,
): Promise<void> {
  await conexion.execute(
    `UPDATE inventory
     SET stock_reserved = stock_reserved + ?
     WHERE product_variant_id = ?`,
    [cantidad, varianteId],
  );
}

export async function registrarReserva(
  conexion: PoolConnection,
  datos: {
    varianteId: string;
    pedidoId: string;
    cantidad: number;
    stockFisico: number;
    stockReservado: number;
    usuarioId: string;
  },
): Promise<void> {
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
     ) VALUES (?, ?, 'RESERVATION', ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.varianteId,
      datos.pedidoId,
      datos.cantidad,
      datos.stockFisico,
      datos.stockFisico,
      datos.stockReservado,
      datos.stockReservado + datos.cantidad,
      'Reserva por creación de pedido',
      datos.usuarioId,
    ],
  );
}
