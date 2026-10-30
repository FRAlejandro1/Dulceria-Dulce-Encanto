import { useState, type FormEvent } from 'react'
import type { MetodoPagoPedido } from '../../../orders/types/orders.types'
import './CheckoutForm.css'

type CheckoutFormProps = {
  procesando: boolean
  onConfirmar: (datos: {
    metodoPago: MetodoPagoPedido
    notas?: string
  }) => void
  onCancelar: () => void
}

function CheckoutForm({
  procesando,
  onConfirmar,
  onCancelar,
}: CheckoutFormProps) {
  const [metodoPago, setMetodoPago] =
    useState<MetodoPagoPedido>('CASH')
  const [notas, setNotas] = useState('')

  function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    if (procesando) return

    const notasLimpias = notas.trim()

    onConfirmar({
      metodoPago,
      ...(notasLimpias ? { notas: notasLimpias } : {}),
    })
  }

  return (
    <section
      className="checkout-form"
      aria-labelledby="checkout-form-title"
    >
      <h2 id="checkout-form-title">Finalizar pedido</h2>
      <p>Selecciona cómo deseas pagar y confirma los detalles.</p>

      <form onSubmit={manejarEnvio}>
        <fieldset disabled={procesando}>
          <legend>Método de pago</legend>

          <label>
            <input
              type="radio"
              name="metodoPago"
              value="CASH"
              checked={metodoPago === 'CASH'}
              onChange={() => setMetodoPago('CASH')}
            />
            Efectivo
          </label>

          <label>
            <input
              type="radio"
              name="metodoPago"
              value="TRANSFER"
              checked={metodoPago === 'TRANSFER'}
              onChange={() => setMetodoPago('TRANSFER')}
            />
            Transferencia bancaria
          </label>
        </fieldset>

        <label htmlFor="checkout-notas">Notas del pedido (opcional)</label>
        <textarea
          id="checkout-notas"
          name="notas"
          value={notas}
          onChange={(evento) => setNotas(evento.target.value)}
          maxLength={1000}
          rows={4}
          disabled={procesando}
          placeholder="Indicaciones adicionales para tu pedido"
        />
        <p>{notas.length}/1000 caracteres</p>

        <div className="checkout-form__actions">
          <button
            type="button"
            onClick={onCancelar}
            disabled={procesando}
          >
            Volver al carrito
          </button>

          <button type="submit" disabled={procesando}>
            {procesando ? 'Creando pedido…' : 'Confirmar pedido'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default CheckoutForm
