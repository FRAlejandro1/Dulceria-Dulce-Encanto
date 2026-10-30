
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  listarNotificaciones,
  marcarNotificacionLeida,
} from '../../src/modules/orders/services/order-notifications.service'
import {
  comprobarRespuesta,
  enviarSolicitudProtegida,
} from '../../src/services/http.service'

vi.mock('../../src/services/http.service', () => ({
  comprobarRespuesta: vi.fn(),
  enviarSolicitudProtegida: vi.fn(),
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function respuesta(): Response {
  return { status: 200 } as Response
}

describe('order-notifications.service', () => {
  it('lista y normaliza notificaciones recibidas desde la API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta()))
    vi.mocked(comprobarRespuesta).mockResolvedValue({
      notificaciones: [
        {
          id: 15,
          pedidoId: 23,
          titulo: 'Pedido recibido',
          mensaje: 'Tu pedido fue registrado.',
          leidaEn: null,
          creadaEn: '2026-10-29T12:00:00.000Z',
        },
        {
          id: 'notificacion-2',
          pedidoId: null,
          titulo: 'Pedido enviado',
          mensaje: 'Tu pedido está en camino.',
          leidaEn: '2026-10-29T13:00:00.000Z',
          creadaEn: '2026-10-29T12:30:00.000Z',
        },
      ],
    })

    await expect(listarNotificaciones()).resolves.toEqual([
      {
        id: '15',
        pedidoId: '23',
        titulo: 'Pedido recibido',
        mensaje: 'Tu pedido fue registrado.',
        leidaEn: null,
        creadaEn: '2026-10-29T12:00:00.000Z',
      },
      {
        id: 'notificacion-2',
        pedidoId: null,
        titulo: 'Pedido enviado',
        mensaje: 'Tu pedido está en camino.',
        leidaEn: '2026-10-29T13:00:00.000Z',
        creadaEn: '2026-10-29T12:30:00.000Z',
      },
    ])

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/orders/notifications',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      }),
    )
  })

  it.each([
    null,
    [],
    {},
    { notificaciones: null },
    { notificaciones: 'inválido' },
  ])('rechaza una respuesta con estructura inválida: %j', async (datos) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta()))
    vi.mocked(comprobarRespuesta).mockResolvedValue(datos)

    await expect(listarNotificaciones()).rejects.toThrow(
      'No se pudieron interpretar las notificaciones.',
    )
  })

  it.each([
    null,
    [],
    { id: true, titulo: 'Título', mensaje: 'Mensaje', creadaEn: '2026-10-29', pedidoId: null, leidaEn: null },
    { id: '1', titulo: 123, mensaje: 'Mensaje', creadaEn: '2026-10-29', pedidoId: null, leidaEn: null },
    { id: '1', titulo: 'Título', mensaje: false, creadaEn: '2026-10-29', pedidoId: null, leidaEn: null },
    { id: '1', titulo: 'Título', mensaje: 'Mensaje', creadaEn: 123, pedidoId: null, leidaEn: null },
    { id: '1', titulo: 'Título', mensaje: 'Mensaje', creadaEn: '2026-10-29', pedidoId: true, leidaEn: null },
    { id: '1', titulo: 'Título', mensaje: 'Mensaje', creadaEn: '2026-10-29', pedidoId: null, leidaEn: 123 },
  ])('rechaza una notificación inválida: %j', async (notificacion) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta()))
    vi.mocked(comprobarRespuesta).mockResolvedValue({
      notificaciones: [notificacion],
    })

    await expect(listarNotificaciones()).rejects.toThrow(
      'El servidor devolvió una notificación inválida.',
    )
  })

  it('propaga los errores al consultar las notificaciones', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Error de conexión')),
    )

    await expect(listarNotificaciones()).rejects.toThrow('Error de conexión')
  })

  it('marca una notificación como leída usando una solicitud protegida', async () => {
    vi.mocked(enviarSolicitudProtegida).mockResolvedValue(undefined)

    await expect(
      marcarNotificacionLeida('notificacion / 1'),
    ).resolves.toBeUndefined()

    expect(enviarSolicitudProtegida).toHaveBeenCalledWith(
      '/api/v1/orders/notifications/notificacion%20%2F%201/read',
      { metodo: 'PATCH' },
    )
  })

  it('propaga los errores al marcar una notificación como leída', async () => {
    vi.mocked(enviarSolicitudProtegida).mockRejectedValue(
      new Error('No autorizado'),
    )

    await expect(
      marcarNotificacionLeida('notificacion-1'),
    ).rejects.toThrow('No autorizado')
  })
})
