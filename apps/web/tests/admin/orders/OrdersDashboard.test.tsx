import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  DashboardPedidosAdmin,
  EstadoPedidoAdmin,
  VentaPeriodoAdmin,
} from '../../../src/modules/admin/types/orders.types'
import OrdersDashboard from '../../../src/modules/admin/components/OrdersAdmin/OrdersDashboard/OrdersDashboard'

function crearDashboard(): DashboardPedidosAdmin {
  return {
    pedidosHoy: 5,
    ventasHoy: '125.50',
    pedidosMes: 40,
    ventasMes: '950.75',
    pedidosAnio: 300,
    ventasAnio: '7500.00',
    pendientesConfirmacion: 3,
    estados: [
      { estado: 'CONFIRMADO', cantidad: 10, importe: '250.00' },
      { estado: 'PENDIENTE_CONFIRMACION', cantidad: 3, importe: '75.00' },
      { estado: 'PENDIENTE_ENVIO', cantidad: 5, importe: '125.00' },
      { estado: 'CANCELADO', cantidad: 1, importe: '20.00' },
      { estado: 'RECHAZADO', cantidad: 2, importe: '40.00' },
      { estado: 'EXPIRADO', cantidad: 1, importe: '15.00' },
    ],
  }
}

function crearProps(overrides: Record<string, unknown> = {}) {
  return {
    datos: crearDashboard(),
    cargando: false,
    error: '',
    ventas: [] as VentaPeriodoAdmin[],
    periodo: 'mes' as const,
    estadoDashboard: '' as EstadoPedidoAdmin | '',
    onEstadoDashboardChange: vi.fn(),
    anio: 2026,
    mes: 10,
    fechaDesde: '',
    fechaHasta: '',
    cargandoVentas: false,
    errorVentas: '',
    onPeriodoChange: vi.fn(),
    onAnioChange: vi.fn(),
    onMesChange: vi.fn(),
    onFechaDesdeChange: vi.fn(),
    onFechaHastaChange: vi.fn(),
    ...overrides,
  }
}

afterEach(() => cleanup())
beforeEach(() => vi.clearAllMocks())

