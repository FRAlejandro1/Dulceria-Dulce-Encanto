import { afterEach, describe, expect, it, vi } from 'vitest'

import {
    cerrarSesion,
    iniciarSesion,
    registrarUsuario,
} from '../src/modules/auth/services/auth.service'
import { RUTAS_AUTENTICACION } from '../src/modules/auth/constants/auth.constants'

const usuario = {
    id: 'usuario-1',
    nombre: 'Ana Pérez',
    correo: 'ana@example.com',
    rol: 'CLIENTE' as const,
}

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

describe('auth.service', () => {
    it('inicia sesión con CSRF y devuelve los datos de usuario', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(respuestaJson({ csrfToken: 'csrf-prueba' }))
            .mockResolvedValueOnce(respuestaJson({
                usuario,
                expiraEn: '2026-12-31T23:59:59.000Z',
            }))

        vi.stubGlobal('fetch', fetchMock)

        const resultado = await iniciarSesion({
            correo: usuario.correo,
            contrasena: 'Contrasena123',
        })

        expect(resultado).toEqual({
            usuario,
            expiraEn: '2026-12-31T23:59:59.000Z',
        })
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            RUTAS_AUTENTICACION.csrf,
            expect.objectContaining({
                method: 'GET',
                credentials: 'include',
            }),
        )
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            RUTAS_AUTENTICACION.login,
            expect.objectContaining({
                method: 'POST',
                credentials: 'include',
                headers: expect.objectContaining({
                    'X-CSRF-Token': 'csrf-prueba',
                    'Content-Type': 'application/json',
                }),
                body: JSON.stringify({
                    correo: usuario.correo,
                    contrasena: 'Contrasena123',
                }),
            }),
        )
    })

    it('rechaza un token CSRF ausente o inválido', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(respuestaJson({ csrfToken: '' })),
        )

        await expect(iniciarSesion({
            correo: usuario.correo,
            contrasena: 'Contrasena123',
        })).rejects.toThrow('No se pudo obtener el token de seguridad.')
    })

    it('rechaza una respuesta HTTP de error con mensaje del servidor', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn()
                .mockResolvedValueOnce(respuestaJson({ csrfToken: 'csrf-prueba' }))
                .mockResolvedValueOnce(respuestaJson(
                    { error: 'Credenciales incorrectas' },
                    { status: 401, ok: false },
                )),
        )

        await expect(iniciarSesion({
            correo: usuario.correo,
            contrasena: 'incorrecta',
        })).rejects.toThrow('Credenciales incorrectas')
    })

    it('rechaza una respuesta HTTP de error sin mensaje válido', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn()
                .mockResolvedValueOnce(respuestaJson({ csrfToken: 'csrf-prueba' }))
                .mockResolvedValueOnce(respuestaJson(
                    { error: 123 },
                    { status: 500, ok: false },
                )),
        )

        await expect(iniciarSesion({
            correo: usuario.correo,
            contrasena: 'Contrasena123',
        })).rejects.toThrow('No se pudo procesar la solicitud.')
    })

    it('rechaza JSON inválido', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                status: 200,
                ok: true,
                json: vi.fn().mockRejectedValue(new Error('JSON inválido')),
            }),
        )

        await expect(iniciarSesion({
            correo: usuario.correo,
            contrasena: 'Contrasena123',
        })).rejects.toThrow('El servidor devolvió una respuesta inválida.')
    })

    it('rechaza datos de usuario inválidos al iniciar sesión', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn()
                .mockResolvedValueOnce(respuestaJson({ csrfToken: 'csrf-prueba' }))
                .mockResolvedValueOnce(respuestaJson({
                    usuario: { ...usuario, rol: 'DESCONOCIDO' },
                    expiraEn: '2026-12-31',
                })),
        )

        await expect(iniciarSesion({
            correo: usuario.correo,
            contrasena: 'Contrasena123',
        })).rejects.toThrow('El servidor devolvió datos de usuario inválidos.')
    })

    it('rechaza una sesión sin fecha de expiración válida', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn()
                .mockResolvedValueOnce(respuestaJson({ csrfToken: 'csrf-prueba' }))
                .mockResolvedValueOnce(respuestaJson({ usuario, expiraEn: 123 })),
        )

        await expect(iniciarSesion({
            correo: usuario.correo,
            contrasena: 'Contrasena123',
        })).rejects.toThrow('El servidor devolvió una sesión inválida.')
    })

    it('registra un usuario y envía el cuerpo JSON esperado', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            respuestaJson({ usuario }),
        )
        vi.stubGlobal('fetch', fetchMock)

        const entrada = {
            nombre: usuario.nombre,
            correo: usuario.correo,
            contrasena: 'Contrasena123',
        }

        await expect(registrarUsuario(entrada)).resolves.toEqual({ usuario })

        expect(fetchMock).toHaveBeenCalledWith(
            RUTAS_AUTENTICACION.registro,
            expect.objectContaining({
                method: 'POST',
                credentials: 'include',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                }),
                body: JSON.stringify(entrada),
            }),
        )
    })

    it('rechaza datos de usuario inválidos al registrarse', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(respuestaJson({ usuario: null })),
        )

        await expect(registrarUsuario({
            nombre: usuario.nombre,
            correo: usuario.correo,
            contrasena: 'Contrasena123',
        })).rejects.toThrow('El servidor devolvió datos de usuario inválidos.')
    })

    it('cierra sesión con CSRF sin enviar un cuerpo', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(respuestaJson({ csrfToken: 'csrf-prueba' }))
            .mockResolvedValueOnce({
                status: 204,
                ok: true,
                json: vi.fn(),
            })

        vi.stubGlobal('fetch', fetchMock)

        await expect(cerrarSesion()).resolves.toBeUndefined()

        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            RUTAS_AUTENTICACION.logout,
            expect.objectContaining({
                method: 'POST',
                credentials: 'include',
                headers: expect.objectContaining({
                    'X-CSRF-Token': 'csrf-prueba',
                }),
            }),
        )
        expect(fetchMock.mock.calls[1][1]).not.toHaveProperty('body')
    })
})
