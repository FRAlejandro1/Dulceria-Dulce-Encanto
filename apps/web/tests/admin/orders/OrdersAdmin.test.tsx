import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import OrdersAdmin from '../../../src/modules/admin/components/OrdersAdmin/OrdersAdmin'

const { mockUseAdminOrders } = vi.hoisted(() => ({
  mockUseAdminOrders: vi.fn(),
}))

vi.mock('../../../src/modules/admin/hooks/useAdminOrders', () => ({
  useAdminOrders: mockUseAdminOrders,
}))

vi.mock('../../../src/modules/admin/components/OrdersAdmin/OrdersDashboard/OrdersDashboard', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="orders-dashboard">
      <span>{String(props.datos ?? 'sin-dashboard')}</span>
      <span>{String(props.periodo)}</span>
      <button onClick={() => (props.onEstadoDashboardChange as (value: string) => void)('CONFIRMADO')}>
        Cambiar estado dashboard
      </button>
      <button onClick={() => (props.onPeriodoChange as (value: string) => void)('mes')}>
        Cambiar período
      </button>
      <button onClick={() => (props.onAnioChange as (value: number) => void)(2025)}>
        Cambiar año
      </button>
      <button onClick={() => (props.onMesChange as (value: number) => void)(5)}>
        Cambiar mes
      </button>
      <button onClick={() => (props.onFechaDesdeChange as (value: string) => void)('2026-01-01')}>
        Cambiar fecha inicial
      </button>
      <button onClick={() => (props.onFechaHastaChange as (value: string) => void)('2026-01-31')}>
        Cambiar fecha final
      </button>
    </div>
  ),
}))

vi.mock('../../../src/modules/admin/components/OrdersAdmin/CustomerOrders/CustomerOrders', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="customer-orders">
      <span>{String(props.totalClientes)}</span>
      <span>{String(props.pagina)}</span>
      <span>{String(props.limite)}</span>
      <span>{String(props.busqueda)}</span>
      <button onClick={() => (props.onEstadoChange as (value: string) => void)('PENDIENTE_ENVIO')}>
        Filtrar estado
      </button>
      <button onClick={() => (props.onDesdeChange as (value: string) => void)('2026-01-01')}>
        Filtrar desde
      </button>
      <button onClick={() => (props.onHastaChange as (value: string) => void)('2026-01-31')}>
        Filtrar hasta
      </button>
      <button onClick={() => (props.onBusquedaChange as (value: string) => void)('Ana')}>
        Buscar cliente
      </button>
      <button onClick={() => (props.onPaginaChange as (value: number) => void)(2)}>
        Cambiar página
      </button>
      <button onClick={() => (props.onDetalle as (id: string) => void)('pedido-1')}>
        Abrir detalle
      </button>
      <button onClick={props.onActualizar as () => void}>
        Actualizar pedidos
      </button>
    </div>
  ),
}))

vi.mock('../../../src/modules/admin/components/OrdersAdmin/OrderDetail/OrderDetail', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="order-detail">
      <span>{String(props.pedido ? 'pedido-seleccionado' : 'sin-pedido')}</span>
      <span>{String(props.error)}</span>
      <button onClick={props.onCerrar as () => void}>Cerrar detalle</button>
      <button
        onClick={() =>
          (props.onCambiarEstado as (id: string, estado: string) => void)(
            'pedido-1',
            'CONFIRMADO',
          )
        }
      >
        Cambiar estado pedido
      </button>
    </div>
  ),
}))

