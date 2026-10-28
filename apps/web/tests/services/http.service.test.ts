import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  comprobarRespuesta,
  enviarSolicitudProtegida,
  leerRespuestaJson,
} from '../../src/services/http.service'

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

function prepararFetchProtegido(
  respuestaFinal: Response,
) {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(respuestaJson({ csrfToken: 'csrf-prueba' }))
    .mockResolvedValueOnce(respuestaFinal)

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('http.service', () => {
  describe('leerRespuestaJson', () => {
    it('devuelve el JSON de una respuesta válida', async () => {
      const datos = { mensaje: 'Correcto' }

      await expect(
        leerRespuestaJson(respuestaJson(datos)),
      ).resolves.toEqual(datos)
    })

    it('rechaza el JSON inválido', async () => {
      const respuesta = {
        json: vi.fn().mockRejectedValue(new Error('JSON inválido')),
      } as unknown as Response

      await expect(leerRespuestaJson(respuesta))
        .rejects.toThrow('El servidor devolvió una respuesta inválida.')
    })
  })

  describe('comprobarRespuesta', () => {
    it('devuelve undefined para respuestas 204 sin leer JSON', async () => {
      const respuesta = {
        status: 204,
        ok: true,
        json: vi.fn(),
      } as unknown as Response

      await expect(comprobarRespuesta(respuesta))
        .resolves.toBeUndefined()

      expect(respuesta.json).not.toHaveBeenCalled()
    })

    it('usa el mensaje de error devuelto por el servidor', async () => {
      await expect(
        comprobarRespuesta(
          respuestaJson(
            { error: 'No autorizado' },
            { status: 401, ok: false },
          ),
        ),
      ).rejects.toThrow('No autorizado')
    })

    it('usa un error genérico si la respuesta no incluye un error válido', async () => {
      await expect(
        comprobarRespuesta(
          respuestaJson(
            { error: 123 },
            { status: 500, ok: false },
          ),
        ),
      ).rejects.toThrow('No se pudo procesar la solicitud.')
    })
  })

  describe('enviarSolicitudProtegida', () => {
    it('envía una solicitud POST con JSON, CSRF y cookies', async () => {
      const fetchMock = prepararFetchProtegido(
        respuestaJson({ id: 'producto-1' }),
      )

      await expect(
        enviarSolicitudProtegida('/api/v1/admin/products', {
          metodo: 'POST',
          cuerpo: { nombre: 'Chocolate' },
        }),
      ).resolves.toEqual({ id: 'producto-1' })

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        '/api/v1/auth/csrf',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        }),
      )
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        '/api/v1/admin/products',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            'X-CSRF-Token': 'csrf-prueba',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ nombre: 'Chocolate' }),
        }),
      )
    })

    it('envía PATCH sin cuerpo cuando no se proporciona uno', async () => {
      const fetchMock = prepararFetchProtegido(
        respuestaJson({ mensaje: 'Actualizado' }),
      )

      await enviarSolicitudProtegida('/api/v1/admin/products/1', {
        metodo: 'PATCH',
      })

      expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
        method: 'PATCH',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'X-CSRF-Token': 'csrf-prueba',
        },
      })
      expect(fetchMock.mock.calls[1]?.[1]).not.toHaveProperty('body')
    })

    it('envía DELETE y acepta una respuesta 204', async () => {
      const fetchMock = prepararFetchProtegido({
        status: 204,
        ok: true,
        json: vi.fn(),
      } as unknown as Response)

      await expect(
        enviarSolicitudProtegida('/api/v1/admin/variants/1/images/2', {
          metodo: 'DELETE',
        }),
      ).resolves.toBeUndefined()

      expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': 'csrf-prueba',
        },
      })
    })

    it('envía FormData sin establecer Content-Type manualmente', async () => {
      const fetchMock = prepararFetchProtegido(
        respuestaJson({ imagen: { id: 'imagen-1' } }),
      )
      const formulario = new FormData()
      formulario.append('posicion', '1')

      await enviarSolicitudProtegida('/api/v1/admin/variants/1/images', {
        metodo: 'POST',
        cuerpo: formulario,
      })

      const opciones = fetchMock.mock.calls[1]?.[1] as RequestInit
      const encabezados = opciones.headers as Record<string, string>

      expect(opciones.body).toBe(formulario)
      expect(encabezados['X-CSRF-Token']).toBe('csrf-prueba')
      expect(encabezados).not.toHaveProperty('Content-Type')
    })

    it('rechaza un token CSRF ausente', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        respuestaJson({ csrfToken: '' }),
      )
      vi.stubGlobal('fetch', fetchMock)

      await expect(
        enviarSolicitudProtegida('/api/v1/admin/products', {
          metodo: 'POST',
          cuerpo: {},
        }),
      ).rejects.toThrow('No se pudo obtener el token de seguridad.')

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })
})
