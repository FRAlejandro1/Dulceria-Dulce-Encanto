export type EstadoPedidoAdmin =
  | 'PENDIENTE_ENVIO'
  | 'PENDIENTE_CONFIRMACION'
  | 'CONFIRMADO'
  | 'RECHAZADO'
  | 'CANCELADO'
  | 'EXPIRADO'

export type ItemPedidoAdmin = {
  varianteId: string
  producto: string
  variante: string
  sku: string
  precioUnitario: string
  cantidad: number
  subtotal: string
}

export type PedidoAdmin = {
  id: string
  numero: string
  usuarioId: string
  cliente: string
  correo: string
  estado: EstadoPedidoAdmin
  metodoPago: 'CASH' | 'TRANSFER'
  total: string
  creadoEn: string
  cantidadItems: number
}

export type DetallePedidoAdmin = {
  id: string
  numero: string
  usuarioId: string
  cliente: string
  correo: string
  estado: EstadoPedidoAdmin
  metodoPago: 'CASH' | 'TRANSFER'
  subtotal: string
  total: string
  notas: string | null
  creadoEn: string
  items: ItemPedidoAdmin[]
}

export type FiltrosPedidosAdmin = {
  estado?: EstadoPedidoAdmin
  desde?: string
  hasta?: string
  pagina?: number
  limite?: number
}

export type RespuestaPedidosAdmin = {
  pedidos: PedidoAdmin[]
  total: number
  pagina: number
  limite: number
}

export type RespuestaDetallePedidoAdmin = {
  pedido: DetallePedidoAdmin
}

export type EstadoActualizadoPedidoAdmin = {
  id: string
  numero: string
  estado: EstadoPedidoAdmin
}

export type RespuestaCambioEstadoPedidoAdmin = {
  pedido: EstadoActualizadoPedidoAdmin
}
export type ResumenPeriodoPedidosAdmin = {
  pedidos: number
  ventas: string
}

export type PeriodoVentasAdmin =
  | 'dia'
  | 'semana'
  | 'mes'
  | 'anio'
  | 'personalizado'

export type VentaPeriodoAdmin = {
  etiqueta: string | number
  estado: EstadoPedidoAdmin
  cantidadPedidos: number
  ventas: string
}

export type ResumenEstadoPedidosAdmin = {
  estado: EstadoPedidoAdmin
  cantidad: number
  importe: string
}

export type DashboardPedidosAdmin = {
  pedidosHoy: number
  ventasHoy: string
  pedidosMes: number
  ventasMes: string
  pedidosAnio: number
  ventasAnio: string
  pendientesConfirmacion: number
  estados: ResumenEstadoPedidosAdmin[]
}

export type ClientePedidosAdmin = {
  id: string
  nombre: string
  correo: string
  cantidadPedidos: number
  pedidos: PedidoAdmin[]
}

export type FiltrosClientesPedidosAdmin = {
  estado?: EstadoPedidoAdmin
  desde?: string
  hasta?: string
  busqueda?: string
  pagina?: number
  limite?: number
}

export type RespuestaClientesPedidosAdmin = {
  clientes: ClientePedidosAdmin[]
  totalClientes: number
  pagina: number
  limite: number
}
