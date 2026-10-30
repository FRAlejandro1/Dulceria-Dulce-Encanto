import type { PoolConnection } from 'mysql2/promise';

type ItemNotificacionPedido = {
  productoNombre: string;
  varianteNombre: string;
  sku: string;
  precio: number;
  cantidad: number;
};

export async function notificarPedidoCreado(
  conexion: PoolConnection,
  datos: {
    pedidoId: string;
    numero: string;
    usuarioId: string;
    total: number;
    items: ItemNotificacionPedido[];
  },
): Promise<void> {
  const evento = `order:${datos.pedidoId}:created`;

  await conexion.execute(
    `INSERT IGNORE INTO notifications (
       user_id,
       order_id,
       event_key,
       title,
       message
     ) VALUES (?, ?, ?, ?, ?)`,
    [
      datos.usuarioId,
      datos.pedidoId,
      evento,
      'Pedido recibido',
      `Tu pedido ${datos.numero} fue recibido y está pendiente de confirmación.`,
    ],
  );

  const detalle = datos.items
    .map(
      (item) =>
        `- ${item.productoNombre} / ${item.varianteNombre} ` +
        `(SKU: ${item.sku}) x ${item.cantidad} — ` +
        `$${(item.precio * item.cantidad).toFixed(2)}`,
    )
    .join('\n');

  const mensajeAdmin = [
    `Nuevo pedido: ${datos.numero}`,
    '',
    'Detalle del pedido:',
    detalle,
    '',
    `Total: $${datos.total.toFixed(2)}`,
    'Estado: Pendiente de confirmación',
  ].join('\n');

  await conexion.execute(
    `INSERT IGNORE INTO notifications (
       user_id,
       order_id,
       event_key,
       title,
       message
     )
     SELECT
       id,
       ?,
       ?,
       ?,
       ?
     FROM users
     WHERE role = 'ADMIN'
       AND is_active = 1`,
    [
      datos.pedidoId,
      evento,
      'Nuevo pedido recibido',
      mensajeAdmin,
    ],
  );
}
