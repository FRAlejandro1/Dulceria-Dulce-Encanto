import { z } from 'zod';

import { registrarAuditoria } from '../audit/audit.repository.js';
import { ejecutarTransaccion } from '../../shared/database/transaction.js';
import { ErrorAplicacion } from '../../shared/http/app-error.js';
import {
  actualizarEstadoPedidoAdmin,
  actualizarInventarioPedidoAdmin,
  bloquearPedidoAdmin,
  listarPedidosAdmin,
  obtenerVentasPeriodoAdmin,
  obtenerItemsInventarioPedido,
  obtenerDetallePedidoAdmin,
  obtenerDashboardPedidosAdmin,
  listarClientesPedidosAdmin,
} from './orders-admin.repository.js';

const filtrosSchema = z.object({
  estado: z.enum([
    'PENDIENTE_ENVIO',
    'PENDIENTE_CONFIRMACION',
    'CONFIRMADO',
    'RECHAZADO',
    'CANCELADO',
    'EXPIRADO',
  ]).optional(),
  usuarioId: z.string().regex(/^\d+$/).optional(),
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
}).refine(
  (filtros) =>
    !filtros.desde ||
    !filtros.hasta ||
    filtros.desde <= filtros.hasta,
  { message: 'La fecha inicial no puede superar la fecha final.' },
);

const estadosPermitidos = [
  'CONFIRMADO',
  'RECHAZADO',
  'CANCELADO',
] as const;

export async function consultarPedidosAdmin(entrada: unknown) {
  const validacion = filtrosSchema.safeParse(entrada);

  if (!validacion.success) {
    throw new ErrorAplicacion(400, 'Los filtros de pedidos no son válidos.');
  }

  return listarPedidosAdmin(validacion.data);
}

export async function consultarVentasMensualesAdmin(entrada: unknown) {
  const schema = z.object({
    periodo: z.enum(['dia', 'semana', 'mes', 'anio', 'personalizado']),
    desde: z.iso.date(),
    hasta: z.iso.date(),
  }).refine(
    (filtros) => filtros.desde <= filtros.hasta,
    { message: 'La fecha inicial no puede superar la fecha final.' },
  );

  const validacion = schema.safeParse(entrada);

  if (!validacion.success) {
    throw new ErrorAplicacion(400, 'Los filtros de ventas no son válidos.');
  }

  return obtenerVentasPeriodoAdmin(
    validacion.data.periodo,
    validacion.data.desde,
    validacion.data.hasta,
  );
}
export async function cambiarEstadoPedidoAdmin(
  administradorId: string,
  pedidoId: string,
  estado: string,
) {
  if (!/^\d+$/.test(pedidoId)) {
    throw new ErrorAplicacion(400, 'Identificador de pedido no vÃ¡lido.');
  }

  if (!estadosPermitidos.includes(
    estado as (typeof estadosPermitidos)[number],
  )) {
    throw new ErrorAplicacion(400, 'El estado solicitado no es vÃ¡lido.');
  }

  const estadoNuevo = estado as (typeof estadosPermitidos)[number];

  return ejecutarTransaccion(async (conexion) => {
    const pedido = await bloquearPedidoAdmin(conexion, pedidoId);

    if (!pedido) {
      throw new ErrorAplicacion(404, 'El pedido no existe.');
    }

    if (pedido.estado !== 'PENDIENTE_CONFIRMACION') {
      throw new ErrorAplicacion(
        409,
        'Solo se pueden procesar pedidos pendientes de confirmaciÃ³n.',
      );
    }

    const items = await obtenerItemsInventarioPedido(conexion, pedidoId);

    if (items.length === 0) {
      throw new ErrorAplicacion(
        409,
        'El pedido no tiene artÃ­culos para procesar.',
      );
    }

    for (const item of items) {
      if (
        item.stockReservado < item.cantidad ||
        (estadoNuevo === 'CONFIRMADO' &&
          item.stockFisico < item.cantidad)
      ) {
        throw new ErrorAplicacion(
          409,
          'El inventario reservado no coincide con el pedido.',
        );
      }
    }

    for (const item of items) {
      await actualizarInventarioPedidoAdmin(conexion, {
        varianteId: item.varianteId,
        pedidoId,
        cantidad: item.cantidad,
        stockFisico: item.stockFisico,
        stockReservado: item.stockReservado,
        estado: estadoNuevo,
        administradorId,
      });
    }

    await actualizarEstadoPedidoAdmin(
      conexion,
      pedidoId,
      estadoNuevo,
    );

    await registrarAuditoria(conexion, {
      actorUserId: administradorId,
      action: 'ORDER_STATUS_CHANGED',
      entityType: 'order',
      entityId: pedidoId,
      details: {
        numero: pedido.numero,
        estadoAnterior: pedido.estado,
        estadoNuevo,
      },
    });

    return {
      id: pedidoId,
      numero: pedido.numero,
      estado: estadoNuevo,
    };
  });
}


export async function consultarDetallePedidoAdmin(pedidoId: string) {
  if (!/^\d+$/.test(pedidoId)) {
    throw new ErrorAplicacion(400, 'Identificador de pedido no vÃ¡lido.');
  }

  const pedido = await obtenerDetallePedidoAdmin(pedidoId);

  if (!pedido) {
    throw new ErrorAplicacion(404, 'El pedido no existe.');
  }

  return pedido;
}

const filtrosClientesSchema = z.object({
  estado: z.enum([
    'PENDIENTE_ENVIO',
    'PENDIENTE_CONFIRMACION',
    'CONFIRMADO',
    'RECHAZADO',
    'CANCELADO',
    'EXPIRADO',
  ]).optional(),
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
  busqueda: z.string().trim().max(120).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(50).default(8),
}).refine(
  (filtros) =>
    !filtros.desde ||
    !filtros.hasta ||
    filtros.desde <= filtros.hasta,
  { message: 'La fecha inicial no puede superar la fecha final.' },
);

export async function consultarDashboardPedidosAdmin(entrada: unknown) {
  const schema = z.object({
    periodo: z.enum(['dia', 'semana', 'mes', 'anio', 'personalizado']).default('anio'),
    desde: z.iso.date().optional(),
    hasta: z.iso.date().optional(),
    estado: z.enum([
      'PENDIENTE_ENVIO',
      'PENDIENTE_CONFIRMACION',
      'CONFIRMADO',
      'RECHAZADO',
      'CANCELADO',
      'EXPIRADO',
    ]).optional(),
  }).refine(
    (filtros) => !filtros.desde || !filtros.hasta || filtros.desde <= filtros.hasta,
    { message: 'La fecha inicial no puede superar la fecha final.' },
  ).refine(
    (filtros) => filtros.periodo !== 'personalizado' || (filtros.desde && filtros.hasta),
    { message: 'El período personalizado requiere ambas fechas.' },
  );

  const validacion = schema.safeParse(entrada);

  if (!validacion.success) {
    throw new ErrorAplicacion(400, 'Los filtros del dashboard no son válidos.');
  }

  return obtenerDashboardPedidosAdmin(validacion.data);
}
export async function consultarClientesPedidosAdmin(entrada: unknown) {
  const validacion = filtrosClientesSchema.safeParse(entrada);

  if (!validacion.success) {
    throw new ErrorAplicacion(400, 'Los filtros de clientes no son válidos.');
  }

  return listarClientesPedidosAdmin(validacion.data);
}
