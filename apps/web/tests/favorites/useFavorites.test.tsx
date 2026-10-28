import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UsuarioAutenticado } from '../../src/modules/auth/types/auth.types'

const {
  obtenerFavoritosMock,
  agregarFavoritoMock,
  eliminarFavoritoMock,
} = vi.hoisted(() => ({
  obtenerFavoritosMock: vi.fn(),
  agregarFavoritoMock: vi.fn(),
  eliminarFavoritoMock: vi.fn(),
}))

vi.mock('../../src/modules/favorites/services/favorites.service', () => ({
  obtenerFavoritos: obtenerFavoritosMock,
  agregarFavorito: agregarFavoritoMock,
  eliminarFavorito: eliminarFavoritoMock,
}))

import { useFavorites } from '../../src/modules/favorites/hooks/useFavorites'

const usuario: UsuarioAutenticado = {
  id: 'usuario-1',
  nombre: 'Ana Pérez',
  correo: 'ana@example.com',
  rol: 'CLIENTE',
}

const otroUsuario: UsuarioAutenticado = {
  id: 'usuario-2',
  nombre: 'Luis Pérez',
  correo: 'luis@example.com',
  rol: 'CLIENTE',
}

afterEach(() => {
  vi.clearAllMocks()
})

beforeEach(() => {
  obtenerFavoritosMock.mockResolvedValue([])
  agregarFavoritoMock.mockResolvedValue(undefined)
  eliminarFavoritoMock.mockResolvedValue(undefined)
})

describe('useFavorites', () => {
  it('gestiona favoritos temporales para visitantes', async () => {
    const { result } = renderHook(() => useFavorites(null))

    await act(async () => {
      await result.current.alternarFavorito('1')
    })

    expect(result.current.favoritos).toEqual(['1'])
    expect(agregarFavoritoMock).not.toHaveBeenCalled()
    expect(obtenerFavoritosMock).not.toHaveBeenCalled()
  })

  it('carga favoritos de la cuenta al iniciar sesión', async () => {
    obtenerFavoritosMock.mockResolvedValue(['2'])

    const { result } = renderHook(() => useFavorites(usuario))

    await waitFor(() => {
      expect(result.current.favoritos).toEqual(['2'])
    })

    expect(obtenerFavoritosMock).toHaveBeenCalledTimes(1)
  })

  it('no fusiona favoritos temporales con los de la cuenta', async () => {
    obtenerFavoritosMock.mockResolvedValue(['2'])

    const { result, rerender } = renderHook(
      ({ sesion }) => useFavorites(sesion),
      { initialProps: { sesion: null as UsuarioAutenticado | null } },
    )

    await act(async () => {
      await result.current.alternarFavorito('1')
      await result.current.alternarFavorito('2')
    })

    expect(result.current.favoritos).toEqual(['1', '2'])

    rerender({ sesion: usuario })

    await waitFor(() => {
      expect(result.current.favoritos).toEqual(['2'])
    })

    expect(obtenerFavoritosMock).toHaveBeenCalledTimes(1)
    expect(agregarFavoritoMock).not.toHaveBeenCalled()
  })

  it('descarta los favoritos temporales al cerrar sesión', async () => {
    const { result, rerender } = renderHook(
      ({ sesion }) => useFavorites(sesion),
      { initialProps: { sesion: null as UsuarioAutenticado | null } },
    )

    await act(async () => {
      await result.current.alternarFavorito('1')
    })

    expect(result.current.favoritos).toEqual(['1'])

    rerender({ sesion: usuario })

    await waitFor(() => {
      expect(obtenerFavoritosMock).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(result.current.favoritos).toEqual([])
    })

    rerender({ sesion: null })

    await waitFor(() => {
      expect(result.current.favoritos).toEqual([])
    })

    expect(agregarFavoritoMock).not.toHaveBeenCalled()
  })

  it('aísla los favoritos al cambiar de una cuenta a otra', async () => {
    obtenerFavoritosMock
      .mockResolvedValueOnce(['1'])
      .mockResolvedValueOnce(['2'])

    const { result, rerender } = renderHook(
      ({ sesion }) => useFavorites(sesion),
      { initialProps: { sesion: usuario } },
    )

    await waitFor(() => {
      expect(result.current.favoritos).toEqual(['1'])
    })

    rerender({ sesion: otroUsuario })

    await waitFor(() => {
      expect(result.current.favoritos).toEqual(['2'])
    })

    expect(obtenerFavoritosMock).toHaveBeenCalledTimes(2)
  })

  it('agrega un favorito autenticado después de confirmarlo la API', async () => {
    const { result } = renderHook(() => useFavorites(usuario))

    await waitFor(() => {
      expect(obtenerFavoritosMock).toHaveBeenCalled()
    })

    await act(async () => {
      await result.current.alternarFavorito('3')
    })

    expect(agregarFavoritoMock).toHaveBeenCalledWith('3')
    expect(result.current.favoritos).toContain('3')
  })

  it('elimina un favorito autenticado después de confirmarlo la API', async () => {
    obtenerFavoritosMock.mockResolvedValue(['3'])

    const { result } = renderHook(() => useFavorites(usuario))

    await waitFor(() => {
      expect(result.current.favoritos).toEqual(['3'])
    })

    await act(async () => {
      await result.current.alternarFavorito('3')
    })

    expect(eliminarFavoritoMock).toHaveBeenCalledWith('3')
    expect(result.current.favoritos).toEqual([])
  })

  it('conserva el estado y notifica si falla una mutación', async () => {
    const notificarError = vi.fn()
    agregarFavoritoMock.mockRejectedValue(new Error('Error de red'))

    const { result } = renderHook(
      () => useFavorites(usuario, notificarError),
    )

    await waitFor(() => {
      expect(obtenerFavoritosMock).toHaveBeenCalled()
    })

    await act(async () => {
      await result.current.alternarFavorito('4')
    })

    expect(result.current.favoritos).toEqual([])
    expect(notificarError).toHaveBeenCalledWith(
      'No se pudo actualizar tu lista de favoritos.',
    )
  })

  it('notifica si falla la carga inicial', async () => {
    const notificarError = vi.fn()
    obtenerFavoritosMock.mockRejectedValue(new Error('Error de red'))

    renderHook(() => useFavorites(usuario, notificarError))

    await waitFor(() => {
      expect(notificarError).toHaveBeenCalledWith(
        'No se pudieron cargar tus favoritos.',
      )
    })
  })
})