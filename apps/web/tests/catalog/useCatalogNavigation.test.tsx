import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCatalogNavigation } from '../../src/modules/catalog/hooks/useCatalogNavigation'

describe('useCatalogNavigation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('restablece los filtros aunque window.scrollTo no esté disponible', () => {
    vi.stubGlobal('scrollTo', undefined)

    const restablecerFiltrosCatalogo = vi.fn()
    const setVistaCarrito = vi.fn()
    const setPanel = vi.fn()
    const setVerFavoritos = vi.fn()
    const setCategoria = vi.fn()

    const { result } = renderHook(() =>
      useCatalogNavigation({
        vistaCarrito: false,
        setVistaCarrito,
        setPanel,
        setVerFavoritos,
        setCategoria,
        restablecerFiltrosCatalogo,
      }),
    )

    expect(() => {
      act(() => {
        result.current.volverAlInicio()
      })
    }).not.toThrow()

    expect(restablecerFiltrosCatalogo).toHaveBeenCalledOnce()
    expect(setVistaCarrito).toHaveBeenCalledWith(false)
  })
})
