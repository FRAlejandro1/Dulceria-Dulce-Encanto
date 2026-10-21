import type { Producto, Variante } from '../../../types/catalogo.types'

export type LineaCarrito = {
  producto: Producto
  variante: Variante
  cantidad: number
  precioUnitario: number
  subtotal: number
}

export type CantidadesCarrito = Record<string, number>

export type PropiedadesPanelCarrito = {
  productos: Producto[]
  carrito: CantidadesCarrito
  onCerrar: () => void
  onCambiarCantidad: (varianteId: string, cantidad: number) => void
  onEliminar: (varianteId: string) => void
  onFinalizarPedido: () => void
}