import type {
  DashboardPedidosAdmin,
  EstadoPedidoAdmin,
  PeriodoVentasAdmin,
  VentaPeriodoAdmin,
} from '../../../types/orders.types'
import './OrdersDashboard.css'

type Props = {
  datos: DashboardPedidosAdmin | null
  cargando: boolean
  error: string
  ventas: VentaPeriodoAdmin[]
  periodo: PeriodoVentasAdmin
  estadoDashboard: EstadoPedidoAdmin | ''
  onEstadoDashboardChange: (estado: EstadoPedidoAdmin | '') => void
  anio: number
  mes: number
  fechaDesde: string
  fechaHasta: string
  cargandoVentas: boolean
  errorVentas: string
  onPeriodoChange: (periodo: PeriodoVentasAdmin) => void
  onAnioChange: (anio: number) => void
  onMesChange: (mes: number) => void
  onFechaDesdeChange: (fecha: string) => void
  onFechaHastaChange: (fecha: string) => void
}

const MESES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function dinero(valor: string | number) {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(valor))
}

function fechaISO(fecha: Date) {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

const PRESENTACION_ESTADOS: Record<EstadoPedidoAdmin, { etiqueta: string; simbolo: string }> = {
  PENDIENTE_ENVIO: { etiqueta: 'Pendiente de envío', simbolo: '↗' },
  PENDIENTE_CONFIRMACION: { etiqueta: 'Pendiente de confirmación', simbolo: '◷' },
  CONFIRMADO: { etiqueta: 'Confirmado', simbolo: '✓' },
  RECHAZADO: { etiqueta: 'Rechazado', simbolo: '!' },
  CANCELADO: { etiqueta: 'Cancelado', simbolo: '×' },
  EXPIRADO: { etiqueta: 'Expirado', simbolo: '⌛' },
}

const ESTADOS_GRAFICO: EstadoPedidoAdmin[] = [
  'CONFIRMADO',
  'PENDIENTE_CONFIRMACION',
  'PENDIENTE_ENVIO',
  'CANCELADO',
  'RECHAZADO',
  'EXPIRADO',
]

function generarEtiquetas(
  periodo: PeriodoVentasAdmin,
  anio: number,
  mes: number,
  fechaDesde: string,
  fechaHasta: string,
) {
  if (periodo === 'dia') {
    return Array.from({ length: 24 }, (_, hora) => ({
      clave: `${String(hora).padStart(2, '0')}:00`,
      nombre: `${String(hora).padStart(2, '0')}h`,
    }))
  }

  if (periodo === 'semana') {
    const hoy = new Date()
    const lunes = new Date(hoy)
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))

    return DIAS.map((nombre, indice) => {
      const fecha = new Date(lunes)
      fecha.setDate(lunes.getDate() + indice)

      return {
        clave: fechaISO(fecha),
        nombre,
      }
    })
  }

  if (periodo === 'mes') {
    const cantidadDias = new Date(anio, mes, 0).getDate()

    return Array.from({ length: cantidadDias }, (_, indice) => ({
      clave: String(indice + 1),
      nombre: String(indice + 1),
    }))
  }

  if (periodo === 'anio') {
    return MESES.map((nombre, indice) => ({
      clave: String(indice + 1),
      nombre,
    }))
  }

  if (!fechaDesde || !fechaHasta || fechaDesde > fechaHasta) {
    return []
  }

  const etiquetas: { clave: string; nombre: string }[] = []
  const inicio = new Date(`${fechaDesde}T12:00:00`)
  const fin = new Date(`${fechaHasta}T12:00:00`)

  for (
    const fecha = new Date(inicio);
    fecha <= fin;
    fecha.setDate(fecha.getDate() + 1)
  ) {
    etiquetas.push({
      clave: fechaISO(fecha),
      nombre: `${fecha.getDate()}/${fecha.getMonth() + 1}`,
    })
  }

  return etiquetas
}

