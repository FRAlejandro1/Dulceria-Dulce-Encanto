import { enviarSolicitudProtegida } from '../../../services/http.service'
import type {
  DatosCrearPedido,
  PedidoCreado,
} from '../types/orders.types'

const RUTA_PEDIDOS = '/api/v1/orders'

function esObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null
}

function validarPedidoCreado(datos: unknown): PedidoCreado {
  if (!esObjeto(datos) || !esObjeto(datos.pedido)) {
    throw new Error('El servidor devolvió una respuesta de pedido inválida.')
  }

  const pedido = datos.pedido

  const idValido =
    typeof pedido.id === 'string' ||
    (typeof pedido.id === 'number' && Number.isFinite(pedido.id))

  if (
    !idValido ||
    typeof pedido.numero !== 'string' ||
    typeof pedido.estado !== 'string' ||
    typeof pedido.subtotal !== 'number' ||
    !Number.isFinite(pedido.subtotal) ||
    typeof pedido.total !== 'number' ||
    !Number.isFinite(pedido.total)
  ) {
    throw new Error('El servidor devolvió datos de pedido inválidos.')
  }

  return {
    id: String(pedido.id),
    numero: pedido.numero,
    estado: pedido.estado,
    subtotal: pedido.subtotal,
    total: pedido.total,
  }
}

export async function crearPedido(
  entrada: DatosCrearPedido,
): Promise<PedidoCreado> {
  const datos = await enviarSolicitudProtegida(RUTA_PEDIDOS, {
    metodo: 'POST',
    cuerpo: entrada,
  })

  return validarPedidoCreado(datos)
}
