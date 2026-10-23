import { useCallback, useEffect, useRef } from 'react'

type Panel = 'ninguno' | 'notificaciones' | 'perfil'

interface UseCatalogNavigationParams {
  vistaCarrito: boolean
  setVistaCarrito: (visible: boolean) => void
  setPanel: (panel: Panel) => void
  setVerFavoritos: (actualizar: (actual: boolean) => boolean) => void
  setCategoria: (categoria: string) => void
  restablecerFiltrosCatalogo: () => void
}

function desplazarAProductos(): void {
  const elemento = document.getElementById('productos')

  if (typeof elemento?.scrollIntoView === 'function') {
    elemento.scrollIntoView({
      behavior: 'auto',
      block: 'start',
    })
  }
}

function desplazarAlInicio(): void {
  if (typeof window.scrollTo === 'function') {
    window.scrollTo({
      top: 0,
      behavior: 'auto',
    })
  }
}

export function useCatalogNavigation({
  vistaCarrito,
  setVistaCarrito,
  setPanel,
  setVerFavoritos,
  setCategoria,
  restablecerFiltrosCatalogo,
}: UseCatalogNavigationParams) {
  const destinoPendiente = useRef(false)

  useEffect(() => {
    if (vistaCarrito || !destinoPendiente.current) {
      return
    }

    desplazarAProductos()
    destinoPendiente.current = false
  }, [vistaCarrito])

  const restablecerFiltros = useCallback(() => {
    destinoPendiente.current = false
    restablecerFiltrosCatalogo()
    setVistaCarrito(false)
  }, [restablecerFiltrosCatalogo, setVistaCarrito])

  const navegarAProductos = useCallback(
    (restablecerCategoria: boolean) => {
      setPanel('ninguno')
      setVerFavoritos(() => false)

      if (restablecerCategoria) {
        setCategoria('Todos')
      }

      if (vistaCarrito) {
        destinoPendiente.current = true
        setVistaCarrito(false)
        return
      }

      destinoPendiente.current = false
      desplazarAProductos()
    },
    [
      vistaCarrito,
      setPanel,
      setVerFavoritos,
      setCategoria,
      setVistaCarrito,
    ],
  )

  const volverAlInicio = useCallback(() => {
    restablecerFiltros()
    desplazarAlInicio()
  }, [restablecerFiltros])

  const abrirCarrito = useCallback(() => {
    setPanel('ninguno')
    destinoPendiente.current = false
    setVistaCarrito(true)
  }, [setPanel, setVistaCarrito])

  const cerrarCarrito = useCallback(() => {
    destinoPendiente.current = false
    setVistaCarrito(false)
  }, [setVistaCarrito])

  const alternarFavoritos = useCallback(() => {
    destinoPendiente.current = false
    setVistaCarrito(false)
    setVerFavoritos((actual) => !actual)
  }, [setVistaCarrito, setVerFavoritos])

  return {
    restablecerFiltros,
    navegarAProductos,
    volverAlInicio,
    abrirCarrito,
    cerrarCarrito,
    alternarFavoritos,
  }
}
