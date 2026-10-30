import {
  comprobarRespuesta,
  enviarSolicitudProtegida,
} from '../../../services/http.service'
import type {
  EstadoPedidoAdmin,
  FiltrosPedidosAdmin,
  FiltrosClientesPedidosAdmin,
  DashboardPedidosAdmin,
  RespuestaClientesPedidosAdmin,
  RespuestaCambioEstadoPedidoAdmin,
  RespuestaDetallePedidoAdmin,
  RespuestaPedidosAdmin,
  PeriodoVentasAdmin,
  VentaPeriodoAdmin,
} from '../types/orders.types'

async function obtenerDatos(ruta: string): Promise<unknown> {
  const respuesta = await fetch(ruta, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  return comprobarRespuesta(respuesta)
}

export async function obtenerPedidosAdmin(
  filtros: FiltrosPedidosAdmin = {},
): Promise<RespuestaPedidosAdmin> {
  const parametros = new URLSearchParams()

  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== '') {
      parametros.set(clave, String(valor))
    }
  })

  const consulta = parametros.toString()
  const ruta = `/api/v1/admin/orders${consulta ? `?${consulta}` : ''}`
  const datos = await obtenerDatos(ruta)

  if (
    !datos ||
    typeof datos !== 'object' ||
    !('pedidos' in datos) ||
    !Array.isArray(datos.pedidos)
  ) {
    throw new Error('La respuesta de pedidos no es vÃ¡lida.')
  }

  return datos as RespuestaPedidosAdmin
}

export async function obtenerDetallePedidoAdmin(
  pedidoId: string,
): Promise<RespuestaDetallePedidoAdmin> {
  const datos = await obtenerDatos(
    `/api/v1/admin/orders/${encodeURIComponent(pedidoId)}`,
  )

  if (
    !datos ||
    typeof datos !== 'object' ||
    !('pedido' in datos)
  ) {
    throw new Error('La respuesta del detalle del pedido no es vÃ¡lida.')
  }

  return datos as RespuestaDetallePedidoAdmin
}

export async function actualizarEstadoPedidoAdmin(
  pedidoId: string,
  estado: Extract<
    EstadoPedidoAdmin,
    'CONFIRMADO' | 'RECHAZADO' | 'CANCELADO'
  >,
): Promise<RespuestaCambioEstadoPedidoAdmin> {
  const datos = await enviarSolicitudProtegida(
    `/api/v1/admin/orders/${encodeURIComponent(pedidoId)}/status`,
    {
      metodo: 'PATCH',
      cuerpo: { estado },
    },
  )

  if (
    !datos ||
    typeof datos !== 'object' ||
    !('pedido' in datos)
  ) {
    throw new Error('La respuesta al actualizar el pedido no es vÃ¡lida.')
  }

  return datos as RespuestaCambioEstadoPedidoAdmin
}
export async function obtenerDashboardPedidosAdmin(
  filtros: {
    periodo: PeriodoVentasAdmin
    desde?: string
    hasta?: string
    estado?: EstadoPedidoAdmin
  },
): Promise<DashboardPedidosAdmin> {
  const parametros = new URLSearchParams({ periodo: filtros.periodo })

  if (filtros.desde) parametros.set('desde', filtros.desde)
  if (filtros.hasta) parametros.set('hasta', filtros.hasta)
  if (filtros.estado) parametros.set('estado', filtros.estado)

  const datos = await obtenerDatos(
    `/api/v1/admin/orders/dashboard?${parametros.toString()}`,
  )

  if (!datos || typeof datos !== 'object') {
    throw new Error('La respuesta del dashboard no es válida.')
  }

  return datos as DashboardPedidosAdmin
}

export async function obtenerClientesPedidosAdmin(
  filtros: FiltrosClientesPedidosAdmin = {},
): Promise<RespuestaClientesPedidosAdmin> {
  const parametros = new URLSearchParams()

  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== '') {
      parametros.set(clave, String(valor))
    }
  })

  const consulta = parametros.toString()
  const ruta = `/api/v1/admin/orders/customers${consulta ? `?${consulta}` : ''}`
  const datos = await obtenerDatos(ruta)

  if (
    !datos ||
    typeof datos !== 'object' ||
    !('clientes' in datos) ||
    !Array.isArray(datos.clientes)
  ) {
    throw new Error('La respuesta de clientes no es válida.')
  }

  return datos as RespuestaClientesPedidosAdmin
}


export async function obtenerVentasPeriodoAdmin(
  periodo: PeriodoVentasAdmin,
  desde: string,
  hasta: string,
): Promise<VentaPeriodoAdmin[]> {
  const parametros = new URLSearchParams({ periodo, desde, hasta })
  const datos = await obtenerDatos(
    `/api/v1/admin/orders/sales/monthly?${parametros.toString()}`,
  )

  if (
    !datos ||
    typeof datos !== 'object' ||
    !('ventasMensuales' in datos) ||
    !Array.isArray(datos.ventasMensuales)
  ) {
    throw new Error('La respuesta de ventas por período no es válida.')
  }

  return datos.ventasMensuales as VentaPeriodoAdmin[]
}
