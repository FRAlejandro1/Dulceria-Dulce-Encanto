import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Producto } from '../../src/types/catalogo.types'
import { obtenerProductosCatalogo } from '../../src/modules/catalog/services/catalog.service'

const productoValido: Producto = {
  id: 'producto-1',
  nombre: 'Chocolate',
  descripcion: 'Chocolate de prueba',
  imagenUrl: null,
  categoria: {
    nombre: 'Dulces',
    slug: 'dulces',
  },
  variantes: [],
}

function respuestaJson(datos: unknown, ok = true) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(datos),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('obtenerProductosCatalogo', () => {
  it('obtiene y devuelve los productos válidos', async () => {
    const respuesta = respuestaJson({
      productos: [
        productoValido,
        null,
        'producto inválido',
        123,
        { ...productoValido, id: 123 },
        { ...productoValido, categoria: null },
        { ...productoValido, variantes: null },
      ],
    })
    const fetchMock = vi.fn().mockResolvedValue(respuesta)
    vi.stubGlobal('fetch', fetchMock)

    const controlador = new AbortController()
    const productos = await obtenerProductosCatalogo(controlador.signal)

    expect(productos).toEqual([productoValido])
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/catalog/products', {
      signal: controlador.signal,
      headers: { Accept: 'application/json' },
    })
  })

  it('lanza un error cuando la respuesta HTTP no es correcta', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaJson({}, false)))

    await expect(
      obtenerProductosCatalogo(new AbortController().signal),
    ).rejects.toThrow('No se pudo cargar el catálogo.')
  })

  it('rechaza una respuesta que no contiene un arreglo de productos', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaJson({ productos: {} })))

    await expect(
      obtenerProductosCatalogo(new AbortController().signal),
    ).rejects.toThrow('La respuesta del catálogo no tiene un formato válido.')
  })

  it('rechaza una respuesta nula', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaJson(null)))

    await expect(
      obtenerProductosCatalogo(new AbortController().signal),
    ).rejects.toThrow('La respuesta del catálogo no tiene un formato válido.')
  })

  it('propaga los errores de la petición', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Error de conexión')),
    )

    await expect(
      obtenerProductosCatalogo(new AbortController().signal),
    ).rejects.toThrow('Error de conexión')
  })

  it('propaga los errores al interpretar el JSON', async () => {
    const respuesta = {
      ok: true,
      json: vi.fn().mockRejectedValue(new Error('JSON inválido')),
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta))

    await expect(
      obtenerProductosCatalogo(new AbortController().signal),
    ).rejects.toThrow('JSON inválido')
  })
})