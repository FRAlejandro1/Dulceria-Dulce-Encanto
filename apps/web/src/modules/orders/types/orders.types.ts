export type MetodoPagoPedido = 'CASH' | 'TRANSFER'

export interface ItemCrearPedido {
  varianteId: string
  cantidad: number
}

export interface DatosCrearPedido {
  metodoPago: MetodoPagoPedido
  notas?: string
  items: ItemCrearPedido[]
}

export interface PedidoCreado {
  id: string
  numero: string
  estado: string
  subtotal: number
  total: number
}

export interface RespuestaCrearPedido {
  pedido: PedidoCreado
}
