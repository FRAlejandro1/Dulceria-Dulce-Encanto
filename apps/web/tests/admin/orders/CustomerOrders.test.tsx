import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClientePedidosAdmin, PedidoAdmin } from '../../../src/modules/admin/types/orders.types'
import CustomerOrders from '../../../src/modules/admin/components/OrdersAdmin/CustomerOrders/CustomerOrders'

function crearPedido(overrides: Partial<PedidoAdmin> = {}): PedidoAdmin {
  return {
    id: 'pedido-1',
    numero: 'PED-001',
    usuarioId: 'usuario-1',
    cliente: 'Ana Pérez',
    correo: 'ana@example.com',
    estado: 'PENDIENTE_CONFIRMACION',
    metodoPago: 'CASH',
    total: '25.50',
    creadoEn: '2026-10-30T10:00:00.000Z',
    cantidadItems: 2,
    ...overrides,
  }
}

function crearCliente(overrides: Partial<ClientePedidosAdmin> = {}): ClientePedidosAdmin {
  return {
    id: 'cliente-1',
    nombre: 'Ana Pérez',
    correo: 'ana@example.com',
    cantidadPedidos: 1,
    pedidos: [crearPedido()],
    ...overrides,
  }
}

function crearProps(overrides: Record<string, unknown> = {}) {
  return {
    clientes: [crearCliente()],
    totalClientes: 1,
    pagina: 1,
    limite: 8,
    estado: '',
    desde: '',
    hasta: '',
    busqueda: '',
    cargando: false,
    error: '',
    onEstadoChange: vi.fn(),
    onDesdeChange: vi.fn(),
    onHastaChange: vi.fn(),
    onBusquedaChange: vi.fn(),
    onPaginaChange: vi.fn(),
    onDetalle: vi.fn(),
    onActualizar: vi.fn(),
    ...overrides,
  }
}

afterEach(() => cleanup())
beforeEach(() => vi.clearAllMocks())

describe('CustomerOrders', () => {
  it('muestra los clientes y el resumen de pedidos', () => {
    render(<CustomerOrders {...crearProps()} />)

    expect(screen.getByText('Pedidos por cliente')).toBeTruthy()
    expect(screen.getByText('Ana Pérez')).toBeTruthy()
    expect(screen.getByText('ana@example.com')).toBeTruthy()
    expect(screen.getByText('1 pedido')).toBeTruthy()
    expect(screen.getByText('1 clientes con pedidos')).toBeTruthy()
  })

  it('notifica los cambios de los filtros', () => {
    const props = crearProps()
    render(<CustomerOrders {...props} />)

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar cliente' }), {
      target: { value: 'ana' },
    })
    fireEvent.change(screen.getByLabelText('Estado'), {
      target: { value: 'CONFIRMADO' },
    })
    fireEvent.change(screen.getByLabelText('Desde'), {
      target: { value: '2026-10-01' },
    })
    fireEvent.change(screen.getByLabelText('Hasta'), {
      target: { value: '2026-10-30' },
    })

    expect(props.onBusquedaChange).toHaveBeenCalledWith('ana')
    expect(props.onEstadoChange).toHaveBeenCalledWith('CONFIRMADO')
    expect(props.onDesdeChange).toHaveBeenCalledWith('2026-10-01')
    expect(props.onHastaChange).toHaveBeenCalledWith('2026-10-30')
  })

  it('limita las fechas según el filtro contrario', () => {
    render(<CustomerOrders {...crearProps({
      desde: '2026-10-01',
      hasta: '2026-10-30',
    })} />)

    expect(screen.getByLabelText('Desde').getAttribute('max')).toBe('2026-10-30')
    expect(screen.getByLabelText('Hasta').getAttribute('min')).toBe('2026-10-01')
  })

  it('muestra el estado de carga y deshabilita actualizar', () => {
    render(<CustomerOrders {...crearProps({ cargando: true })} />)

    expect(screen.getByRole('status').textContent).toContain('Cargando clientes')
    expect((screen.getByRole('button', { name: 'Actualizar' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('muestra el error y oculta la lista de clientes', () => {
    render(<CustomerOrders {...crearProps({ error: 'No se pudieron cargar los pedidos' })} />)

    expect(screen.getByRole('alert').textContent).toContain('No se pudieron cargar los pedidos')
    expect(screen.queryByText('Ana Pérez')).toBeNull()
  })

  it('muestra el mensaje cuando no hay clientes', () => {
    render(<CustomerOrders {...crearProps({ clientes: [], totalClientes: 0 })} />)

    expect(screen.getByText('No hay clientes con pedidos que coincidan con los filtros.')).toBeTruthy()
  })

  it('actualiza los pedidos al pulsar el botón', () => {
    const props = crearProps()
    render(<CustomerOrders {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))

    expect(props.onActualizar).toHaveBeenCalledOnce()
  })

  it('expande y contrae los pedidos de un cliente', () => {
    render(<CustomerOrders {...crearProps()} />)

    const cliente = screen.getByRole('button', { name: /Ana Pérez/ })

    expect(cliente.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('PED-001')).toBeNull()

    fireEvent.click(cliente)

    expect(cliente.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('PED-001')).toBeTruthy()
    expect(screen.getByText('2 artículos')).toBeTruthy()

    fireEvent.click(cliente)

    expect(cliente.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('PED-001')).toBeNull()
  })

  it('permite consultar el detalle de un pedido', () => {
    const props = crearProps()
    render(<CustomerOrders {...props} />)

    fireEvent.click(screen.getByRole('button', { name: /Ana Pérez/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Ver pedido' }))

    expect(props.onDetalle).toHaveBeenCalledWith('pedido-1')
  })

  it('permite cambiar de página y deshabilita los extremos', () => {
    const props = crearProps({ totalClientes: 20, limite: 8 })
    render(<CustomerOrders {...props} />)

    expect((screen.getByRole('button', { name: 'Anterior' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Siguiente' }) as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(props.onPaginaChange).toHaveBeenCalledWith(2)
  })

  it('deshabilita siguiente cuando se alcanza la última página', () => {
    render(<CustomerOrders {...crearProps({
      totalClientes: 20,
      limite: 8,
      pagina: 3,
    })} />)

    expect((screen.getByRole('button', { name: 'Siguiente' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('muestra varios pedidos y utiliza la etiqueta plural', () => {
    const cliente = crearCliente({
      cantidadPedidos: 2,
      pedidos: [
        crearPedido(),
        crearPedido({
          id: 'pedido-2',
          numero: 'PED-002',
          estado: 'CONFIRMADO',
        }),
      ],
    })

    render(<CustomerOrders {...crearProps({ clientes: [cliente] })} />)

    expect(screen.getByText('2 pedidos')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Ana Pérez/ }))

    expect(screen.getByText('PED-001')).toBeTruthy()
    expect(screen.getByText('PED-002')).toBeTruthy()
    expect(screen.getAllByText('Confirmado').length).toBeGreaterThan(0)
  })

  it('permite regresar a la página anterior', () => {
    const props = crearProps({ totalClientes: 20, limite: 8, pagina: 2 })
    render(<CustomerOrders {...props} />)

    const anterior = screen.getByRole('button', { name: 'Anterior' })
    expect((anterior as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(anterior)

    expect(props.onPaginaChange).toHaveBeenCalledWith(1)
  })

  it('muestra un avatar alternativo cuando el nombre está vacío', () => {
    const cliente = crearCliente({ nombre: '   ' })
    render(<CustomerOrders {...crearProps({ clientes: [cliente] })} />)

    expect(document.querySelector('.customer-orders__avatar')?.textContent).toBe('?')
  })
})
