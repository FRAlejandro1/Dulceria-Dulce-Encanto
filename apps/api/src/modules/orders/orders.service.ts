import { randomBytes } from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';

import { registrarAuditoria } from '../audit/audit.repository.js';
import { ejecutarTransaccion } from '../../shared/database/transaction.js';
import { ErrorAplicacion } from '../../shared/http/app-error.js';
import type { CrearPedido } from './orders.schemas.js';
import { notificarPedidoCreado } from './orders-notifications.repository.js';
import {
  crearDetallePedido,
  crearRegistroPedido,
  obtenerVariantesParaPedido,
  registrarReserva,
  reservarInventario,
} from './orders.repository.js';

function generarNumeroPedido(): string {
  return `ORD-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

async function auditarPedido(
  conexion: PoolConnection,
  usuarioId: string,
  pedidoId: string,
  numero: string,
  total: number,
): Promise<void> {
  await registrarAuditoria(conexion, {
    actorUserId: usuarioId,
    action: 'ORDER_CREATED',
    entityType: 'order',
    entityId: pedidoId,
    details: { numero, total },
  });
}

export async function crearPedido(usuarioId: string, datos: CrearPedido) {
  return ejecutarTransaccion(async (conexion) => {
    const variantesIds = datos.items.map((item) => String(item.varianteId));
    const variantes = await obtenerVariantesParaPedido(
      conexion,
      variantesIds,
    );

    if (variantes.length !== variantesIds.length) {
      throw new ErrorAplicacion(
        404,
        'Una o más variantes no existen o no tienen inventario.',
      );
    }

    const porId = new Map(
      variantes.map((variante) => [String(variante.varianteId), variante]),
    );

    let subtotalCentavos = 0;

    for (const item of datos.items) {
      const variante = porId.get(String(item.varianteId));

      if (!variante || !variante.activa) {
        throw new ErrorAplicacion(
          409,
          'Una de las variantes seleccionadas no está disponible.',
        );
      }

      const precioCentavos = Math.round(Number(variante.precio) * 100);
      const disponible = variante.stockFisico - variante.stockReservado;

      if (!Number.isSafeInteger(precioCentavos) || precioCentavos < 0) {
        throw new ErrorAplicacion(
          409,
          'El precio de una variante no es válido.',
        );
      }

      if (disponible < item.cantidad) {
        throw new ErrorAplicacion(
          409,
          `Stock insuficiente para ${variante.productoNombre} (${variante.varianteNombre}).`,
        );
      }

      subtotalCentavos += precioCentavos * item.cantidad;

      if (!Number.isSafeInteger(subtotalCentavos)) {
        throw new ErrorAplicacion(
          400,
          'El total del pedido supera el límite permitido.',
        );
      }
    }

    const subtotal = subtotalCentavos / 100;
    const numero = generarNumeroPedido();

    const pedido = await crearRegistroPedido(conexion, {
      numero,
      usuarioId,
      metodoPago: datos.metodoPago,
      subtotal,
      notas: datos.notas?.trim() || null,
    });

    for (const item of datos.items) {
      const variante = porId.get(String(item.varianteId));

      if (!variante) {
        throw new ErrorAplicacion(
          409,
          'Una de las variantes seleccionadas no está disponible.',
        );
      }

      const precio = Math.round(Number(variante.precio) * 100) / 100;

      await crearDetallePedido(conexion, {
        pedidoId: pedido,
        varianteId: item.varianteId,
        productoNombre: variante.productoNombre,
        varianteNombre: variante.varianteNombre,
        sku: variante.sku,
        precio,
        cantidad: item.cantidad,
      });

      await reservarInventario(conexion, item.varianteId, item.cantidad);

      await registrarReserva(conexion, {
        varianteId: item.varianteId,
        pedidoId: pedido,
        cantidad: item.cantidad,
        stockFisico: variante.stockFisico,
        stockReservado: variante.stockReservado,
        usuarioId,
      });
    }

    await auditarPedido(conexion, usuarioId, pedido, numero, subtotal);

    await notificarPedidoCreado(conexion, {
      pedidoId: pedido,
      numero,
      usuarioId,
      total: subtotal,
      items: datos.items.map((item) => {
        const variante = porId.get(String(item.varianteId));

        if (!variante) {
          throw new ErrorAplicacion(
            409,
            'Una de las variantes seleccionadas no está disponible.',
          );
        }

        return {
          productoNombre: variante.productoNombre,
          varianteNombre: variante.varianteNombre,
          sku: variante.sku,
          precio: Math.round(Number(variante.precio) * 100) / 100,
          cantidad: item.cantidad,
        };
      }),
    });

    return {
      id: pedido,
      numero,
      estado: 'PENDIENTE_CONFIRMACION',
      subtotal,
      total: subtotal,
    };
  });
}
