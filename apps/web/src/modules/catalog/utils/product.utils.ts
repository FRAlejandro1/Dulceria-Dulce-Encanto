import type { Producto, Variante } from '../../../types/catalogo.types'

export function obtenerPrecio(variante: Variante): number {
  const precio = Number(variante.precio)

  return Number.isFinite(precio) && precio >= 0 ? precio : 0
}

export function obtenerPrecioMinimo(producto: Producto): number {
  if (producto.variantes.length === 0) {
    return Number.POSITIVE_INFINITY
  }

  return Math.min(...producto.variantes.map(obtenerPrecio))
}