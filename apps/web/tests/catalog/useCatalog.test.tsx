import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Producto } from '../../src/types/catalogo.types'
import { obtenerProductosCatalogo } from '../../src/modules/catalog/services/catalog.service'
import { useCatalog } from '../../src/modules/catalog/hooks/useCatalog'

vi.mock('../../src/modules/catalog/services/catalog.service', () => ({
  obtenerProductosCatalogo: vi.fn(),
}))

const obtenerProductosMock = vi.mocked(obtenerProductosCatalogo)

const productoPrueba: Producto = {
  id: 'producto-1',
  nombre: 'Chocolate',
  descripcion: 'Chocolate de prueba',
  imagenUrl: null,
  categoria: {
    nombre: 'Chocolates',
    slug: 'chocolates',
  },
  variantes: [],
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useCatalog', () => {
  it('ignora el resultado de una petición que termina después de desmontar el hook', async () => {
    let resolverPeticion: ((productos: Producto[]) => void) | undefined

    obtenerProductosMock.mockImplementation(
      () =>
        new Promise<Producto[]>((resolve) => {
          resolverPeticion = resolve
        }),
    )

    const { unmount } = renderHook(() => useCatalog())

    await waitFor(() => {
      expect(resolverPeticion).toBeDefined()
    })

    unmount()

    await act(async () => {
      resolverPeticion?.([productoPrueba])
      await Promise.resolve()
    })

    expect(obtenerProductosMock).toHaveBeenCalledOnce()
  })

  it('inicia la carga y almacena los productos cuando la petición termina correctamente', async () => {
    obtenerProductosMock.mockResolvedValue([productoPrueba])

    const { result } = renderHook(() => useCatalog())

    expect(result.current.estadoCarga).toBe('cargando')
    expect(result.current.productos).toEqual([])

    await waitFor(() => {
      expect(result.current.estadoCarga).toBe('correcto')
    })

    expect(result.current.productos).toEqual([productoPrueba])
    expect(obtenerProductosMock).toHaveBeenCalledOnce()
    expect(obtenerProductosMock.mock.calls[0]?.[0]).toBeInstanceOf(
      AbortSignal,
    )
  })

  it('establece el estado de error cuando la petición falla', async () => {
    obtenerProductosMock.mockRejectedValue(new Error('Error de conexión'))

    const { result } = renderHook(() => useCatalog())

    await waitFor(() => {
      expect(result.current.estadoCarga).toBe('error')
    })

    expect(result.current.productos).toEqual([])
  })

  it('vuelve a cargar el catálogo cuando se solicita un reintento', async () => {
    obtenerProductosMock
      .mockRejectedValueOnce(new Error('Error de conexión'))
      .mockResolvedValueOnce([productoPrueba])

    const { result } = renderHook(() => useCatalog())

    await waitFor(() => {
      expect(result.current.estadoCarga).toBe('error')
    })

    act(() => {
      result.current.reintentarCarga()
    })

    await waitFor(() => {
      expect(result.current.estadoCarga).toBe('correcto')
    })

    expect(result.current.productos).toEqual([productoPrueba])
    expect(obtenerProductosMock).toHaveBeenCalledTimes(2)
  })

  it('aborta la petición cuando el hook se desmonta', async () => {
    let signal: AbortSignal | undefined

    obtenerProductosMock.mockImplementation((signalPeticion) => {
      signal = signalPeticion

      return new Promise<Producto[]>(() => {
        // Mantiene la petición pendiente hasta que se desmonte el hook.
      })
    })

    const { unmount } = renderHook(() => useCatalog())

    await waitFor(() => {
      expect(signal).toBeDefined()
    })

    unmount()

    expect(signal?.aborted).toBe(true)
  })

  it('ignora el error de una petición que se cancela al desmontar', async () => {
    let rechazarPeticion: ((error: Error) => void) | undefined

    obtenerProductosMock.mockImplementation(
      () =>
        new Promise<Producto[]>((_resolve, reject) => {
          rechazarPeticion = reject
        }),
    )

    const { unmount } = renderHook(() => useCatalog())

    await waitFor(() => {
      expect(rechazarPeticion).toBeDefined()
    })

    unmount()

    await act(async () => {
      rechazarPeticion?.(new Error('Petición cancelada'))
      await Promise.resolve()
    })

    expect(obtenerProductosMock).toHaveBeenCalledOnce()
  })
})