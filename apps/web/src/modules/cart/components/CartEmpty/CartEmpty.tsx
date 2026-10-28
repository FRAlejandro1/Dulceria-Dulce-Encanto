import './CartEmpty.css'

type CartEmptyProps = {
  onCerrar: () => void
}

function CartEmpty({ onCerrar }: CartEmptyProps) {
  return (
    <section className="cart-empty" aria-labelledby="cart-empty-title">
      <div className="cart-empty__illustration" aria-hidden="true">
        <svg
          viewBox="0 0 80 80"
          width="70"
          height="70"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 27h50l-5 38H20l-5-38Z" />
          <path d="M29 29v-8a11 11 0 0 1 22 0v8" />
          <path d="M30 43c3 5 7 7 10 7s7-2 10-7" />
          <path d="M28 12 24 8M52 12l4-4" />
        </svg>
      </div>

      <h2 id="cart-empty-title" className="cart-empty__title">
        Tu carrito está vacío
      </h2>

      <p className="cart-empty__description">
        Todavía no has añadido dulces a tu carrito. Explora el catálogo y
        encuentra algo especial.
      </p>

      <button
        type="button"
        className="cart-empty__button"
        onClick={onCerrar}
      >
        Explorar catálogo
      </button>
    </section>
  )
}

export default CartEmpty