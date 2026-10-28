import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Producto, Variante } from '../../../types/catalogo.types'

interface UseProductActionsParams {
  variantesSeleccionadas: Record<string, string>
  setVariantesSeleccionadas: Dispatch<
    SetStateAction<Record<string, string>>
  >
  agregarVariante: (variante: Variante) => string | null
  cambiarCantidad: (varianteId: string, cantidad: number) => string | null
  setAviso: (mensaje: string) => void
}

export function useProductActions({
  variantesSeleccionadas,
  setVariantesSeleccionadas,
  agregarVariante,
  cambiarCantidad,
  setAviso,
}: UseProductActionsParams) {
  const obtenerVarianteSeleccionada = useCallback(
    (producto: Producto): Variante | undefined => {
      const varianteId = variantesSeleccionadas[producto.id]

      return (
        producto.variantes.find((variante) => variante.id === varianteId) ??
        producto.variantes[0]
      )
    },
    [variantesSeleccionadas],
  )

  const agregarAlCarrito = useCallback(
    (producto: Producto) => {
      const variante = obtenerVarianteSeleccionada(producto)

      if (!variante) {
        setAviso('Este producto no tiene variantes disponibles.')
        return
      }

      const error = agregarVariante(variante)

      if (error) {
        setAviso(error)
        return
      }

      setAviso(`${producto.nombre} se añadió al carrito.`)
    },
    [agregarVariante, obtenerVarianteSeleccionada, setAviso],
  )

  const manejarCambioCantidad = useCallback(
    (varianteId: string, cantidad: number) => {
      const error = cambiarCantidad(varianteId, cantidad)

      if (error) {
        setAviso(error)
      }
    },
    [cambiarCantidad, setAviso],
  )

  const manejarCambioVariante = useCallback(
    (productoId: string, varianteId: string) => {
      setVariantesSeleccionadas((actuales) => ({
        ...actuales,
        [productoId]: varianteId,
      }))
    },
    [setVariantesSeleccionadas],
  )

  return {
    obtenerVarianteSeleccionada,
    agregarAlCarrito,
    manejarCambioCantidad,
    manejarCambioVariante,
  }
}