const crearPedidos = (sobrescritura: Record<string, unknown> = {}) => ({
  dashboard: null,
  cargandoDashboard: false,
  errorDashboard: '',
  ventasPeriodo: [],
  periodoVentas: 'anio',
  estadoDashboard: '',
  anioVentas: 2026,
  mesVentas: 10,
  fechaDesdeVentas: '2026-01-01',
  fechaHastaVentas: '2026-12-31',
  cargandoVentas: false,
  errorVentas: '',
  respuesta: null,
  pagina: 1,
  estado: '',
  desde: '',
  hasta: '',
  busqueda: '',
  cargandoClientes: false,
  error: '',
  cargandoDetalle: false,
  pedidoSeleccionado: null,
  actualizando: false,
  errorDetalle: '',
  cambiarEstadoDashboard: vi.fn(),
  cambiarPeriodoVentas: vi.fn(),
  cambiarAnioVentas: vi.fn(),
  cambiarMesVentas: vi.fn(),
  cambiarFechaDesdeVentas: vi.fn(),
  cambiarFechaHastaVentas: vi.fn(),
  cambiarEstadoFiltro: vi.fn(),
  cambiarDesde: vi.fn(),
  cambiarHasta: vi.fn(),
  cambiarBusqueda: vi.fn(),
  cambiarPagina: vi.fn(),
  abrirDetalle: vi.fn(),
  cerrarDetalle: vi.fn(),
  cambiarEstado: vi.fn(),
  cargarClientes: vi.fn(),
  cargarDashboard: vi.fn(),
  cargarVentasPeriodo: vi.fn(),
  ...sobrescritura,
})

