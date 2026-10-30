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
export type PeriodoVentasAdmin = 'dia' | 'semana' | 'mes' | 'anio' | 'personalizado'

export async function obtenerVentasPeriodoAdmin(
  periodo: PeriodoVentasAdmin,
  desde: string,
  hasta: string,
) {
  const agrupaciones: Record<PeriodoVentasAdmin, string> = {
    dia: "DATE_FORMAT(created_at, '%H:00')",
    semana: "DATE_FORMAT(created_at, '%Y-%m-%d')",
    mes: "DAY(created_at)",
    anio: "MONTH(created_at)",
    personalizado: "DATE_FORMAT(created_at, '%Y-%m-%d')",
  }

  const agrupacion = agrupaciones[periodo]

  const [filas] = await pool.execute<RowDataPacket[]>(
    `SELECT
       ${agrupacion} AS etiqueta,
       status AS estado,
       COUNT(*) AS cantidadPedidos,
       COALESCE(SUM(total), 0) AS ventas
     FROM orders
     WHERE created_at >= CONCAT(?, ' 00:00:00')
       AND created_at < DATE_ADD(?, INTERVAL 1 DAY)
     GROUP BY etiqueta, status
     ORDER BY etiqueta, status`,
    [desde, hasta],
  )

  return filas
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
        ? 'Pedido confirmado por administraciÃƒÆ’Ã‚Â³n'
        : `Reserva liberada por pedido ${datos.estado.toLowerCase()}`,
      datos.administradorId,
    ],
  );
}


interface DetallePedidoAdminFila extends RowDataPacket {
  id: string;
  numero: string;
  usuarioId: string;
  cliente: string;
  correo: string;
  estado: string;
  metodoPago: string;
  subtotal: string;
  total: string;
  notas: string | null;
  creadoEn: Date;
}

interface ItemPedidoAdminFila extends RowDataPacket {
  varianteId: string;
  producto: string;
  variante: string;
  sku: string;
  precioUnitario: string;
  cantidad: number;
  subtotal: string;
}

