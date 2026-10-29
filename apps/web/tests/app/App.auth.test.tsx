import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest'

import App from '../../src/App'

const usuarioPrueba = {
    id: 'usuario-1',
    nombre: 'Ana Pérez',
    correo: 'ana@example.com',
    rol: 'CLIENTE',
}

function respuesta(
    datos: unknown,
    status = 200,
    ok = true,
): Response {
    return {
        ok,
        status,
        json: async () => datos,
    } as Response
}

function configurarFetchAutenticacion(
    resultadoLogin: Response = respuesta({
        usuario: usuarioPrueba,
        expiraEn: '2027-01-01T00:00:00.000Z',
    }),
    resultadoLogout: Response = respuesta(undefined, 204),
) {
    const fetchSimulado = vi.fn(
        async (entrada: RequestInfo | URL): Promise<Response> => {
            const ruta = String(entrada)

            if (ruta === '/api/v1/catalog/products') {
                return respuesta({ productos: [] })
            }

            if (ruta === '/api/v1/auth/csrf') {
                return respuesta({ csrfToken: 'token-csrf-prueba' })
            }

            if (ruta === '/api/v1/auth/login') {
                return resultadoLogin
            }

            if (ruta === '/api/v1/auth/logout') {
                return resultadoLogout
            }

            if (ruta === '/api/v1/users') {
                return respuesta({ usuario: usuarioPrueba }, 201)
            }

            return respuesta({ error: 'Ruta no encontrada.' }, 404, false)
        },
    )

    vi.stubGlobal('fetch', fetchSimulado)

    return fetchSimulado
}

async function abrirDialogoAutenticacion() {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Abrir perfil' }))

    return screen.findByRole('dialog')
}

async function enviarInicioSesion() {
    fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
        target: { value: ' ANA@EXAMPLE.COM ' },
    })

    fireEvent.change(screen.getByLabelText(/contraseña/i), {
        target: { value: 'ContrasenaSegura123' },
    })

    const botones = screen.getAllByRole('button', {
        name: /iniciar sesión/i,
    })

    fireEvent.click(botones[botones.length - 1])
}

async function iniciarSesionYReabrirPerfil() {
    await abrirDialogoAutenticacion()
    await enviarInicioSesion()

    await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Abrir perfil' }))

    expect(
        await screen.findByRole('button', { name: 'Cerrar sesión' }),
    ).toBeTruthy()
}

