
import type { PropiedadesPanelCarrito } from '../types/cart.types'
import CartEmpty from './CartEmpty/CartEmpty'
import CartItem from './CartItem/CartItem'
import CartSummary from './CartSummary/CartSummary'
import './CartPanel.css'

function CartPanel({
  productos,
  carrito,
  onCerrar,
  onCambiarCantidad,
  onEliminar,
  onFinalizarPedido,
}: PropiedadesPanelCarrito) {
  const lineas = productos.flatMap((producto) =>
    producto.variantes.flatMap((variante) => {
      const cantidad = carrito[variante.id] ?? 0

      if (cantidad <= 0) {
        return []
      }

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

  const cantidadTotal = lineas.reduce(
    (total, linea) => total + linea.cantidad,
    0,
  )

  const subtotal = lineas.reduce(
    (total, linea) => total + linea.subtotal,
    0,
  )

  return (
    <section className="simple-page cart-page" aria-labelledby="cart-page-title">
      <div className="cart-page__intro">
        <button
          type="button"
          className="cart-page__back"
          onClick={onCerrar}
        >
          <span aria-hidden="true">←</span>
          Volver al catálogo
        </button>

        <p className="cart-page__eyebrow">TU SELECCIÓN DULCE</p>

        <h1 id="cart-page-title" className="cart-page__title">
          Mi carrito
        </h1>

        <p className="cart-page__description">
          Revisa tus productos antes de continuar.
        </p>
      </div>

      {lineas.length === 0 ? (
        <CartEmpty onCerrar={onCerrar} />
      ) : (
        <div className="cart-layout">
          <section
            className="cart-page__items"
            aria-label="Productos del carrito"
          >
            <div className="cart-page__items-heading">
              <h2>Tu selección</h2>
              <span>
                {cantidadTotal}{' '}
                {cantidadTotal === 1 ? 'unidad' : 'unidades'}
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
            cantidad={cantidadTotal}
            subtotal={subtotal}
            onFinalizarPedido={onFinalizarPedido}
          />
        </div>
      )}
    </section>
  )
}

export default CartPanel
