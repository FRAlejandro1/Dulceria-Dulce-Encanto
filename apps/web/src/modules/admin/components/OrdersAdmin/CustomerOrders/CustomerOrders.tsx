import { useState } from 'react'
import type {
  ClientePedidosAdmin,
  EstadoPedidoAdmin,
} from '../../../types/orders.types'
import './CustomerOrders.css'

const ETIQUETAS_ESTADO: Record<EstadoPedidoAdmin, string> = {
  PENDIENTE_ENVIO: 'Pendiente de envío',
  PENDIENTE_CONFIRMACION: 'Pendiente de confirmación',
  CONFIRMADO: 'Confirmado',
  RECHAZADO: 'Rechazado',
  CANCELADO: 'Cancelado',
  EXPIRADO: 'Expirado',
}

type Props = {
  clientes: ClientePedidosAdmin[]
  totalClientes: number
  pagina: number
  limite: number
  estado: EstadoPedidoAdmin | ''
  desde: string
  hasta: string
  busqueda: string
  cargando: boolean
  error: string
  onEstadoChange: (valor: EstadoPedidoAdmin | '') => void
  onDesdeChange: (valor: string) => void
  onHastaChange: (valor: string) => void
  onBusquedaChange: (valor: string) => void
  onPaginaChange: (pagina: number) => void
  onDetalle: (pedidoId: string) => void
  onActualizar: () => void
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

function CustomerOrders(props: Props) {
  const {
    clientes,
    totalClientes,
    pagina,
    limite,
    estado,
    desde,
    hasta,
    busqueda,
    cargando,
    error,
    onEstadoChange,
    onDesdeChange,
    onHastaChange,
    onBusquedaChange,
    onPaginaChange,
    onDetalle,
    onActualizar,
  } = props

  const [clienteExpandido, setClienteExpandido] = useState<string | null>(null)
  const totalPaginas = Math.max(1, Math.ceil(totalClientes / limite))

  const alternarCliente = (clienteId: string) => {
    setClienteExpandido((actual) => actual === clienteId ? null : clienteId)
  }

  return (
    <section className="customer-orders" aria-label="Pedidos agrupados por cliente">
      <header className="customer-orders__heading">
        <div>
          <h3>Pedidos por cliente</h3>
          <p>Consulta los pedidos recientes de cada cliente.</p>
        </div>
        <button type="button" onClick={onActualizar} disabled={cargando}>
          Actualizar
        </button>
      </header>

      <div className="customer-orders__filters" aria-label="Filtros de pedidos">
        <label className="customer-orders__search">
          <span>Buscar cliente</span>
          <input
            type="search"
            value={busqueda}
            onChange={(event) => onBusquedaChange(event.target.value)}
            placeholder="Nombre o correo electrónico"
          />
        </label>

        <label>
          <span>Estado</span>
          <select
            value={estado}
            onChange={(event) =>
              onEstadoChange(event.target.value as EstadoPedidoAdmin | '')
            }
          >
            <option value="">Todos los estados</option>
            {Object.entries(ETIQUETAS_ESTADO).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>{etiqueta}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Desde</span>
          <input
            type="date"
            value={desde}
            max={hasta || undefined}
            onChange={(event) => onDesdeChange(event.target.value)}
          />
        </label>

        <label>
          <span>Hasta</span>
          <input
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(event) => onHastaChange(event.target.value)}
          />
        </label>
      </div>

      {error && <div className="customer-orders__error" role="alert">{error}</div>}

      {cargando && <p className="customer-orders__status" role="status">Cargando clientes y pedidos...</p>}

      {!cargando && !error && clientes.length === 0 && (
        <p className="customer-orders__empty">No hay clientes con pedidos que coincidan con los filtros.</p>
      )}

      {!cargando && !error && clientes.length > 0 && (
        <div className="customer-orders__list">
          {clientes.map((cliente) => {
            const expandido = clienteExpandido === cliente.id
            const idPedidos = `customer-orders-orders-${cliente.id}`

            return (
              <article className="customer-orders__card" key={cliente.id}>
                <button
                  type="button"
                  className="customer-orders__customer"
                  aria-expanded={expandido}
                  aria-controls={idPedidos}
                  onClick={() => alternarCliente(cliente.id)}
                >
                  <span className="customer-orders__avatar" aria-hidden="true">
                    {cliente.nombre.trim().charAt(0).toUpperCase() || '?'}
                  </span>
                  <span className="customer-orders__identity">
                    <strong>{cliente.nombre}</strong>
                    <span>{cliente.correo}</span>
                  </span>
                  <span className="customer-orders__count">
                    {cliente.cantidadPedidos} {cliente.cantidadPedidos === 1 ? 'pedido' : 'pedidos'}
                  </span>
                  <svg
                    className={`customer-orders__chevron${expandido ? ' customer-orders__chevron--open' : ''}`}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {expandido && (
                  <div className="customer-orders__orders" id={idPedidos}>
                    {cliente.pedidos.map((pedido) => (
                      <div className="customer-orders__order" key={pedido.id}>
                        <div className="customer-orders__order-main">
                          <strong>{pedido.numero}</strong>
                          <span>{fecha(pedido.creadoEn)}</span>
                          <span>{pedido.cantidadItems} artículos</span>
                        </div>
                        <div className="customer-orders__order-status">
                          <strong>{dinero(pedido.total)}</strong>
                          <span className={`customer-orders__badge customer-orders__badge--${pedido.estado.toLowerCase()}`}>
                            {ETIQUETAS_ESTADO[pedido.estado]}
                          </span>
                          <button type="button" onClick={() => onDetalle(pedido.id)}>
                            Ver pedido
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {!cargando && totalClientes > 0 && (
        <footer className="customer-orders__pagination">
          <span>{totalClientes} clientes con pedidos</span>
          <div>
            <button type="button" disabled={pagina <= 1} onClick={() => onPaginaChange(pagina - 1)}>
              Anterior
            </button>
            <span>Página {pagina} de {totalPaginas}</span>
            <button type="button" disabled={pagina >= totalPaginas} onClick={() => onPaginaChange(pagina + 1)}>
              Siguiente
            </button>
          </div>
        </footer>
      )}
    </section>
  )
}

export default CustomerOrders
