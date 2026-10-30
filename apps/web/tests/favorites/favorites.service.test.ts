import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  agregarFavorito,
  eliminarFavorito,
  obtenerFavoritos,
} from '../../src/modules/favorites/services/favorites.service'

function respuestaJson(
  datos: unknown,
  opciones: { status?: number; ok?: boolean } = {},
): Response {
  return {
    status: opciones.status ?? 200,
    ok: opciones.ok ?? true,
    json: vi.fn().mockResolvedValue(datos),
  } as unknown as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('obtenerFavoritos', () => {
  it('devuelve los identificadores de favoritos', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      respuestaJson({ favoritos: ['1', '2'] }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(obtenerFavoritos()).resolves.toEqual(['1', '2'])

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/favorites', {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
  })

  it('rechaza respuestas con estructura inválida', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respuestaJson({ favoritos: [1] })),
    )

    await expect(obtenerFavoritos()).rejects.toThrow(
      'La respuesta de favoritos no tiene un formato válido.',
    )
  })

  it('propaga los errores HTTP del servidor', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respuestaJson({ error: 'No autenticado' }, {
          status: 401,
          ok: false,
        }),
      ),
    )

    await expect(obtenerFavoritos()).rejects.toThrow('No autenticado')
  })
})

describe('agregarFavorito', () => {
  it('envía una solicitud POST protegida con CSRF', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(respuestaJson({ csrfToken: 'csrf-prueba' }))
      .mockResolvedValueOnce(respuestaJson({ mensaje: 'Agregado' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(agregarFavorito('12')).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/favorites/12',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({
          'X-CSRF-Token': 'csrf-prueba',
        }),
      }),
    )
  })
})

describe('eliminarFavorito', () => {
  it('envía una solicitud DELETE protegida con CSRF', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(respuestaJson({ csrfToken: 'csrf-prueba' }))
      .mockResolvedValueOnce({
        status: 204,
        ok: true,
        json: vi.fn(),
      })
    vi.stubGlobal('fetch', fetchMock)

    await expect(eliminarFavorito('12')).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/favorites/12',
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'include',
        headers: expect.objectContaining({
          'X-CSRF-Token': 'csrf-prueba',
        }),
      }),
    )
  })
})
