import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  actualizarEstadoPedidoAdmin,
  obtenerClientesPedidosAdmin,
  obtenerDashboardPedidosAdmin,
  obtenerDetallePedidoAdmin,
  obtenerPedidosAdmin,
  obtenerVentasPeriodoAdmin,
} from '../../src/modules/admin/services/orders-admin.service'
import { enviarSolicitudProtegida } from '../../src/services/http.service'

vi.mock('../../src/services/http.service', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/services/http.service')>()
  return { ...original, enviarSolicitudProtegida: vi.fn() }
})

function respuestaJson(datos: unknown, opciones: { status?: number; ok?: boolean } = {}): Response {
  return {
    status: opciones.status ?? 200,
    ok: opciones.ok ?? true,
    json: vi.fn().mockResolvedValue(datos),
  } as unknown as Response
}

const solicitudProtegida = vi.mocked(enviarSolicitudProtegida)

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  solicitudProtegida.mockReset()
})

describe('orders-admin.service', () => {
  describe('obtenerPedidosAdmin', () => {
    it('consulta pedidos sin filtros', async () => {
      const pedidos = [{ id: '1' }]
      const fetchMock = vi.fn().mockResolvedValue(respuestaJson({ pedidos }))
      vi.stubGlobal('fetch', fetchMock)

      await expect(obtenerPedidosAdmin()).resolves.toEqual({ pedidos })
      expect(fetchMock).toHaveBeenCalledWith('/api/v1/admin/orders', {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
    })

    it('envía filtros y omite valores vacíos o indefinidos', async () => {
      const fetchMock = vi.fn().mockResolvedValue(respuestaJson({ pedidos: [] }))
      vi.stubGlobal('fetch', fetchMock)

      await obtenerPedidosAdmin({
        estado: 'CONFIRMADO',
        pagina: 2,
        busqueda: '',
        desde: undefined,
      } as never)

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/admin/orders?estado=CONFIRMADO&pagina=2',
        expect.any(Object),
      )
    })

    it.each([null, [], {}, { pedidos: null }, { pedidos: {} }])(
      'rechaza respuestas inválidas: %j',
      async (datos) => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaJson(datos)))
        await expect(obtenerPedidosAdmin()).rejects.toThrow(
          'La respuesta de pedidos no es vÃ¡lida.',
        )
      },
    )
  })

  describe('obtenerDetallePedidoAdmin', () => {
    it('consulta el detalle codificando el identificador', async () => {
      const respuesta = { pedido: { id: 'pedido/1' } }
      const fetchMock = vi.fn().mockResolvedValue(respuestaJson(respuesta))
      vi.stubGlobal('fetch', fetchMock)

      await expect(obtenerDetallePedidoAdmin('pedido/1')).resolves.toEqual(respuesta)
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/admin/orders/pedido%2F1',
        expect.any(Object),
      )
    })

    it.each([null, [], {}])(
      'rechaza respuestas sin pedido: %j',
      async (datos) => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaJson(datos)))
        await expect(obtenerDetallePedidoAdmin('1')).rejects.toThrow(
          'La respuesta del detalle del pedido no es vÃ¡lida.',
        )
      },
    )
  })

  describe('actualizarEstadoPedidoAdmin', () => {
    it('envía el cambio de estado protegido', async () => {
      const respuesta = { pedido: { id: '1', estado: 'CONFIRMADO' } }
      solicitudProtegida.mockResolvedValue(respuesta as never)

      await expect(
        actualizarEstadoPedidoAdmin('1', 'CONFIRMADO'),
      ).resolves.toEqual(respuesta)

      expect(solicitudProtegida).toHaveBeenCalledWith(
        '/api/v1/admin/orders/1/status',
        { metodo: 'PATCH', cuerpo: { estado: 'CONFIRMADO' } },
      )
    })

    it('codifica el identificador', async () => {
      solicitudProtegida.mockResolvedValue({ pedido: {} } as never)
      await actualizarEstadoPedidoAdmin('pedido/1', 'RECHAZADO')

      expect(solicitudProtegida).toHaveBeenCalledWith(
        '/api/v1/admin/orders/pedido%2F1/status',
        expect.any(Object),
      )
    })

    it.each([null, [], {}])(
      'rechaza respuestas inválidas: %j',
      async (datos) => {
        solicitudProtegida.mockResolvedValue(datos as never)
        await expect(
          actualizarEstadoPedidoAdmin('1', 'CANCELADO'),
        ).rejects.toThrow('La respuesta al actualizar el pedido no es vÃ¡lida.')
      },
    )
  })

  describe('obtenerDashboardPedidosAdmin', () => {
    it('consulta el dashboard con todos los filtros', async () => {
      const respuesta = { resumen: {}, ventasMensuales: [] }
      const fetchMock = vi.fn().mockResolvedValue(respuestaJson(respuesta))
      vi.stubGlobal('fetch', fetchMock)

      await expect(obtenerDashboardPedidosAdmin({
        periodo: 'mensual',
        desde: '2026-01-01',
        hasta: '2026-01-31',
        estado: 'CONFIRMADO',
      } as never)).resolves.toEqual(respuesta)

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/admin/orders/dashboard?periodo=mensual&desde=2026-01-01&hasta=2026-01-31&estado=CONFIRMADO',
        expect.any(Object),
      )
    })

    it('consulta el dashboard solo con el período', async () => {
      const fetchMock = vi.fn().mockResolvedValue(respuestaJson({}))
      vi.stubGlobal('fetch', fetchMock)

      await obtenerDashboardPedidosAdmin({ periodo: 'mensual' } as never)

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/admin/orders/dashboard?periodo=mensual',
        expect.any(Object),
      )
    })

    it.each([null, 'inválido'])('rechaza respuestas inválidas: %j', async (datos) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaJson(datos)))
      await expect(
        obtenerDashboardPedidosAdmin({ periodo: 'mensual' } as never),
      ).rejects.toThrow('La respuesta del dashboard no es válida.')
    })
  })

  describe('obtenerClientesPedidosAdmin', () => {
    it('consulta clientes sin filtros', async () => {
      const respuesta = { clientes: [] }
      const fetchMock = vi.fn().mockResolvedValue(respuestaJson(respuesta))
      vi.stubGlobal('fetch', fetchMock)

      await expect(obtenerClientesPedidosAdmin()).resolves.toEqual(respuesta)
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/admin/orders/customers',
        expect.any(Object),
      )
    })

    it('envía filtros y omite valores vacíos', async () => {
      const fetchMock = vi.fn().mockResolvedValue(respuestaJson({ clientes: [] }))
      vi.stubGlobal('fetch', fetchMock)

      await obtenerClientesPedidosAdmin({
        busqueda: 'Ana',
        pagina: 2,
        estado: '',
      } as never)

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/admin/orders/customers?busqueda=Ana&pagina=2',
        expect.any(Object),
      )
    })

    it.each([null, [], {}, { clientes: null }, { clientes: {} }])(
      'rechaza respuestas inválidas: %j',
      async (datos) => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaJson(datos)))
        await expect(obtenerClientesPedidosAdmin()).rejects.toThrow(
          'La respuesta de clientes no es válida.',
        )
      },
    )
  })

  describe('obtenerVentasPeriodoAdmin', () => {
    it('consulta las ventas del período', async () => {
      const ventas = [{ mes: 1, ventas: 250 }]
      const fetchMock = vi.fn().mockResolvedValue(respuestaJson({ ventasMensuales: ventas }))
      vi.stubGlobal('fetch', fetchMock)

      await expect(
        obtenerVentasPeriodoAdmin('mensual', '2026-01-01', '2026-01-31'),
      ).resolves.toEqual(ventas)

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/admin/orders/sales/monthly?periodo=mensual&desde=2026-01-01&hasta=2026-01-31',
        expect.any(Object),
      )
    })

    it.each([null, [], {}, { ventasMensuales: null }, { ventasMensuales: {} }])(
      'rechaza respuestas inválidas: %j',
      async (datos) => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaJson(datos)))
        await expect(
          obtenerVentasPeriodoAdmin('mensual', '2026-01-01', '2026-01-31'),
        ).rejects.toThrow('La respuesta de ventas por período no es válida.')
      },
    )
  })

  it('propaga errores HTTP y errores de red', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      respuestaJson({ error: 'Acceso denegado' }, { status: 403, ok: false }),
    ))
    await expect(obtenerPedidosAdmin()).rejects.toThrow('Acceso denegado')

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Error de conexión')))
    await expect(obtenerPedidosAdmin()).rejects.toThrow('Error de conexión')
  })
})
