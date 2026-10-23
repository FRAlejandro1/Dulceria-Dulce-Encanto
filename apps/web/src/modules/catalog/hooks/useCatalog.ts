import { useEffect, useState } from 'react'
import type {
  EstadoCarga,
  Producto,
} from '../../../types/catalogo.types'
import { obtenerProductosCatalogo } from '../services/catalog.service'

export function useCatalog() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [estadoCarga, setEstadoCarga] =
    useState<EstadoCarga>('cargando')
  const [intentoCarga, setIntentoCarga] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()

    async function cargarCatalogo() {
      setEstadoCarga('cargando')

      try {
        const catalogo = await obtenerProductosCatalogo(
          controlador.signal,
        )

        if (!controlador.signal.aborted) {
          setProductos(catalogo)
          setEstadoCarga('correcto')
        }
      } catch {
        if (!controlador.signal.aborted) {
          setEstadoCarga('error')
        }
      }
    }

    void cargarCatalogo()

    return () => {
      controlador.abort()
    }
  }, [intentoCarga])

  function reintentarCarga() {
    setIntentoCarga((intentoActual) => intentoActual + 1)
  }

  return {
    productos,
    estadoCarga,
    reintentarCarga,
  }
}
