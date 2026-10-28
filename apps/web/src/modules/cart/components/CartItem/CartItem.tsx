import type { LineaCarrito } from '../../types/cart.types'
import './CartItem.css'

type CartItemProps = {
  linea: LineaCarrito
  onCambiarCantidad: (varianteId: string, cantidad: number) => void
  onEliminar: (varianteId: string) => void
}

const IMAGEN_POR_DEFECTO =
  'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=300&q=80'

const formatoMoneda = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
})

function CartItem({
  linea,
  onCambiarCantidad,
  onEliminar,
}: CartItemProps) {
  const { producto, variante, cantidad, precioUnitario, subtotal } = linea
  const imagen = variante.imagenUrl ?? producto.imagenUrl ?? IMAGEN_POR_DEFECTO
  const puedeAumentar = cantidad < variante.stockDisponible

  return (
    <article className="cart-item">
      <img
        className="cart-item__image"
        src={imagen}
        alt=""
        loading="lazy"
      />

      <div className="cart-item__details">
        <span className="cart-item__category">
          {producto.categoria.nombre}
        </span>

        <h2 className="cart-item__name">{producto.nombre}</h2>

        <p className="cart-item__variant">
          {variante.nombre} · {formatoMoneda.format(precioUnitario)}
        </p>

        <div className="cart-item__quantity" aria-label="Cantidad del producto">
          <button
            type="button"
            className="cart-item__quantity-button"
            aria-label={`Disminuir cantidad de ${producto.nombre}`}
            disabled={cantidad <= 1}
            onClick={() => onCambiarCantidad(variante.id, cantidad - 1)}
          >
            −
          </button>

          <span
            className="cart-item__quantity-value"
            aria-label={`Cantidad: ${cantidad}`}
          >
            {cantidad}
          </span>

          <button
            type="button"
            className="cart-item__quantity-button"
            aria-label={`Aumentar cantidad de ${producto.nombre}`}
            disabled={!puedeAumentar}
            onClick={() => onCambiarCantidad(variante.id, cantidad + 1)}
          >
            +
          </button>
        </div>

        {!puedeAumentar && (
          <p className="cart-item__stock-note">
            Máximo disponible: {variante.stockDisponible}
          </p>
        )}
      </div>

      <div className="cart-item__actions">
        <strong className="cart-item__subtotal">
          {formatoMoneda.format(subtotal)}
        </strong>

        <button
          type="button"
          className="cart-item__remove"
          aria-label={`Eliminar ${producto.nombre} del carrito`}
          onClick={() => onEliminar(variante.id)}
        >
          <svg
            viewBox="0 0 24 24"
            width="19"
            height="19"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="m19 6-1 14H6L5 6" />
            <path d="M10 10v6M14 10v6" />
          </svg>
        </button>
      </div>
    </article>
  )
}

export default CartItem