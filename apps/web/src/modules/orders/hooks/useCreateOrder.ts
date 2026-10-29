import { useCallback, useState } from 'react'
import type { UsuarioAutenticado } from '../../auth/types/auth.types'
import type { LineaCarrito } from '../../cart/types/cart.types'
import { crearPedido } from '../services/orders.service'
import type { MetodoPagoPedido } from '../types/orders.types'

type PropiedadesUseCreateOrder = {
  usuario: UsuarioAutenticado | null
  lineas: LineaCarrito[]
  vaciarCarrito: () => void
  abrirAutenticacion: () => void
  notificar: (mensaje: string) => void
  alCrearPedido: () => void
}

export function useCreateOrder({
  usuario,
  lineas,
  vaciarCarrito,
  abrirAutenticacion,
  notificar,
  alCrearPedido,
}: PropiedadesUseCreateOrder) {
  const [procesandoPedido, setProcesandoPedido] = useState(false)

  const manejarCreacionPedido = useCallback(
    async (datos: {
      metodoPago: MetodoPagoPedido
      notas?: string
    }) => {
      if (!usuario) {
        notificar('Inicia sesión para realizar un pedido.')
        abrirAutenticacion()
        return
      }

      if (usuario.rol !== 'CLIENTE') {
        notificar('Solo las cuentas de cliente pueden realizar pedidos.')
        return
      }

      if (lineas.length === 0) {
        notificar('Agrega al menos un producto antes de confirmar el pedido.')
        return
      }

      if (procesandoPedido) return

      setProcesandoPedido(true)

      try {
        const pedido = await crearPedido({
          ...datos,
          items: lineas.map((linea) => ({
            varianteId: linea.variante.id,
            cantidad: linea.cantidad,
          })),
        })

        vaciarCarrito()
        notificar(`Pedido ${pedido.numero} creado correctamente.`)
        alCrearPedido()
      } catch (error) {
        notificar(
          error instanceof Error
            ? error.message
            : 'No se pudo crear el pedido. Inténtalo nuevamente.',
        )
      } finally {
        setProcesandoPedido(false)
      }
    },
    [
      usuario,
      lineas,
      vaciarCarrito,
      abrirAutenticacion,
      notificar,
      alCrearPedido,
      procesandoPedido,
    ],
  )

  return {
    procesandoPedido,
    manejarCreacionPedido,
  }
}