describe('OrdersDashboard', () => {
  it('muestra las métricas generales y los pedidos pendientes', () => {
    render(<OrdersDashboard {...crearProps()} />)

    expect(screen.getByText('Pedidos de hoy')).toBeTruthy()
    expect(screen.getByText('Pedidos del mes')).toBeTruthy()
    expect(screen.getByText(/Pedidos del a/)).toBeTruthy()
    const hoy = screen.getByText('Pedidos de hoy').closest('article')
    const mes = screen.getByText('Pedidos del mes').closest('article')
    const anio = screen.getByText(/Pedidos del a/).closest('article')

    expect(hoy?.querySelector('.orders-dashboard__count')?.textContent).toBe('5')
    expect(mes?.querySelector('.orders-dashboard__count')?.textContent).toBe('40')
    expect(anio?.querySelector('.orders-dashboard__count')?.textContent).toBe('300')
    expect(screen.getByText('Pendientes de confirmación').parentElement?.querySelector('strong')?.textContent).toBe('3')
  })

  it('muestra valores de respaldo cuando no hay datos', () => {
    render(<OrdersDashboard {...crearProps({ datos: null })} />)

    expect(screen.getByText('Pedidos de hoy')).toBeTruthy()
    expect(screen.getByText('Pedidos del mes')).toBeTruthy()
    expect(screen.getByText('No hay pedidos para los filtros seleccionados.')).toBeTruthy()
  })

  it('muestra indicadores de carga para las métricas', () => {
    render(<OrdersDashboard {...crearProps({ cargando: true })} />)

    expect(screen.getAllByText('Cargando...').length).toBeGreaterThan(0)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('muestra un error del resumen', () => {
    render(<OrdersDashboard {...crearProps({ error: 'Error al cargar el resumen' })} />)

    expect(screen.getByRole('alert').textContent).toContain('Error al cargar el resumen')
  })

  it('permite seleccionar y deseleccionar un estado del resumen', () => {
    const props = crearProps()
    const { rerender, container } = render(<OrdersDashboard {...props} />)
    const estados = container.querySelector('.orders-dashboard__statuses')
    const boton = within(estados).getByRole('button', { name: /Confirmado/ })

    expect(boton.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(boton)
    expect(props.onEstadoDashboardChange).toHaveBeenCalledWith('CONFIRMADO')

    rerender(<OrdersDashboard {...props} estadoDashboard="CONFIRMADO" />)
    fireEvent.click(within(container.querySelector('.orders-dashboard__statuses')!).getByRole('button', { name: /Confirmado/ }))
    expect(props.onEstadoDashboardChange).toHaveBeenLastCalledWith('')
  })

  it('permite cambiar el período del gráfico', () => {
    const props = crearProps()
    render(<OrdersDashboard {...props} />)

    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'dia' },
    })

    expect(props.onPeriodoChange).toHaveBeenCalledWith('dia')
  })

  it('muestra 24 intervalos para el período diario', () => {
    render(<OrdersDashboard {...crearProps({ periodo: 'dia' })} />)

    expect(screen.getByText('Ventas de hoy por hora')).toBeTruthy()
    expect(screen.getByText('00h')).toBeTruthy()
    expect(screen.getByText('23h')).toBeTruthy()
  })

  it('muestra los siete días para el período semanal', () => {
    render(<OrdersDashboard {...crearProps({ periodo: 'semana' })} />)

    expect(screen.getByText('Ventas de la semana')).toBeTruthy()
    expect(screen.getByText('Lun')).toBeTruthy()
    expect(screen.getByText('Dom')).toBeTruthy()
  })

  it('permite cambiar el mes y el año', () => {
    const props = crearProps()
    render(<OrdersDashboard {...props} />)

    const selectores = screen.getAllByRole('combobox')

    fireEvent.change(selectores[1], { target: { value: '12' } })
    fireEvent.change(selectores[2], { target: { value: '2025' } })

    expect(props.onMesChange).toHaveBeenCalledWith(12)
    expect(props.onAnioChange).toHaveBeenCalledWith(2025)
  })

  it('genera los días correspondientes al mes seleccionado', () => {
    render(<OrdersDashboard {...crearProps({ mes: 2, anio: 2026 })} />)

    expect(screen.getByText('Ventas de Feb')).toBeTruthy()
    expect(screen.getByText('28')).toBeTruthy()
  })

  it('genera los doce meses para el período anual', () => {
    render(<OrdersDashboard {...crearProps({ periodo: 'anio' })} />)

    expect(screen.getByText('Ventas de 2026')).toBeTruthy()
    expect(screen.getByText('Ene')).toBeTruthy()
    expect(screen.getByText('Dic')).toBeTruthy()
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
  })

  it('permite modificar las fechas del período personalizado', () => {
    const props = crearProps({
      periodo: 'personalizado',
      fechaDesde: '2026-10-01',
      fechaHasta: '2026-10-05',
    })

    render(<OrdersDashboard {...props} />)

    fireEvent.change(screen.getByLabelText(/Fecha inicial/), {
      target: { value: '2026-10-02' },
    })
    fireEvent.change(screen.getByLabelText(/Fecha final/), {
      target: { value: '2026-10-06' },
    })

    expect(props.onFechaDesdeChange).toHaveBeenCalledWith('2026-10-02')
    expect(props.onFechaHastaChange).toHaveBeenCalledWith('2026-10-06')
  })

  it('limita las fechas del período personalizado', () => {
    render(<OrdersDashboard {...crearProps({
      periodo: 'personalizado',
      fechaDesde: '2026-10-01',
      fechaHasta: '2026-10-10',
    })} />)

    expect(screen.getByLabelText(/Fecha inicial/).getAttribute('max')).toBe('2026-10-10')
    expect(screen.getByLabelText(/Fecha final/).getAttribute('min')).toBe('2026-10-01')
  })

  it('muestra un mensaje cuando las fechas personalizadas están incompletas', () => {
    render(<OrdersDashboard {...crearProps({
      periodo: 'personalizado',
      fechaDesde: '2026-10-01',
      fechaHasta: '',
    })} />)

    expect(screen.getByText('No hay fechas disponibles para mostrar.')).toBeTruthy()
  })

  it('muestra un mensaje cuando la fecha inicial es posterior a la final', () => {
    render(<OrdersDashboard {...crearProps({
      periodo: 'personalizado',
      fechaDesde: '2026-10-10',
      fechaHasta: '2026-10-01',
    })} />)

    expect(screen.getByText('No hay fechas disponibles para mostrar.')).toBeTruthy()
  })

  it('muestra el estado de carga de las ventas', () => {
    render(<OrdersDashboard {...crearProps({ cargandoVentas: true })} />)

    expect(screen.getByRole('status').textContent).toContain('Cargando ventas')
  })

  it('muestra el error de ventas y oculta el gráfico', () => {
    render(<OrdersDashboard {...crearProps({
      errorVentas: 'No se pudieron cargar las ventas',
    })} />)

    expect(screen.getByRole('alert').textContent).toContain('No se pudieron cargar las ventas')
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('representa las ventas y los estados en el gráfico', () => {
    const props = crearProps({
      ventas: [
        { etiqueta: '1', estado: 'CONFIRMADO', cantidadPedidos: 4, ventas: '100.00' },
        { etiqueta: '1', estado: 'PENDIENTE_CONFIRMACION', cantidadPedidos: 2, ventas: '50.00' },
        { etiqueta: '2', estado: 'CONFIRMADO', cantidadPedidos: 3, ventas: '75.00' },
      ],
    })

    render(<OrdersDashboard {...props} />)

    expect(screen.getByRole('img', { name: /Cantidad de pedidos por estado/ })).toBeTruthy()
    expect(screen.getByText('9 pedidos')).toBeTruthy()
    expect(screen.getByText('Cada barra muestra la cantidad de pedidos del intervalo, diferenciados por estado.')).toBeTruthy()
  })

  it('filtra el gráfico por el estado seleccionado', () => {
    render(<OrdersDashboard {...crearProps({
      estadoDashboard: 'CONFIRMADO',
      ventas: [
        { etiqueta: '1', estado: 'CONFIRMADO', cantidadPedidos: 4, ventas: '100.00' },
        { etiqueta: '1', estado: 'CANCELADO', cantidadPedidos: 2, ventas: '50.00' },
      ],
    })} />)

    const leyenda = screen.getByLabelText('Leyenda de estados')

    expect(within(leyenda).getByText('Confirmado')).toBeTruthy()
    expect(within(leyenda).queryByText('Cancelado')).toBeNull()
  })

  it('muestra las fechas del intervalo personalizado en el gráfico', () => {
    render(<OrdersDashboard {...crearProps({
      periodo: 'personalizado',
      fechaDesde: '2026-10-01',
      fechaHasta: '2026-10-03',
      ventas: [
        { etiqueta: '2026-10-01', estado: 'CONFIRMADO', cantidadPedidos: 1, ventas: '10' },
        { etiqueta: '2026-10-03', estado: 'CONFIRMADO', cantidadPedidos: 2, ventas: '20' },
      ],
    })} />)

    expect(screen.getByText(/Ventas del.*seleccionado/)).toBeTruthy()
    expect(screen.getByText('1/10')).toBeTruthy()
    expect(screen.getByText('3/10')).toBeTruthy()
    expect(screen.getByText('3 pedidos')).toBeTruthy()
  })

  it('permite seleccionar una fecha final sin fecha inicial', () => {
    const props = crearProps({ periodo: 'personalizado', fechaDesde: '', fechaHasta: '' })
    render(<OrdersDashboard {...props} />)

    const fechaFinal = screen.getByLabelText(/Fecha final/) as HTMLInputElement
    expect(fechaFinal.getAttribute('min')).toBeNull()

    fireEvent.change(fechaFinal, { target: { value: '2026-10-30' } })

    expect(props.onFechaHastaChange).toHaveBeenCalledWith('2026-10-30')
  })
})
