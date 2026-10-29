import { useState } from 'react'
import type {
  LineaCarrito,
  PropiedadesPanelCarrito,
} from '../types/cart.types'
import type { MetodoPagoPedido } from '../../orders/types/orders.types'
import CartEmpty from './CartEmpty/CartEmpty'
import CartItem from './CartItem/CartItem'
import CartSummary from './CartSummary/CartSummary'
import CheckoutForm from './CheckoutForm/CheckoutForm'
import './CartPanel.css'

type CartPanelProps = PropiedadesPanelCarrito & {
  lineas?: LineaCarrito[]
  cantidadCarrito?: number
  subtotalCarrito?: number
  procesandoPedido?: boolean
  onCrearPedido?: (datos: {
    metodoPago: MetodoPagoPedido
    notas?: string
  }) => void
}

function CartPanel({
  productos,
  carrito,
  lineas: lineasRecibidas,
  cantidadCarrito: cantidadRecibida,
  subtotalCarrito: subtotalRecibido,
  onCerrar,
  onCambiarCantidad,
  onEliminar,
  onFinalizarPedido,
  procesandoPedido = false,
  onCrearPedido,
}: CartPanelProps) {
  const [checkoutAbierto, setCheckoutAbierto] = useState(false)

  const lineas =
    lineasRecibidas ??
    productos.flatMap((producto) =>
      producto.variantes.flatMap((variante) => {
        const cantidad = carrito[variante.id] ?? 0

        if (cantidad <= 0) return []

        const precio = Number(variante.precio)
        const precioUnitario =
          Number.isFinite(precio) && precio >= 0 ? precio : 0

        return [
          {
            producto,
            variante,
            cantidad,
            precioUnitario,
            subtotal: precioUnitario * cantidad,
          },
        ]
      }),
    )

  const cantidadCarrito =
    cantidadRecibida ??
    lineas.reduce((total, linea) => total + linea.cantidad, 0)

  const subtotalCarrito =
    subtotalRecibido ??
    lineas.reduce((total, linea) => total + linea.subtotal, 0)

  function manejarFinalizarPedido() {
    if (onCrearPedido) {
      setCheckoutAbierto(true)
      return
    }

    onFinalizarPedido()
  }

  return (
    <section
      className="simple-page cart-page"
      aria-labelledby="cart-page-title"
    >
      <div className="cart-page__intro">
        <button
          type="button"
          className="cart-page__back"
          onClick={onCerrar}
        >
          <span aria-hidden="true">←</span>
          Volver al catálogo
        </button>

        <p className="cart-page__eyebrow">Casi es tuyo</p>

        <h1 id="cart-page-title" className="cart-page__title">
          Mi carrito
        </h1>

        <p className="cart-page__description">
          Revisa tu selección antes de finalizar.
        </p>
      </div>

      {lineas.length === 0 ? (
        <CartEmpty onCerrar={onCerrar} />
      ) : checkoutAbierto && onCrearPedido ? (
        <CheckoutForm
          procesando={procesandoPedido}
          onConfirmar={onCrearPedido}
          onCancelar={() => setCheckoutAbierto(false)}
        />
      ) : (
        <div className="cart-layout">
          <section
            className="cart-page__items"
            aria-label="Productos del carrito"
          >
            <div className="cart-page__items-heading">
              <h2>Tu selección</h2>
              <span>
                {cantidadCarrito}{' '}
                {cantidadCarrito === 1 ? 'unidad' : 'unidades'}
              </span>
            </div>

            {lineas.map((linea) => (
              <CartItem
                key={linea.variante.id}
                linea={linea}
                onCambiarCantidad={onCambiarCantidad}
                onEliminar={onEliminar}
              />
            ))}
          </section>

          <CartSummary
            cantidad={cantidadCarrito}
            subtotal={subtotalCarrito}
            onFinalizarPedido={manejarFinalizarPedido}
          />
        </div>
      )}
    </section>
  )
}

export default CartPanel
