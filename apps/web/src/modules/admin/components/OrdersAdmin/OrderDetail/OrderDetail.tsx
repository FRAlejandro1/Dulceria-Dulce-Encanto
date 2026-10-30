import type { DetallePedidoAdmin, EstadoPedidoAdmin } from '../../../types/orders.types'
import './OrderDetail.css'

const ETIQUETAS_ESTADO: Record<EstadoPedidoAdmin, string> = {
  PENDIENTE_ENVIO: 'Pendiente de envío',
  PENDIENTE_CONFIRMACION: 'Pendiente de confirmación',
  CONFIRMADO: 'Confirmado',
  RECHAZADO: 'Rechazado',
  CANCELADO: 'Cancelado',
  EXPIRADO: 'Expirado',
}

type Props = {
  pedido: DetallePedidoAdmin | null
  cargando: boolean
  actualizando: boolean
  error: string
  onCerrar: () => void
  onCambiarEstado: (
    pedidoId: string,
    estado: Extract<EstadoPedidoAdmin, 'CONFIRMADO' | 'RECHAZADO' | 'CANCELADO'>,
  ) => void
}

function dinero(valor: string) {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(valor))
}

function fecha(valor: string) {
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(valor))
}

function OrderDetail({
  pedido,
  cargando,
  actualizando,
  error,
  onCerrar,
  onCambiarEstado,
}: Props) {
  return (
    <div className="order-detail__overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCerrar()
    }}>
      <section
        className="order-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-title"
      >
        <header className="order-detail__header">
          <div>
            <span>Detalle del pedido</span>
            <h3 id="order-detail-title">{pedido?.numero ?? 'Cargando pedido'}</h3>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar detalle">×</button>
        </header>

        {cargando && <p className="order-detail__status" role="status">Cargando detalle...</p>}
        {error && <p className="order-detail__error" role="alert">{error}</p>}

        {pedido && !cargando && (
          <>
            <section className="order-detail__customer">
              <h4>Información del cliente</h4>
              <p>{pedido.cliente}</p>
              <p>{pedido.correo}</p>
              <div className="order-detail__metadata">
                <p><span>Fecha</span><strong>{fecha(pedido.creadoEn)}</strong></p>
                <p><span>Pago</span><strong>{pedido.metodoPago === 'CASH' ? 'Efectivo' : 'Transferencia'}</strong></p>
                <p>
                  <span>Estado</span>
                  <strong className={`order-detail__badge order-detail__badge--${pedido.estado.toLowerCase()}`}>
                    {ETIQUETAS_ESTADO[pedido.estado]}
                  </strong>
                </p>
              </div>
              {pedido.notas && <p>Notas: {pedido.notas}</p>}
            </section>

            <h4 className="order-detail__section-title">Artículos del pedido</h4>
            <div className="order-detail__items">
              {pedido.items.map((item, indice) => (
                <article key={`${item.varianteId}-${indice}`}>
                  <div>
                    <strong>{item.producto}</strong>
                    <span>{item.variante} · SKU: {item.sku}</span>
                    <span>{item.cantidad} × {dinero(item.precioUnitario)}</span>
                  </div>
                  <strong>{dinero(item.subtotal)}</strong>
                </article>
              ))}
            </div>

            <div className="order-detail__totals">
              <p>Subtotal <strong>{dinero(pedido.subtotal)}</strong></p>
              <p>Total <strong>{dinero(pedido.total)}</strong></p>
            </div>

            {pedido.estado === 'PENDIENTE_CONFIRMACION' && (
              <div className="order-detail__actions">
                <button type="button" disabled={actualizando} onClick={() => onCambiarEstado(pedido.id, 'CONFIRMADO')}>
                  Confirmar pedido
                </button>
                <button type="button" disabled={actualizando} onClick={() => onCambiarEstado(pedido.id, 'RECHAZADO')}>
                  Rechazar
                </button>
                <button type="button" disabled={actualizando} onClick={() => onCambiarEstado(pedido.id, 'CANCELADO')}>
                  Cancelar
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

export default OrderDetail
