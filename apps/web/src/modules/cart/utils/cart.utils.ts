import type { Producto, Variante } from '../../../types/catalogo.types'
import type {
  CantidadesCarrito,
  LineaCarrito,
} from '../types/cart.types'

export function validarAdicionCarrito(
  variante: Variante | undefined,
  cantidadActual: number,
): string | null {
  if (!variante) {
    return 'Este producto no tiene variantes disponibles.'
  }

  if (variante.stockDisponible <= 0) {
    return 'Esta variante no tiene existencias disponibles.'
  }

  if (cantidadActual >= variante.stockDisponible) {
    return 'No puedes agregar más unidades que las disponibles en stock.'
  }

  return null
}

export function obtenerPrecioSeguro(variante: Variante): number {
  const precio = Number(variante.precio)

  return Number.isFinite(precio) && precio >= 0 ? precio : 0
}

export function obtenerLineasCarrito(
  productos: Producto[],
  carrito: CantidadesCarrito,
): LineaCarrito[] {
  const lineas: LineaCarrito[] = []

  for (const producto of productos) {
    for (const variante of producto.variantes) {
      const cantidad = carrito[variante.id] ?? 0

      if (cantidad <= 0) {
        continue
      }

      const precioUnitario = obtenerPrecioSeguro(variante)

      lineas.push({
        producto,
        variante,
        cantidad,
        precioUnitario,
        subtotal: precioUnitario * cantidad,
      })
    }
  }

  return lineas
}

export function calcularCantidadTotal(lineas: LineaCarrito[]): number {
  return lineas.reduce((total, linea) => total + linea.cantidad, 0)
}

export function calcularSubtotalCarrito(lineas: LineaCarrito[]): number {
  return lineas.reduce((total, linea) => total + linea.subtotal, 0)
}