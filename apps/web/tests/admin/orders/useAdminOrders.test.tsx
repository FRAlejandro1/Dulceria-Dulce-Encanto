import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  actualizarEstadoPedidoAdmin,
  obtenerClientesPedidosAdmin,
  obtenerDashboardPedidosAdmin,
  obtenerDetallePedidoAdmin,
  obtenerVentasPeriodoAdmin,
} from '../../../src/modules/admin/services/orders-admin.service'
import { useAdminOrders } from '../../../src/modules/admin/hooks/useAdminOrders'
import type {
  DashboardPedidosAdmin,
  DetallePedidoAdmin,
  RespuestaClientesPedidosAdmin,
  VentaPeriodoAdmin,
} from '../../../src/modules/admin/types/orders.types'

vi.mock('../../../src/modules/admin/services/orders-admin.service', () => ({
  actualizarEstadoPedidoAdmin: vi.fn(),
  obtenerClientesPedidosAdmin: vi.fn(),
  obtenerDashboardPedidosAdmin: vi.fn(),
  obtenerDetallePedidoAdmin: vi.fn(),
  obtenerVentasPeriodoAdmin: vi.fn(),
}))

const dashboard = {
  pedidosHoy: 2,
  ventasHoy: '20.00',
  pedidosMes: 10,
  ventasMes: '100.00',
  pedidosAnio: 50,
  ventasAnio: '500.00',
  pendientesConfirmacion: 1,
  estados: [],
} as DashboardPedidosAdmin

const clientes = {
  clientes: [],
  totalClientes: 0,
  pagina: 1,
  limite: 8,
} as RespuestaClientesPedidosAdmin

const detalle = {
  id: 'pedido-1',
  numero: 'PED-001',
  usuarioId: 'usuario-1',
  cliente: 'Ana',
  correo: 'ana@example.com',
  estado: 'PENDIENTE_CONFIRMACION',
  metodoPago: 'CASH',
  subtotal: '20.00',
  total: '20.00',
  notas: null,
  creadoEn: '2026-10-30T10:00:00.000Z',
  items: [],
} as DetallePedidoAdmin

const ventas: VentaPeriodoAdmin[] = [
  {
    etiqueta: '1',
    estado: 'CONFIRMADO',
    cantidadPedidos: 2,
    ventas: '20.00',
  },
]

afterEach(() => {
  vi.clearAllMocks()
})

beforeEach(() => {
  vi.mocked(obtenerDashboardPedidosAdmin).mockResolvedValue(dashboard)
  vi.mocked(obtenerClientesPedidosAdmin).mockResolvedValue(clientes)
  vi.mocked(obtenerVentasPeriodoAdmin).mockResolvedValue(ventas)
  vi.mocked(obtenerDetallePedidoAdmin).mockResolvedValue({ pedido: detalle })
  vi.mocked(actualizarEstadoPedidoAdmin).mockResolvedValue({
    pedido: { id: 'pedido-1', numero: 'PED-001', estado: 'CONFIRMADO' },
  })
})

