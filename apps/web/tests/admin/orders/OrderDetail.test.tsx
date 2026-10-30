import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import OrderDetail from '../../../src/modules/admin/components/OrdersAdmin/OrderDetail/OrderDetail'
import type {
  DetallePedidoAdmin,
  EstadoPedidoAdmin,
} from '../../../src/modules/admin/types/orders.types'

const crearPedido = (
  cambios: Partial<DetallePedidoAdmin> = {},
): DetallePedidoAdmin => ({
  id: 'pedido-1',
  numero: 'PED-001',
  usuarioId: 'usuario-1',
  cliente: 'Ana Pérez',
  correo: 'ana@example.com',
  estado: 'PENDIENTE_CONFIRMACION',
  metodoPago: 'CASH',
  subtotal: '10.00',
  total: '10.00',
  notas: null,
  creadoEn: '2026-10-30T14:30:00.000Z',
  items: [
    {
      varianteId: 'variante-1',
      producto: 'Alfajores',
      variante: 'Caja x 6',
      sku: 'ALF-001',
      precioUnitario: '2.50',
      cantidad: 4,
      subtotal: '10.00',
    },
  ],
  ...cambios,
})

const crearProps = (
  cambios: Partial<{
    pedido: DetallePedidoAdmin | null
    cargando: boolean
    actualizando: boolean
    error: string
  }> = {},
) => ({
  pedido: crearPedido(),
  cargando: false,
  actualizando: false,
  error: '',
  onCerrar: vi.fn(),
  onCambiarEstado: vi.fn(),
  ...cambios,
})

const estados: {
  estado: EstadoPedidoAdmin
  etiqueta: string
  clase: string
}[] = [
  {
    estado: 'PENDIENTE_ENVIO',
    etiqueta: 'Pendiente de envÃo',
    clase: 'pendiente_envio',
  },
  {
    estado: 'PENDIENTE_CONFIRMACION',
    etiqueta: 'Pendiente de confirmaciÃ³n',
    clase: 'pendiente_confirmacion',
  },
  { estado: 'CONFIRMADO', etiqueta: 'Confirmado', clase: 'confirmado' },
  { estado: 'RECHAZADO', etiqueta: 'Rechazado', clase: 'rechazado' },
  { estado: 'CANCELADO', etiqueta: 'Cancelado', clase: 'cancelado' },
  { estado: 'EXPIRADO', etiqueta: 'Expirado', clase: 'expirado' },
]

