import type { PoolConnection } from 'mysql2/promise';

export async function notificarPedidoCreado(
  conexion: PoolConnection,
  datos: {
    pedidoId: string;
    numero: string;
    usuarioId: string;
    total: number;
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
      `El pedido ${datos.numero} fue registrado por un total de ${datos.total.toFixed(2)}.`,
    ],
  );
}
