
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { UsuarioAutenticado } from '../../src/modules/auth/types/auth.types'
import {
  listarNotificaciones,
  marcarNotificacionLeida,
} from '../../src/modules/orders/services/order-notifications.service'
import { useOrderNotifications } from '../../src/modules/orders/hooks/useOrderNotifications'

vi.mock('../../src/modules/orders/services/order-notifications.service', () => ({
  listarNotificaciones: vi.fn(),
  marcarNotificacionLeida: vi.fn(),
}))

afterEach(() => {
  vi.restoreAllMocks()
})

const usuario: UsuarioAutenticado = {
  id: 'usuario-1',
  nombre: 'Usuario de prueba',
  correo: 'usuario@example.com',
  rol: 'CLIENTE',
}

const notificaciones = [
  {
    id: 'notificacion-1',
    pedidoId: 'pedido-1',
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
]

describe('useOrderNotifications', () => {
  it('limpia las notificaciones y no consulta la API sin sesión', async () => {
    const { result } = renderHook(() => useOrderNotifications(null))

    await waitFor(() => {
      expect(result.current.cargandoNotificaciones).toBe(false)
    })

    expect(result.current.notificaciones).toEqual([])
    expect(result.current.errorNotificaciones).toBe('')
    expect(result.current.pendientes).toBe(0)
    expect(listarNotificaciones).not.toHaveBeenCalled()
  })

  it('carga las notificaciones y calcula las pendientes', async () => {
    vi.mocked(listarNotificaciones).mockResolvedValue(notificaciones)

    const { result } = renderHook(() => useOrderNotifications(usuario))

    expect(result.current.cargandoNotificaciones).toBe(true)

    await waitFor(() => {
      expect(result.current.cargandoNotificaciones).toBe(false)
    })

    expect(result.current.notificaciones).toEqual(notificaciones)
    expect(result.current.pendientes).toBe(1)
    expect(result.current.errorNotificaciones).toBe('')
  })

  it('muestra el error cuando falla la carga con un Error', async () => {
    vi.mocked(listarNotificaciones).mockRejectedValue(
      new Error('No hay conexión'),
    )

    const { result } = renderHook(() => useOrderNotifications(usuario))

    await waitFor(() => {
      expect(result.current.errorNotificaciones).toBe('No hay conexión')
    })

    expect(result.current.cargandoNotificaciones).toBe(false)
  })

  it('muestra un mensaje genérico cuando la carga falla con un valor no Error', async () => {
    vi.mocked(listarNotificaciones).mockRejectedValue('fallo')

    const { result } = renderHook(() => useOrderNotifications(usuario))

    await waitFor(() => {
      expect(result.current.errorNotificaciones).toBe(
        'No se pudieron cargar las notificaciones.',
      )
    })

    expect(result.current.cargandoNotificaciones).toBe(false)
  })

  it('permite reintentar la carga y actualiza las notificaciones', async () => {
    vi.mocked(listarNotificaciones)
      .mockRejectedValueOnce(new Error('Error temporal'))
      .mockResolvedValueOnce(notificaciones)

    const { result } = renderHook(() => useOrderNotifications(usuario))

    await waitFor(() => {
      expect(result.current.errorNotificaciones).toBe('Error temporal')
    })

    await act(async () => {
      await result.current.cargarNotificaciones()
    })

    expect(result.current.notificaciones).toEqual(notificaciones)
    expect(result.current.errorNotificaciones).toBe('')
    expect(listarNotificaciones).toHaveBeenCalledTimes(2)
  })

  it('marca una notificación como leída y actualiza las pendientes', async () => {
    vi.mocked(listarNotificaciones).mockResolvedValue(notificaciones)
    vi.mocked(marcarNotificacionLeida).mockResolvedValue(undefined)

    const { result } = renderHook(() => useOrderNotifications(usuario))

    await waitFor(() => {
      expect(result.current.pendientes).toBe(1)
    })

    await act(async () => {
      await result.current.marcarComoLeida('notificacion-1')
    })

    expect(marcarNotificacionLeida).toHaveBeenCalledWith('notificacion-1')
    expect(result.current.notificaciones[0].leidaEn).toBeTruthy()
    expect(result.current.pendientes).toBe(0)
  })

  it('conserva las notificaciones y registra el error si falla el marcado', async () => {
    vi.mocked(listarNotificaciones).mockResolvedValue(notificaciones)
    vi.mocked(marcarNotificacionLeida).mockRejectedValue(
      new Error('No se pudo actualizar'),
    )

    const { result } = renderHook(() => useOrderNotifications(usuario))

    await waitFor(() => {
      expect(result.current.pendientes).toBe(1)
    })

    await act(async () => {
      await result.current.marcarComoLeida('notificacion-1')
    })

    expect(result.current.errorNotificaciones).toBe('No se pudo actualizar')
    expect(result.current.notificaciones[0].leidaEn).toBeNull()
    expect(result.current.pendientes).toBe(1)
  })

  it('muestra un error genérico si falla el marcado con un valor no Error', async () => {
    vi.mocked(listarNotificaciones).mockResolvedValue(notificaciones)
    vi.mocked(marcarNotificacionLeida).mockRejectedValue('fallo')

    const { result } = renderHook(() => useOrderNotifications(usuario))

    await waitFor(() => {
      expect(result.current.pendientes).toBe(1)
    })

    await act(async () => {
      await result.current.marcarComoLeida('notificacion-1')
    })

    expect(result.current.errorNotificaciones).toBe(
      'No se pudo marcar la notificación como leída.',
    )
  })
})
