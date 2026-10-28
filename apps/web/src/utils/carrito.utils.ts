import type { Variante } from '../types/catalogo.types'

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