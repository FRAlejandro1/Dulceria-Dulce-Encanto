import { useCallback, useMemo, useState } from 'react'
import type { Producto, Variante } from '../../../types/catalogo.types'
import type { CantidadesCarrito } from '../types/cart.types'
import {
  calcularCantidadTotal,
  calcularSubtotalCarrito,
  obtenerLineasCarrito,
  validarAdicionCarrito,
} from '../utils/cart.utils'

export function useCart(productos: Producto[]) {
  const [carrito, setCarrito] = useState<CantidadesCarrito>({})

  const lineas = useMemo(
    () => obtenerLineasCarrito(productos, carrito),
    [productos, carrito],
  )

  const cantidadCarrito = useMemo(
    () => calcularCantidadTotal(lineas),
    [lineas],
  )

  const subtotalCarrito = useMemo(
    () => calcularSubtotalCarrito(lineas),
    [lineas],
  )

  const agregarVariante = useCallback(
    (variante: Variante): string | null => {
      const cantidadActual = carrito[variante.id] ?? 0
      const error = validarAdicionCarrito(variante, cantidadActual)

      if (error) {
        return error
      }

      setCarrito((actual) => ({
        ...actual,
        [variante.id]: (actual[variante.id] ?? 0) + 1,
      }))

      return null
    },
    [carrito],
  )

  const cambiarCantidad = useCallback(
    (varianteId: string, cantidad: number): string | null => {
      if (!Number.isInteger(cantidad) || cantidad < 1) {
        return 'La cantidad debe ser un número entero mayor que cero.'
      }

      const variante = productos
        .flatMap((producto) => producto.variantes)
        .find((elemento) => elemento.id === varianteId)

      if (!variante || variante.stockDisponible <= 0) {
        return 'Esta variante ya no está disponible.'
      }

      if (cantidad > variante.stockDisponible) {
        return 'No puedes superar las existencias disponibles.'
      }

      setCarrito((actual) => ({
        ...actual,
        [varianteId]: cantidad,
      }))

      return null
    },
    [productos],
  )

  const eliminarVariante = useCallback((varianteId: string) => {
    setCarrito((actual) => {
      const siguiente = { ...actual }
      delete siguiente[varianteId]
      return siguiente
    })
  }, [])

  const vaciarCarrito = useCallback(() => {
    setCarrito({})
  }, [])

  return {
    carrito,
    lineas,
    cantidadCarrito,
    subtotalCarrito,
    agregarVariante,
    cambiarCantidad,
    eliminarVariante,
    vaciarCarrito,
  }
}
