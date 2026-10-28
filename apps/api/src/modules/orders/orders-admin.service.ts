import { z } from 'zod';

import { registrarAuditoria } from '../audit/audit.repository.js';
import { ejecutarTransaccion } from '../../shared/database/transaction.js';
import { ErrorAplicacion } from '../../shared/http/app-error.js';
import {
  actualizarEstadoPedidoAdmin,
  actualizarInventarioPedidoAdmin,
  bloquearPedidoAdmin,
  listarPedidosAdmin,
  obtenerItemsInventarioPedido,
  obtenerVentasMensualesAdmin,
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
    anio: z.coerce.number().int().min(2000).max(2100),
  });

  const validacion = schema.safeParse(entrada);

  if (!validacion.success) {
    throw new ErrorAplicacion(400, 'El año solicitado no es válido.');
  }

  return obtenerVentasMensualesAdmin(validacion.data.anio);
}

export async function cambiarEstadoPedidoAdmin(
  administradorId: string,
  pedidoId: string,
  estado: string,
) {
  if (!/^\d+$/.test(pedidoId)) {
    throw new ErrorAplicacion(400, 'Identificador de pedido no válido.');
  }

  if (!estadosPermitidos.includes(
    estado as (typeof estadosPermitidos)[number],
  )) {
    throw new ErrorAplicacion(400, 'El estado solicitado no es válido.');
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
        'Solo se pueden procesar pedidos pendientes de confirmación.',
      );
    }

    const items = await obtenerItemsInventarioPedido(conexion, pedidoId);

    if (items.length === 0) {
      throw new ErrorAplicacion(
        409,
        'El pedido no tiene artículos para procesar.',
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