export async function obtenerDetallePedidoAdmin(pedidoId: string) {
  const [pedidos] = await pool.execute<DetallePedidoAdminFila[]>(
    `SELECT
       o.id,
       o.order_number AS numero,
       o.user_id AS usuarioId,
       u.name AS cliente,
       u.email AS correo,
       o.status AS estado,
       o.payment_method AS metodoPago,
       o.subtotal,
       o.total,
       o.notes AS notas,
       o.created_at AS creadoEn
     FROM orders o
     INNER JOIN users u ON u.id = o.user_id
     WHERE o.id = ?
     LIMIT 1`,
    [pedidoId],
  );

  const pedido = pedidos[0];

  if (!pedido) {
    return undefined;
  }

  const [items] = await pool.execute<ItemPedidoAdminFila[]>(
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
interface FiltrosClientesPedidosAdmin {
  estado?: string;
  desde?: string;
  hasta?: string;
  busqueda?: string;
  pagina: number;
  limite: number;
}

interface ClientePedidosFila extends RowDataPacket {
  id: string;
  nombre: string;
  correo: string;
  cantidadPedidos: number;
}

interface PedidoClienteFila extends RowDataPacket {
  id: string;
  numero: string;
  usuarioId: string;
  cliente: string;
  correo: string;
  estado: string;
  metodoPago: string;
  total: string;
  creadoEn: Date;
  cantidadItems: number;
}

export async function obtenerDashboardPedidosAdmin(filtros: {
  periodo: PeriodoVentasAdmin;
  desde?: string;
  hasta?: string;
  estado?: string;
}) {
  const [filas] = await pool.execute<RowDataPacket[]>(
    `SELECT
       COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) AS pedidosHoy,
       COALESCE(SUM(CASE
         WHEN DATE(created_at) = CURDATE() AND status = 'CONFIRMADO'
         THEN total ELSE 0
       END), 0) AS ventasHoy,

       COUNT(CASE
         WHEN YEAR(created_at) = YEAR(CURDATE())
           AND MONTH(created_at) = MONTH(CURDATE())
         THEN 1
       END) AS pedidosMes,
       COALESCE(SUM(CASE
         WHEN YEAR(created_at) = YEAR(CURDATE())
           AND MONTH(created_at) = MONTH(CURDATE())
           AND status = 'CONFIRMADO'
         THEN total ELSE 0
       END), 0) AS ventasMes,

       COUNT(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) THEN 1 END) AS pedidosAnio,
       COALESCE(SUM(CASE
         WHEN YEAR(created_at) = YEAR(CURDATE())
           AND status = 'CONFIRMADO'
         THEN total ELSE 0
       END), 0) AS ventasAnio,

       COUNT(CASE WHEN status = 'PENDIENTE_CONFIRMACION' THEN 1 END) AS pendientesConfirmacion
     FROM orders`,
  );

  const [estados] = await pool.execute<RowDataPacket[]>(
    `SELECT
       status AS estado,
       COUNT(*) AS cantidad,
       COALESCE(SUM(total), 0) AS importe
     FROM orders
     WHERE (? IS NULL OR created_at >= ?)
       AND (? IS NULL OR created_at < DATE_ADD(?, INTERVAL 1 DAY))
       AND (? IS NULL OR status = ?)
     GROUP BY status
     ORDER BY status`,
    [
      filtros.desde ?? null,
      filtros.desde ?? null,
      filtros.hasta ?? null,
      filtros.hasta ?? null,
      filtros.estado ?? null,
      filtros.estado ?? null,
    ],
  );

  return {
    ...filas[0],
    estados,
  };
}
export async function listarClientesPedidosAdmin(
  filtros: FiltrosClientesPedidosAdmin,
) {
  const condiciones: string[] = [];
  const valores: (string | number)[] = [];

  if (filtros.estado) {
    condiciones.push('o.status = ?');
    valores.push(filtros.estado);
  }

  if (filtros.desde) {
    condiciones.push('o.created_at >= ?');
    valores.push(`${filtros.desde} 00:00:00`);
  }

  if (filtros.hasta) {
    condiciones.push('o.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
    valores.push(filtros.hasta);
  }

  if (filtros.busqueda) {
    condiciones.push('(u.name LIKE ? OR u.email LIKE ?)');
    const busqueda = `%${filtros.busqueda.trim()}%`;
    valores.push(busqueda, busqueda);
  }

  const where = condiciones.length
    ? `WHERE ${condiciones.join(' AND ')}`
    : '';

  const desplazamiento = (filtros.pagina - 1) * filtros.limite;

  const [clientesPagina] = await pool.execute<ClientePedidosFila[]>(
    `SELECT
       u.id,
       u.name AS nombre,
       u.email AS correo,
       COUNT(o.id) AS cantidadPedidos,
       MAX(o.created_at) AS ultimoPedido
     FROM orders o
     INNER JOIN users u ON u.id = o.user_id
     ${where}
     GROUP BY u.id, u.name, u.email
     ORDER BY ultimoPedido DESC, u.id DESC
     LIMIT ? OFFSET ?`,
    [...valores, filtros.limite, desplazamiento],
  );

  const [conteo] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT o.user_id) AS totalClientes
     FROM orders o
     INNER JOIN users u ON u.id = o.user_id
     ${where}`,
    valores,
  );

  if (clientesPagina.length === 0) {
    return {
      clientes: [],
      totalClientes: Number(conteo[0]?.totalClientes ?? 0),
      pagina: filtros.pagina,
      limite: filtros.limite,
    };
  }

  const ids = clientesPagina.map((cliente) => String(cliente.id));
  const marcadores = ids.map(() => '?').join(', ');

  const [pedidos] = await pool.execute<PedidoClienteFila[]>(
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
     WHERE ${[...condiciones, `o.user_id IN (${marcadores})`].join(' AND ')}
     GROUP BY o.id
     ORDER BY o.created_at DESC, o.id DESC`,
    [...valores, ...ids],
  );

  const pedidosPorCliente = new Map<string, PedidoClienteFila[]>();

  for (const pedido of pedidos) {
    const usuarioId = String(pedido.usuarioId);
    const agrupados = pedidosPorCliente.get(usuarioId) ?? [];
    agrupados.push(pedido);
    pedidosPorCliente.set(usuarioId, agrupados);
  }

  return {
    clientes: clientesPagina.map((cliente) => ({
      ...cliente,
      id: String(cliente.id),
      cantidadPedidos: Number(cliente.cantidadPedidos),
      pedidos: pedidosPorCliente.get(String(cliente.id)) ?? [],
    })),
    totalClientes: Number(conteo[0]?.totalClientes ?? 0),
    pagina: filtros.pagina,
    limite: filtros.limite,
  };
}