describe('OrdersAdmin', () => {
  beforeEach(() => {
    mockUseAdminOrders.mockReturnValue(crearPedidos())
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renderiza el panel de pedidos con el dashboard y la lista de clientes', () => {
    render(<OrdersAdmin />)

    expect(document.querySelector('.admin-orders')).toBeTruthy()
    expect(screen.getByTestId('orders-dashboard')).toBeTruthy()
    expect(screen.getByTestId('customer-orders')).toBeTruthy()
    expect(screen.queryByTestId('order-detail')).toBeNull()
  })

  it('envía los valores predeterminados cuando todavía no existe respuesta de clientes', () => {
    render(<OrdersAdmin />)

    const clientes = screen.getByTestId('customer-orders')

    expect(clientes.textContent).toContain('0')
    expect(clientes.textContent).toContain('8')
  })

  it('transmite los datos recibidos al dashboard y a la lista de clientes', () => {
    mockUseAdminOrders.mockReturnValue(
      crearPedidos({
        dashboard: { totalPedidos: 15 },
        respuesta: {
          clientes: [{ id: 'cliente-1' }],
          totalClientes: 12,
          limite: 5,
        },
        pagina: 3,
        busqueda: 'Ana',
      }),
    )

    render(<OrdersAdmin />)

    expect(screen.getByTestId('orders-dashboard').textContent).toContain('[object Object]')
    expect(screen.getByTestId('customer-orders').textContent).toContain('12')
    expect(screen.getByTestId('customer-orders').textContent).toContain('3')
    expect(screen.getByTestId('customer-orders').textContent).toContain('5')
    expect(screen.getByTestId('customer-orders').textContent).toContain('Ana')
  })

  it('conecta los cambios del dashboard con sus callbacks', () => {
    const pedidos = crearPedidos()
    mockUseAdminOrders.mockReturnValue(pedidos)

    render(<OrdersAdmin />)

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar estado dashboard' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar período' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar año' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar mes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar fecha inicial' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar fecha final' }))

    expect(pedidos.cambiarEstadoDashboard).toHaveBeenCalledWith('CONFIRMADO')
    expect(pedidos.cambiarPeriodoVentas).toHaveBeenCalledWith('mes')
    expect(pedidos.cambiarAnioVentas).toHaveBeenCalledWith(2025)
    expect(pedidos.cambiarMesVentas).toHaveBeenCalledWith(5)
    expect(pedidos.cambiarFechaDesdeVentas).toHaveBeenCalledWith('2026-01-01')
    expect(pedidos.cambiarFechaHastaVentas).toHaveBeenCalledWith('2026-01-31')
  })

  it('conecta los filtros y la paginación de clientes con sus callbacks', () => {
    const pedidos = crearPedidos()
    mockUseAdminOrders.mockReturnValue(pedidos)

    render(<OrdersAdmin />)

    fireEvent.click(screen.getByRole('button', { name: 'Filtrar estado' }))
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar desde' }))
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar hasta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Buscar cliente' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar página' }))

    expect(pedidos.cambiarEstadoFiltro).toHaveBeenCalledWith('PENDIENTE_ENVIO')
    expect(pedidos.cambiarDesde).toHaveBeenCalledWith('2026-01-01')
    expect(pedidos.cambiarHasta).toHaveBeenCalledWith('2026-01-31')
    expect(pedidos.cambiarBusqueda).toHaveBeenCalledWith('Ana')
    expect(pedidos.cambiarPagina).toHaveBeenCalledWith(2)
  })

  it('recarga clientes, dashboard y ventas al actualizar la lista', () => {
    const pedidos = crearPedidos()
    mockUseAdminOrders.mockReturnValue(pedidos)

    render(<OrdersAdmin />)
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar pedidos' }))

    expect(pedidos.cargarClientes).toHaveBeenCalledOnce()
    expect(pedidos.cargarDashboard).toHaveBeenCalledOnce()
    expect(pedidos.cargarVentasPeriodo).toHaveBeenCalledOnce()
  })

  it('solicita la apertura del detalle al seleccionar un pedido', () => {
    const pedidos = crearPedidos()
    mockUseAdminOrders.mockReturnValue(pedidos)

    render(<OrdersAdmin />)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir detalle' }))

    expect(pedidos.abrirDetalle).toHaveBeenCalledWith('pedido-1')
  })

  it('muestra el detalle cuando está cargando', async () => {
    mockUseAdminOrders.mockReturnValue(crearPedidos({ cargandoDetalle: true }))

    render(<OrdersAdmin />)

    expect(await screen.findByTestId('order-detail')).toBeTruthy()
    expect(screen.getByTestId('order-detail').textContent).toContain('sin-pedido')
  })

  it('muestra el detalle cuando existe un pedido seleccionado', async () => {
    mockUseAdminOrders.mockReturnValue(
      crearPedidos({ pedidoSeleccionado: { id: 'pedido-1' } }),
    )

    render(<OrdersAdmin />)

    expect(await screen.findByTestId('order-detail')).toBeTruthy()
    expect(screen.getByTestId('order-detail').textContent).toContain('pedido-seleccionado')
  })

  it('muestra el detalle cuando existe un error al consultarlo', async () => {
    mockUseAdminOrders.mockReturnValue(
      crearPedidos({ errorDetalle: 'No se pudo consultar el pedido' }),
    )

    render(<OrdersAdmin />)

    expect(await screen.findByTestId('order-detail')).toBeTruthy()
    expect(screen.getByTestId('order-detail').textContent).toContain(
      'No se pudo consultar el pedido',
    )
  })

  it('conecta el cierre del detalle con su callback', async () => {
    const pedidos = crearPedidos({
      pedidoSeleccionado: { id: 'pedido-1' },
    })
    mockUseAdminOrders.mockReturnValue(pedidos)

    render(<OrdersAdmin />)

    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar detalle' }))

    expect(pedidos.cerrarDetalle).toHaveBeenCalledOnce()
  })

  it('conecta el cambio de estado del detalle con su callback', async () => {
    const pedidos = crearPedidos({
      pedidoSeleccionado: { id: 'pedido-1' },
    })
    mockUseAdminOrders.mockReturnValue(pedidos)

    render(<OrdersAdmin />)

    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar estado pedido' }))

    expect(pedidos.cambiarEstado).toHaveBeenCalledWith('pedido-1', 'CONFIRMADO')
  })

  it('no muestra el detalle cuando no está cargando ni hay pedido ni error', () => {
    mockUseAdminOrders.mockReturnValue(
      crearPedidos({
        cargandoDetalle: false,
        pedidoSeleccionado: null,
        errorDetalle: '',
      }),
    )

    render(<OrdersAdmin />)

    expect(screen.queryByTestId('order-detail')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })
})