describe('OrderDetail', () => {
  afterEach(() => cleanup())
  it('muestra el detalle completo del pedido', () => {
    render(<OrderDetail {...crearProps()} />)

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('PED-001')).toBeTruthy()
    expect(screen.getByText('Ana Pérez')).toBeTruthy()
    expect(screen.getByText('ana@example.com')).toBeTruthy()
    expect(screen.getByText('Alfajores')).toBeTruthy()
    expect(screen.getByText(/Caja x 6/)).toBeTruthy()
    expect(screen.getByText(/ALF-001/)).toBeTruthy()
    expect(screen.getByText(/4/)).toBeTruthy()
  })

  it('muestra el indicador de carga y oculta el detalle', () => {
    render(<OrderDetail {...crearProps({ cargando: true })} />)

    expect(screen.getByRole('status').textContent).toContain('Cargando detalle')
    expect(screen.queryByText('Ana Pérez')).toBeNull()
    expect(screen.queryByText('ArtÃculos del pedido')).toBeNull()
  })

  it('muestra el mensaje de error', () => {
    render(<OrderDetail {...crearProps({ error: 'No se pudo cargar el pedido' })} />)

    expect(screen.getByRole('alert').textContent).toContain('No se pudo cargar el pedido')
  })

  it('muestra simultáneamente la carga y el error cuando ambos existen', () => {
    render(
      <OrderDetail
        {...crearProps({
          cargando: true,
          error: 'Error de conexión',
        })}
      />,
    )

    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('Error de conexión')
    expect(screen.queryByText('Ana Pérez')).toBeNull()
  })

  it('muestra el encabezado alternativo cuando no hay pedido', () => {
    render(<OrderDetail {...crearProps({ pedido: null })} />)

    expect(screen.getByText('Cargando pedido')).toBeTruthy()
    expect(screen.queryByText('Ana Pérez')).toBeNull()
  })

  it.each(estados)(
    'muestra la etiqueta y clase correspondientes al estado $estado',
    ({ estado, clase }) => {
      render(<OrderDetail {...crearProps({ pedido: crearPedido({ estado }) })} />)

      const badge = document.querySelector('.order-detail__badge') as HTMLElement
      const etiquetasNormalizadas: Record<EstadoPedidoAdmin, string> = {
        PENDIENTE_ENVIO: 'pendiente de envio',
        PENDIENTE_CONFIRMACION: 'pendiente de confirmacion',
        CONFIRMADO: 'confirmado',
        RECHAZADO: 'rechazado',
        CANCELADO: 'cancelado',
        EXPIRADO: 'expirado',
      }
      const texto = badge.textContent?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

      expect(texto).toBe(etiquetasNormalizadas[estado])
      expect(badge.className).toContain(`order-detail__badge--${clase}`)
    },
  )

  it('muestra el método de pago en efectivo', () => {
    render(<OrderDetail {...crearProps()} />)

    expect(screen.getByText('Efectivo')).toBeTruthy()
  })

  it('muestra el método de pago por transferencia', () => {
    render(
      <OrderDetail
        {...crearProps({
          pedido: crearPedido({ metodoPago: 'TRANSFER' }),
        })}
      />,
    )

    expect(screen.getByText('Transferencia')).toBeTruthy()
  })

  it('muestra las notas cuando el pedido las contiene', () => {
    render(
      <OrderDetail
        {...crearProps({
          pedido: crearPedido({ notas: 'Entregar después de las 15:00' }),
        })}
      />,
    )

    expect(screen.getByText('Notas: Entregar después de las 15:00')).toBeTruthy()
  })

  it('no muestra notas cuando el pedido tiene notas nulas', () => {
    render(
      <OrderDetail
        {...crearProps({
          pedido: crearPedido({ notas: null }),
        })}
      />,
    )

    expect(screen.queryByText(/^Notas:/)).toBeNull()
  })

  it('muestra los artículos y sus importes formateados', () => {
    const pedido = crearPedido()
    const moneda = (valor: string) =>
      new Intl.NumberFormat('es-EC', {
        style: 'currency',
        currency: 'USD',
      }).format(Number(valor))

    render(<OrderDetail {...crearProps({ pedido })} />)

    const articulos = document.querySelector('.order-detail__items')
    expect(articulos).toBeTruthy()
    expect(within(articulos as HTMLElement).getByText('Alfajores')).toBeTruthy()
    expect(within(articulos as HTMLElement).getAllByText(moneda('10.00')).length).toBe(1)
    expect(within(articulos as HTMLElement).getByText((_, elemento) => elemento?.tagName === 'SPAN' && elemento.textContent?.includes(moneda('2.50')) === true)).toBeTruthy()

    const totales = document.querySelector('.order-detail__totals')
    expect(totales).toBeTruthy()
    expect(within(totales as HTMLElement).getAllByText(moneda('10.00')).length).toBe(2)
  })

  it('muestra el formato de fecha y hora configurado para Ecuador', () => {
    const pedido = crearPedido()
    const fechaEsperada = new Intl.DateTimeFormat('es-EC', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(pedido.creadoEn))

    render(<OrderDetail {...crearProps({ pedido })} />)

    expect(screen.getByText(fechaEsperada)).toBeTruthy()
  })

  it('muestra el estado sin acciones cuando los artículos están vacíos', () => {
    render(
      <OrderDetail
        {...crearProps({
          pedido: crearPedido({ items: [] }),
        })}
      />,
    )

    expect(document.querySelector('.order-detail__items')?.children.length).toBe(0)
    expect(screen.getByText('Subtotal')).toBeTruthy()
    expect(screen.getByText('Total')).toBeTruthy()
  })

  it('permite confirmar un pedido pendiente de confirmación', () => {
    const props = crearProps()
    render(<OrderDetail {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    expect(props.onCambiarEstado).toHaveBeenCalledWith('pedido-1', 'CONFIRMADO')
  })

  it('permite rechazar un pedido pendiente de confirmación', () => {
    const props = crearProps()
    render(<OrderDetail {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }))

    expect(props.onCambiarEstado).toHaveBeenCalledWith('pedido-1', 'RECHAZADO')
  })

  it('permite cancelar un pedido pendiente de confirmación', () => {
    const props = crearProps()
    render(<OrderDetail {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(props.onCambiarEstado).toHaveBeenCalledWith('pedido-1', 'CANCELADO')
  })

  it('deshabilita las acciones mientras se actualiza el pedido', () => {
    render(<OrderDetail {...crearProps({ actualizando: true })} />)

    expect((screen.getByRole('button', { name: 'Confirmar pedido' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Rechazar' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it.each(
    estados.filter(({ estado }) => estado !== 'PENDIENTE_CONFIRMACION'),
  )('no muestra acciones para el estado $estado', ({ estado }) => {
    render(<OrderDetail {...crearProps({ pedido: crearPedido({ estado }) })} />)

    expect(screen.queryByRole('button', { name: 'Confirmar pedido' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rechazar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull()
  })

  it('cierra el detalle mediante el botón de cierre', () => {
    const props = crearProps()
    render(<OrderDetail {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }))

    expect(props.onCerrar).toHaveBeenCalledTimes(1)
  })

  it('cierra el detalle al hacer clic sobre el fondo', () => {
    const props = crearProps()
    render(<OrderDetail {...props} />)

    fireEvent.mouseDown(screen.getByRole('presentation'))

    expect(props.onCerrar).toHaveBeenCalledTimes(1)
  })

  it('no cierra el detalle al hacer clic dentro del diálogo', () => {
    const props = crearProps()
    render(<OrderDetail {...props} />)

    fireEvent.mouseDown(screen.getByRole('dialog'))

    expect(props.onCerrar).not.toHaveBeenCalled()
  })
})