describe('useAdminOrders', () => {
  it('inicializa los estados y carga dashboard, ventas y clientes', async () => {
    const { result } = renderHook(() => useAdminOrders())

    await waitFor(() => {
      expect(result.current.cargandoDashboard).toBe(false)
      expect(result.current.cargandoVentas).toBe(false)
      expect(result.current.cargandoClientes).toBe(false)
    })

    expect(result.current.periodoVentas).toBe('anio')
    expect(result.current.estado).toBe('')
    expect(result.current.pagina).toBe(1)
    expect(result.current.dashboard).toEqual(dashboard)
    expect(result.current.ventasPeriodo).toEqual(ventas)
    expect(result.current.respuesta).toEqual(clientes)
    expect(obtenerDashboardPedidosAdmin).toHaveBeenCalledOnce()
    expect(obtenerClientesPedidosAdmin).toHaveBeenCalledWith({
      estado: undefined,
      desde: undefined,
      hasta: undefined,
      busqueda: undefined,
      pagina: 1,
      limite: 8,
    })
  })

  it('calcula el rango anual', async () => {
    const { result } = renderHook(() => useAdminOrders())

    await waitFor(() => expect(result.current.cargandoVentas).toBe(false))

    expect(result.current.rangoVentas.desde).toBe(`${new Date().getFullYear()}-01-01`)
    expect(result.current.rangoVentas.hasta).toBe(`${new Date().getFullYear()}-12-31`)
  })

  it('calcula el rango diario', async () => {
    const { result } = renderHook(() => useAdminOrders())

    act(() => result.current.cambiarPeriodoVentas('dia'))

    await waitFor(() => expect(result.current.periodoVentas).toBe('dia'))

    const fecha = new Date()
    const esperada = [
      fecha.getFullYear(),
      String(fecha.getMonth() + 1).padStart(2, '0'),
      String(fecha.getDate()).padStart(2, '0'),
    ].join('-')

    expect(result.current.rangoVentas).toEqual({
      desde: esperada,
      hasta: esperada,
    })
  })

  it('calcula el rango semanal de lunes a domingo', async () => {
    const { result } = renderHook(() => useAdminOrders())

    act(() => result.current.cambiarPeriodoVentas('semana'))

    await waitFor(() => expect(result.current.periodoVentas).toBe('semana'))

    const lunes = new Date()
    lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7))
    const domingo = new Date(lunes)
    domingo.setDate(lunes.getDate() + 6)

    const formato = (fecha: Date) =>
      `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`

    expect(result.current.rangoVentas).toEqual({
      desde: formato(lunes),
      hasta: formato(domingo),
    })
  })

  it('calcula correctamente el rango mensual', async () => {
    const { result } = renderHook(() => useAdminOrders())

    act(() => {
      result.current.cambiarPeriodoVentas('mes')
      result.current.cambiarAnioVentas(2024)
      result.current.cambiarMesVentas(2)
    })

    await waitFor(() => expect(result.current.anioVentas).toBe(2024))

    expect(result.current.rangoVentas).toEqual({
      desde: '2024-02-01',
      hasta: '2024-02-29',
    })
  })

  it('utiliza las fechas seleccionadas en el período personalizado', async () => {
    const { result } = renderHook(() => useAdminOrders())

    act(() => {
      result.current.cambiarPeriodoVentas('personalizado')
      result.current.cambiarFechaDesdeVentas('2026-10-01')
      result.current.cambiarFechaHastaVentas('2026-10-30')
    })

    await waitFor(() => expect(result.current.fechaHastaVentas).toBe('2026-10-30'))

    expect(result.current.rangoVentas).toEqual({
      desde: '2026-10-01',
      hasta: '2026-10-30',
    })
  })

  it('permite cambiar los filtros de clientes y reinicia la página', async () => {
    const { result } = renderHook(() => useAdminOrders())

    await waitFor(() => expect(result.current.cargandoClientes).toBe(false))

    act(() => result.current.cambiarPagina(3))
    act(() => result.current.cambiarEstadoFiltro('CONFIRMADO'))
    expect(result.current.pagina).toBe(1)

    act(() => result.current.cambiarPagina(3))
    act(() => result.current.cambiarDesde('2026-10-01'))
    expect(result.current.pagina).toBe(1)

    act(() => result.current.cambiarPagina(3))
    act(() => result.current.cambiarHasta('2026-10-30'))
    expect(result.current.pagina).toBe(1)

    act(() => result.current.cambiarPagina(3))
    act(() => result.current.cambiarBusqueda(' Ana '))
    expect(result.current.pagina).toBe(1)

    await waitFor(() => {
      expect(obtenerClientesPedidosAdmin).toHaveBeenLastCalledWith({
        estado: 'CONFIRMADO',
        desde: '2026-10-01',
        hasta: '2026-10-30',
        busqueda: 'Ana',
        pagina: 1,
        limite: 8,
      })
    })
  })

  it('permite cambiar los filtros del dashboard y de ventas', async () => {
    const { result } = renderHook(() => useAdminOrders())

    act(() => {
      result.current.cambiarEstadoDashboard('CONFIRMADO')
      result.current.cambiarAnioVentas(2025)
      result.current.cambiarMesVentas(6)
      result.current.cambiarPagina(2)
    })

    expect(result.current.estadoDashboard).toBe('CONFIRMADO')
    expect(result.current.anioVentas).toBe(2025)
    expect(result.current.mesVentas).toBe(6)
    expect(result.current.pagina).toBe(2)
  })

  it('permite ejecutar manualmente las cargas', async () => {
    const { result } = renderHook(() => useAdminOrders())

    await waitFor(() => expect(result.current.cargandoClientes).toBe(false))

    await act(async () => {
      await Promise.all([
        result.current.cargarClientes(),
        result.current.cargarDashboard(),
        result.current.cargarVentasPeriodo(),
      ])
    })

    expect(obtenerClientesPedidosAdmin).toHaveBeenCalledTimes(2)
    expect(obtenerDashboardPedidosAdmin).toHaveBeenCalledTimes(2)
    expect(obtenerVentasPeriodoAdmin).toHaveBeenCalledTimes(2)
  })

  it('rechaza cargar ventas cuando faltan fechas', async () => {
    const { result } = renderHook(() => useAdminOrders())

    act(() => {
      result.current.cambiarPeriodoVentas('personalizado')
      result.current.cambiarFechaDesdeVentas('')
      result.current.cambiarFechaHastaVentas('')
    })

    await waitFor(() => {
      expect(result.current.errorVentas).not.toBe('')
    })

    expect(obtenerVentasPeriodoAdmin).toHaveBeenCalledTimes(1)
    expect(result.current.cargandoVentas).toBe(false)
  })

  it('rechaza cargar ventas cuando la fecha inicial supera la final', async () => {
    const { result } = renderHook(() => useAdminOrders())

    act(() => {
      result.current.cambiarPeriodoVentas('personalizado')
      result.current.cambiarFechaDesdeVentas('2026-10-30')
      result.current.cambiarFechaHastaVentas('2026-10-01')
    })

    await waitFor(() => {
      expect(result.current.errorVentas).toContain('fecha inicial')
    })

    expect(obtenerVentasPeriodoAdmin).toHaveBeenCalledTimes(1)
    expect(result.current.cargandoVentas).toBe(false)
  })

  it('abre y cierra el detalle de un pedido', async () => {
    const { result } = renderHook(() => useAdminOrders())

    await act(async () => {
      await result.current.abrirDetalle('pedido-1')
    })

    expect(obtenerDetallePedidoAdmin).toHaveBeenCalledWith('pedido-1')
    expect(result.current.pedidoSeleccionado).toEqual(detalle)
    expect(result.current.cargandoDetalle).toBe(false)

    act(() => result.current.cerrarDetalle())

    expect(result.current.pedidoSeleccionado).toBeNull()
    expect(result.current.errorDetalle).toBe('')
  })

  it('actualiza el estado y recarga los datos y el detalle', async () => {
    const { result } = renderHook(() => useAdminOrders())

    await waitFor(() => expect(result.current.cargandoClientes).toBe(false))

    await act(async () => {
      await result.current.cambiarEstado('pedido-1', 'CONFIRMADO')
    })

    expect(actualizarEstadoPedidoAdmin).toHaveBeenCalledWith('pedido-1', 'CONFIRMADO')
    expect(obtenerClientesPedidosAdmin).toHaveBeenCalledTimes(2)
    expect(obtenerDashboardPedidosAdmin).toHaveBeenCalledTimes(2)
    expect(obtenerVentasPeriodoAdmin).toHaveBeenCalledTimes(2)
    expect(obtenerDetallePedidoAdmin).toHaveBeenCalledWith('pedido-1')
    expect(result.current.pedidoSeleccionado).toEqual(detalle)
    expect(result.current.actualizando).toBe(false)
  })

  it('limpia los estados de carga después de completar las solicitudes', async () => {
    const { result } = renderHook(() => useAdminOrders())

    await waitFor(() => {
      expect(result.current.cargandoDashboard).toBe(false)
      expect(result.current.cargandoVentas).toBe(false)
      expect(result.current.cargandoClientes).toBe(false)
    })

    expect(result.current.actualizando).toBe(false)
    expect(result.current.cargandoDetalle).toBe(false)
  })
  it('maneja errores Error y valores inesperados al cargar el dashboard', async () => {
    const { result } = renderHook(() => useAdminOrders())
    await waitFor(() => expect(result.current.cargandoDashboard).toBe(false))

    vi.mocked(obtenerDashboardPedidosAdmin).mockRejectedValueOnce(new Error('Error dashboard'))
    await act(async () => result.current.cargarDashboard())
    expect(result.current.errorDashboard).toBe('Error dashboard')

    vi.mocked(obtenerDashboardPedidosAdmin).mockRejectedValueOnce('fallo')
    await act(async () => result.current.cargarDashboard())
    expect(result.current.errorDashboard).toBe('No se pudo cargar el resumen de pedidos.')
  })

  it('maneja errores Error y valores inesperados al cargar ventas', async () => {
    const { result } = renderHook(() => useAdminOrders())
    await waitFor(() => expect(result.current.cargandoVentas).toBe(false))

    vi.mocked(obtenerVentasPeriodoAdmin).mockRejectedValueOnce(new Error('Error ventas'))
    await act(async () => result.current.cargarVentasPeriodo())
    expect(result.current.errorVentas).toBe('Error ventas')

    vi.mocked(obtenerVentasPeriodoAdmin).mockRejectedValueOnce('fallo')
    await act(async () => result.current.cargarVentasPeriodo())
    expect(result.current.errorVentas).toContain('No se pudieron cargar las ventas')
  })

  it('maneja errores Error y valores inesperados al cargar clientes', async () => {
    const { result } = renderHook(() => useAdminOrders())
    await waitFor(() => expect(result.current.cargandoClientes).toBe(false))

    vi.mocked(obtenerClientesPedidosAdmin).mockRejectedValueOnce(new Error('Error clientes'))
    await act(async () => result.current.cargarClientes())
    expect(result.current.error).toBe('Error clientes')

    vi.mocked(obtenerClientesPedidosAdmin).mockRejectedValueOnce('fallo')
    await act(async () => result.current.cargarClientes())
    expect(result.current.error).toBe('No se pudieron cargar los clientes y sus pedidos.')
  })

  it('maneja errores Error y valores inesperados al abrir el detalle', async () => {
    const { result } = renderHook(() => useAdminOrders())
    await waitFor(() => expect(result.current.cargandoClientes).toBe(false))

    vi.mocked(obtenerDetallePedidoAdmin).mockRejectedValueOnce(new Error('Error detalle'))
    await act(async () => result.current.abrirDetalle('pedido-1'))
    expect(result.current.errorDetalle).toBe('Error detalle')

    vi.mocked(obtenerDetallePedidoAdmin).mockRejectedValueOnce('fallo')
    await act(async () => result.current.abrirDetalle('pedido-1'))
    expect(result.current.errorDetalle).toBe('No se pudo consultar el detalle del pedido.')
    expect(result.current.cargandoDetalle).toBe(false)
  })

  it('maneja errores Error y valores inesperados al actualizar un pedido', async () => {
    const { result } = renderHook(() => useAdminOrders())
    await waitFor(() => expect(result.current.cargandoClientes).toBe(false))

    vi.mocked(actualizarEstadoPedidoAdmin).mockRejectedValueOnce(new Error('Error actualización'))
    await act(async () => result.current.cambiarEstado('pedido-1', 'CONFIRMADO'))
    expect(result.current.errorDetalle).toBe('Error actualización')

    vi.mocked(actualizarEstadoPedidoAdmin).mockRejectedValueOnce('fallo')
    await act(async () => result.current.cambiarEstado('pedido-1', 'CONFIRMADO'))
    expect(result.current.errorDetalle).toBe('No se pudo actualizar el estado del pedido.')
    expect(result.current.actualizando).toBe(false)
  })
})