describe('Integración de autenticación en App', () => {
    beforeEach(() => {
        configurarFetchAutenticacion()
    })

    afterEach(() => {
        cleanup()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('inicia sesión, actualiza el perfil y muestra el aviso correspondiente', async () => {
        const fetchSimulado = configurarFetchAutenticacion()

        await abrirDialogoAutenticacion()
        await enviarInicioSesion()

        expect(await screen.findByText('Ana Pérez')).toBeTruthy()

        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: 'Abrir perfil' }).textContent,
            ).toContain('Ana Pérez')
        })

        await waitFor(() => {
            expect(
                screen.getByRole('status').textContent,
            ).toContain('Sesión iniciada como Ana Pérez')
        })
        expect(fetchSimulado).toHaveBeenCalledWith(
            '/api/v1/auth/csrf',
            expect.objectContaining({ method: 'GET' }),
        )

        expect(fetchSimulado).toHaveBeenCalledWith(
            '/api/v1/auth/login',
            expect.objectContaining({
                method: 'POST',
                credentials: 'include',
                headers: expect.objectContaining({
                    'X-CSRF-Token': 'token-csrf-prueba',
                }),
            }),
        )

        expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('mantiene el diálogo abierto y muestra el error cuando falla el login', async () => {
        configurarFetchAutenticacion(
            respuesta({ error: 'Credenciales incorrectas.' }, 401, false),
        )

        await abrirDialogoAutenticacion()
        await enviarInicioSesion()

        expect(
            await screen.findByText('Credenciales incorrectas.'),
        ).toBeTruthy()

        expect(screen.getByRole('dialog')).toBeTruthy()
        expect(screen.getByLabelText(/correo electrónico/i)).toBeTruthy()
    })

    it('cierra la sesión y conserva el comportamiento temporal de favoritos y carrito', async () => {
        const fetchSimulado = configurarFetchAutenticacion()

        await iniciarSesionYReabrirPerfil()

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

        await waitFor(() => {
            expect(fetchSimulado).toHaveBeenCalledWith(
                '/api/v1/auth/logout',
                expect.objectContaining({
                    method: 'POST',
                    credentials: 'include',
                    headers: expect.objectContaining({
                        'X-CSRF-Token': 'token-csrf-prueba',
                    }),
                }),
            )
        })

        expect(
            await screen.findByText(
                'Has cerrado sesión. Tus favoritos y carrito siguen siendo temporales.',
            ),
        ).toBeTruthy()
    })

    it('muestra un error si falla la solicitud de cierre de sesión', async () => {
        configurarFetchAutenticacion(
            respuesta({
                usuario: usuarioPrueba,
                expiraEn: '2027-01-01T00:00:00.000Z',
            }),
            respuesta({ error: 'No se pudo cerrar la sesión.' }, 500, false),
        )

        await iniciarSesionYReabrirPerfil()

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

        expect(
            await screen.findByText('No se pudo cerrar la sesión.'),
        ).toBeTruthy()

        expect(screen.getByRole('dialog')).toBeTruthy()
        expect(
            screen.getByRole('button', { name: 'Cerrar sesión' }),
        ).toBeTruthy()
    })

    it('crea un pedido y recarga el catálogo', async () => {
        const producto = {
            id: 'caramelos-surtidos',
            nombre: 'Caramelos surtidos',
            descripcion: 'Caramelos de diferentes sabores.',
            categoria: { nombre: 'Caramelos', slug: 'caramelos' },
            variantes: [
                {
                    id: 'var-caramelos',
                    nombre: 'Unidad',
                    sku: 'CAR-001',
                    precio: '0.50',
                    stockDisponible: 40,
                },
            ],
        }

        let solicitudesCatalogo = 0

        const fetchSimulado = configurarFetchAutenticacion()

        fetchSimulado.mockImplementation(
            async (
                entrada: RequestInfo | URL,
                opciones?: RequestInit,
            ): Promise<Response> => {
                const ruta = String(entrada)

                if (ruta === '/api/v1/catalog/products') {
                    solicitudesCatalogo += 1
                    return respuesta({ productos: [producto] })
                }

                if (ruta === '/api/v1/auth/csrf') {
                    return respuesta({ csrfToken: 'token-csrf-prueba' })
                }

                if (ruta === '/api/v1/auth/login') {
                    return respuesta({
                        usuario: usuarioPrueba,
                        expiraEn: '2027-01-01T00:00:00.000Z',
                    })
                }

                if (ruta === '/api/v1/orders' && opciones?.method === 'POST') {
                    return respuesta(
                        {
                            pedido: {
                                id: 'pedido-1',
                                numero: 'PED-001',
                                estado: 'PENDIENTE',
                                subtotal: 0.5,
                                total: 0.5,
                            },
                        },
                        201,
                    )
                }

                return respuesta(
                    { error: 'Ruta no encontrada.' },
                    404,
                    false,
                )
            },
        )

        render(<App />)

        await screen.findByRole('heading', { name: 'Caramelos surtidos' })

        fireEvent.click(
            screen.getByRole('button', { name: /agregar/i }),
        )

        fireEvent.click(
            screen.getByRole('button', { name: /^Carrito, 1 productos$/i }),
        )

        fireEvent.click(
            screen.getByRole('button', { name: /finalizar pedido/i }),
        )

        fireEvent.click(
            await screen.findByRole('button', { name: 'Abrir perfil' }),
        )

        await screen.findByRole('dialog')
        await enviarInicioSesion()

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).toBeNull()
        })

        fireEvent.click(
            screen.getByRole('button', { name: /^Carrito, 1 productos$/i }),
        )

        fireEvent.click(
            screen.getByRole('button', { name: /finalizar pedido/i }),
        )

        fireEvent.click(
            await screen.findByRole('button', { name: 'Confirmar pedido' }),
        )

        expect(
            await screen.findByText('Pedido PED-001 creado correctamente.'),
        ).toBeTruthy()

        await waitFor(() => {
            expect(solicitudesCatalogo).toBeGreaterThanOrEqual(2)
        })

        expect(fetchSimulado).toHaveBeenCalledWith(
            '/api/v1/orders',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'X-CSRF-Token': 'token-csrf-prueba',
                }),
            }),
        )

        expect(
            screen.queryByRole('heading', { name: 'Finalizar pedido' }),
        ).toBeNull()
    })

    it('abre el panel administrativo al iniciar sesión como ADMIN', async () => {
        const usuarioAdmin = {
            id: 'admin-1',
            nombre: 'Administradora',
            correo: 'admin@example.com',
            rol: 'ADMIN' as const,
        }

        const fetchSimulado = configurarFetchAutenticacion(
            respuesta({
                usuario: usuarioAdmin,
                expiraEn: '2027-01-01T00:00:00.000Z',
            }),
        )

        fetchSimulado.mockImplementation(
            async (entrada: RequestInfo | URL): Promise<Response> => {
                const ruta = String(entrada)

                if (ruta === '/api/v1/catalog/products') {
                    return respuesta({ productos: [] })
                }

                if (ruta === '/api/v1/auth/csrf') {
                    return respuesta({ csrfToken: 'token-csrf-prueba' })
                }

                if (ruta === '/api/v1/auth/login') {
                    return respuesta({
                        usuario: usuarioAdmin,
                        expiraEn: '2027-01-01T00:00:00.000Z',
                    })
                }

                if (ruta === '/api/v1/admin/products') {
                    return respuesta({ productos: [] })
                }

                if (ruta === '/api/v1/admin/categories') {
                    return respuesta({ categorias: [] })
                }

                return respuesta({ error: 'Ruta no encontrada.' }, 404, false)
            },
        )

        await abrirDialogoAutenticacion()
        await enviarInicioSesion()

        expect(
            await screen.findByText(
                'Sesión administrativa iniciada como Administradora.',
            ),
        ).toBeTruthy()

        expect(
            await screen.findByRole('heading', { name: 'Inventario' }),
        ).toBeTruthy()

        await waitFor(() => {
            expect(fetchSimulado).toHaveBeenCalledWith(
                '/api/v1/admin/products',
                expect.objectContaining({ method: 'GET' }),
            )
            expect(fetchSimulado).toHaveBeenCalledWith(
                '/api/v1/admin/categories',
                expect.objectContaining({ method: 'GET' }),
            )
        })

        fireEvent.click(
            screen.getByRole('button', { name: 'Volver a la tienda' }),
        )

        expect(
            await screen.findByRole('heading', { name: 'Nuestros productos' }),
        ).toBeTruthy()
    })



})