function OrdersDashboard({
  datos,
  cargando,
  error,
  ventas,
  periodo,
  estadoDashboard,
  onEstadoDashboardChange,
  anio,
  mes,
  fechaDesde,
  fechaHasta,
  cargandoVentas,
  errorVentas,
  onPeriodoChange,
  onAnioChange,
  onMesChange,
  onFechaDesdeChange,
  onFechaHastaChange,
}: Props) {
  const metricas = [
    {
      titulo: 'Pedidos de hoy',
      cantidad: datos?.pedidosHoy ?? 0,
      ventas: datos ? dinero(datos.ventasHoy) : '—',

    },
    {
      titulo: 'Pedidos del mes',
      cantidad: datos?.pedidosMes ?? 0,
      ventas: datos ? dinero(datos.ventasMes) : '—',

    },
    {
      titulo: 'Pedidos del año',
      cantidad: datos?.pedidosAnio ?? 0,
      ventas: datos ? dinero(datos.ventasAnio) : '—',

    },
  ]

  const etiquetas = generarEtiquetas(
    periodo,
    anio,
    mes,
    fechaDesde,
    fechaHasta,
  )

  const estadosVisibles = estadoDashboard
    ? [estadoDashboard]
    : ESTADOS_GRAFICO

  const ventasPorPeriodo = etiquetas.map((etiqueta) => {
    const estados = estadosVisibles.map((estado) => {
      const registro = ventas.find(
        (venta) =>
          String(venta.etiqueta) === etiqueta.clave &&
          venta.estado === estado,
      )

      return {
        estado,
        pedidos: Number(registro?.cantidadPedidos ?? 0),
        ventas: Number(registro?.ventas ?? 0),
      }
    })

    return {
      ...etiqueta,
      estados,
      pedidos: estados.reduce((total, registro) => total + registro.pedidos, 0),
    }
  })

  const maximoPedidos = Math.max(
    ...ventasPorPeriodo.map((registro) => registro.pedidos),
    1,
  )

  const totalPedidos = ventasPorPeriodo.reduce(
    (total, registro) => total + registro.pedidos,
    0,
  )

  const anioActual = new Date().getFullYear()
  const aniosDisponibles = Array.from(
    { length: 6 },
    (_, indice) => anioActual - indice,
  )

  const ancho = Math.max(720, 90 + ventasPorPeriodo.length * 54)

  const tituloPeriodo = {
    dia: 'Ventas de hoy por hora',
    semana: 'Ventas de la semana',
    mes: `Ventas de ${MESES[mes - 1]}`,
    anio: `Ventas de ${anio}`,
    personalizado: 'Ventas del período seleccionado',
  }[periodo]

  return (
    <section className="orders-dashboard" aria-label="Resumen de pedidos">
      <div className="orders-dashboard__heading">
        <div className="orders-dashboard__pending">
          <span>Pendientes de confirmación</span>
          <strong>{cargando ? '—' : datos?.pendientesConfirmacion ?? 0}</strong>
        </div>
      </div>

      {error && (
        <p className="orders-dashboard__error" role="alert">{error}</p>
      )}

      <div className="orders-dashboard__overview">
      <div className="orders-dashboard__grid orders-dashboard__sales-grid">
        {metricas.map((metrica) => (
          <article className="orders-dashboard__card" key={metrica.titulo}>
            <span>{metrica.titulo}</span>
            <strong className="orders-dashboard__count">
              {cargando ? '—' : metrica.cantidad}
            </strong>
            <strong className="orders-dashboard__sales">
              {cargando ? 'Cargando...' : metrica.ventas}
            </strong>

          </article>
        ))}
      </div>

      <section className="orders-dashboard__statuses" aria-label="Pedidos por estado">
        <div className="orders-dashboard__grid orders-dashboard__sales-grid">
          {(datos?.estados ?? []).map((registro) => {
            const presentacion = PRESENTACION_ESTADOS[registro.estado]
            const seleccionado = estadoDashboard === registro.estado

            return (
              <button
                type="button"
                className={`orders-dashboard__card orders-dashboard__status-card orders-dashboard__status-card--${registro.estado.toLowerCase()}${seleccionado ? ' is-active' : ''}`}
                key={registro.estado}
                aria-pressed={seleccionado}
                onClick={() =>
                  onEstadoDashboardChange(seleccionado ? '' : registro.estado)
                }
              >
                <span className="orders-dashboard__status-label">
                  <span className="orders-dashboard__status-symbol" aria-hidden="true">
                    {presentacion.simbolo}
                  </span>
                  {presentacion.etiqueta}
                </span>
                <strong className="orders-dashboard__count">
                  {cargando ? '—' : registro.cantidad}
                </strong>
                <strong className="orders-dashboard__sales">
                  {cargando ? 'Cargando...' : dinero(registro.importe)}
                </strong>
              </button>
            )
          })}
          {!cargando && (datos?.estados ?? []).length === 0 && (
            <p>No hay pedidos para los filtros seleccionados.</p>
          )}
        </div>
      </section>

      </div>

      <section className="orders-dashboard__chart">
        <div className="orders-dashboard__chart-heading">
          <div>
            <h4>Ventas</h4>
          </div>

          <div className="orders-dashboard__filters">

            <label className="orders-dashboard__year">
              <span>Período</span>
              <select
                value={periodo}
                onChange={(evento) =>
                  onPeriodoChange(evento.target.value as PeriodoVentasAdmin)
                }
                aria-label="Seleccionar período de ventas"
              >
                <option value="dia">Día</option>
                <option value="semana">Semana</option>
                <option value="mes">Mes</option>
                <option value="anio">Año</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </label>

            {periodo === 'mes' && (
              <label className="orders-dashboard__year">
                <span>Mes</span>
                <select
                  value={mes}
                  onChange={(evento) => onMesChange(Number(evento.target.value))}
                  aria-label="Seleccionar mes"
                >
                  {MESES.map((nombre, indice) => (
                    <option key={nombre} value={indice + 1}>{nombre}</option>
                  ))}
                </select>
              </label>
            )}

            {(periodo === 'mes' || periodo === 'anio') && (
              <label className="orders-dashboard__year">
                <span>Año</span>
                <select
                  value={anio}
                  onChange={(evento) => onAnioChange(Number(evento.target.value))}
                  aria-label="Seleccionar año del gráfico"
                >
                  {aniosDisponibles.map((opcion) => (
                    <option key={opcion} value={opcion}>{opcion}</option>
                  ))}
                </select>
              </label>
            )}

            {periodo === 'personalizado' && (
              <>
                <label className="orders-dashboard__year">
                  <span>Desde</span>
                  <input
                    type="date"
                    value={fechaDesde}
                    max={fechaHasta || undefined}
                    onChange={(evento) => onFechaDesdeChange(evento.target.value)}
                    aria-label="Fecha inicial del gráfico"
                  />
                </label>

                <label className="orders-dashboard__year">
                  <span>Hasta</span>
                  <input
                    type="date"
                    value={fechaHasta}
                    min={fechaDesde || undefined}
                    onChange={(evento) => onFechaHastaChange(evento.target.value)}
                    aria-label="Fecha final del gráfico"
                  />
                </label>
              </>
            )}
          </div>
        </div>

        {errorVentas && (
          <p className="orders-dashboard__error" role="alert">
            {errorVentas}
          </p>
        )}

        {cargandoVentas ? (
          <p className="orders-dashboard__chart-status" role="status">
            Cargando ventas...
          </p>
        ) : errorVentas ? null : ventasPorPeriodo.length === 0 ? (
          <p className="orders-dashboard__chart-status">
            No hay fechas disponibles para mostrar.
          </p>
        ) : (
          <>
            <div className="orders-dashboard__chart-summary">
              <span>{tituloPeriodo}</span>
              <strong>{totalPedidos} pedidos</strong>
            </div>

            <div className="orders-dashboard__chart-legend" aria-label="Leyenda de estados">
              {estadosVisibles.map((estado) => (
                <span className="orders-dashboard__legend-item" key={estado}>
                  <span
                    className={`orders-dashboard__legend-color orders-dashboard__legend-color--${estado.toLowerCase()}`}
                    aria-hidden="true"
                  />
                  {PRESENTACION_ESTADOS[estado].etiqueta}
                </span>
              ))}
            </div>

            <div className="orders-dashboard__chart-scroll">
              <svg
                className="orders-dashboard__svg"
                viewBox={`0 0 ${ancho} 270`}
                style={{ minWidth: `${ancho}px` }}
                role="img"
                aria-label={`Cantidad de pedidos por estado: ${tituloPeriodo.toLowerCase()}`}
              >
                {[0, 1, 2, 3].map((linea) => {
                  const y = 205 - linea * 55

                  return (
                    <g key={linea}>
                      <line
                        x1="42"
                        y1={y}
                        x2={ancho - 15}
                        y2={y}
                        className="orders-dashboard__grid-line"
                      />
                      <text
                        x="34"
                        y={y + 4}
                        textAnchor="end"
                        className="orders-dashboard__axis-label"
                      >
                        {Math.round((maximoPedidos * linea) / 3)}
                      </text>
                    </g>
                  )
                })}

                {ventasPorPeriodo.map((registro, indice) => {
                  const x = 52 + indice * 54
                  let desplazamiento = 0

                  return (
                    <g key={registro.clave}>
                      <title>
                        {`${registro.nombre}: ${registro.pedidos} pedidos`}
                      </title>

                      {registro.estados
                        .filter((segmento) => segmento.pedidos > 0)
                        .map((segmento) => {
                          const altura =
                            (segmento.pedidos / maximoPedidos) * 165
                          const y = 205 - desplazamiento - altura
                          desplazamiento += altura

                          return (
                            <rect
                              key={segmento.estado}
                              x={x}
                              y={y}
                              width="30"
                              height={Math.max(altura, 2)}
                              rx="3"
                              className={`orders-dashboard__bar orders-dashboard__bar--${segmento.estado.toLowerCase()}`}
                            >
                              <title>
                                {`${PRESENTACION_ESTADOS[segmento.estado].etiqueta}: ${segmento.pedidos} pedidos`}
                              </title>
                            </rect>
                          )
                        })}

                      <text
                        x={x + 15}
                        y="225"
                        textAnchor="middle"
                        className="orders-dashboard__month-label"
                      >
                        {registro.nombre}
                      </text>
                      <text
                        x={x + 15}
                        y="243"
                        textAnchor="middle"
                        className="orders-dashboard__order-label"
                      >
                        {registro.pedidos}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>

            <p className="orders-dashboard__chart-note">
              Cada barra muestra la cantidad de pedidos del intervalo, diferenciados por estado.
            </p>
          </>
        )}
      </section>
    </section>
  )
}

export default OrdersDashboard
