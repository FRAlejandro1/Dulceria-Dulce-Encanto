import './CartSummary.css'

type CartSummaryProps = {
  cantidad: number
  subtotal: number
  onFinalizarPedido: () => void
}

const formatoMoneda = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
})

function CartSummary({
  cantidad,
  subtotal,
  onFinalizarPedido,
}: CartSummaryProps) {
  return (
    <aside className="cart-summary" aria-labelledby="cart-summary-title">
      <h2 id="cart-summary-title" className="cart-summary__title">
        Resumen del pedido
      </h2>

      <div className="cart-summary__row">
        <span>Productos</span>
        <span>{cantidad}</span>
      </div>

      <div className="cart-summary__row">
        <span>Subtotal</span>
        <span>{formatoMoneda.format(subtotal)}</span>
      </div>

      <div className="cart-summary__row cart-summary__shipping">
        <span>Envío</span>
        <span>Por confirmar</span>
      </div>

      <p className="cart-summary__note">
        El costo de envío se confirmará antes de completar el pedido.
      </p>

      <div className="cart-summary__total">
        <span>Total parcial</span>
        <strong>{formatoMoneda.format(subtotal)}</strong>
      </div>

      <button
        type="button"
        className="cart-summary__checkout"
        onClick={onFinalizarPedido}
      >
        Finalizar pedido
        <span aria-hidden="true">→</span>
      </button>

      <p className="cart-summary__secure-note">
        La finalización de pedidos aún no está habilitada.
      </p>
    </aside>
  )
}

export default CartSummary