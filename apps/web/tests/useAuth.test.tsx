import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from '../src/modules/auth/hooks/useAuth'
import {
    cerrarSesion,
    iniciarSesion,
    registrarUsuario,
} from '../src/modules/auth/services/auth.service'

vi.mock('../src/modules/auth/services/auth.service', () => ({
    cerrarSesion: vi.fn(),
    iniciarSesion: vi.fn(),
    registrarUsuario: vi.fn(),
}))

const usuario = {
    id: 'usuario-1',
    nombre: 'Ana Pérez',
    correo: 'ana@example.com',
    rol: 'CLIENTE' as const,
}

beforeEach(() => {
    vi.resetAllMocks()
})

describe('useAuth', () => {
    it('inicia sin usuario, sin errores y sin procesamiento', () => {
        const { result } = renderHook(() => useAuth())

        expect(result.current.usuario).toBeNull()
        expect(result.current.autenticado).toBe(false)
        expect(result.current.procesando).toBe(false)
        expect(result.current.error).toBe('')
    })

    it('inicia sesión correctamente', async () => {
        vi.mocked(iniciarSesion).mockResolvedValue({
            usuario,
            expiraEn: '2026-12-31T23:59:59.000Z',
        })

        const { result } = renderHook(() => useAuth())

        let correcto = false
        await act(async () => {
            correcto = await result.current.iniciarSesion({
                correo: usuario.correo,
                contrasena: 'Contrasena123',
            })
        })

        expect(correcto).toBe(true)
        expect(result.current.usuario).toEqual(usuario)
        expect(result.current.autenticado).toBe(true)
        expect(result.current.procesando).toBe(false)
        expect(result.current.error).toBe('')
    })

    it('gestiona un error al iniciar sesión', async () => {
        vi.mocked(iniciarSesion).mockRejectedValue(
            new Error('Credenciales incorrectas'),
        )

        const { result } = renderHook(() => useAuth())

        let correcto = true
        await act(async () => {
            correcto = await result.current.iniciarSesion({
                correo: usuario.correo,
                contrasena: 'incorrecta',
            })
        })

        expect(correcto).toBe(false)
        expect(result.current.usuario).toBeNull()
        expect(result.current.procesando).toBe(false)
        expect(result.current.error).toBe('Credenciales incorrectas')
    })

    it('registra un usuario correctamente', async () => {
        vi.mocked(registrarUsuario).mockResolvedValue({ usuario })

        const { result } = renderHook(() => useAuth())

        let correcto = false
        await act(async () => {
            correcto = await result.current.registrarUsuario({
                nombre: usuario.nombre,
                correo: usuario.correo,
                contrasena: 'Contrasena123',
            })
        })

        expect(correcto).toBe(true)
        expect(result.current.procesando).toBe(false)
        expect(result.current.error).toBe('')
        expect(result.current.usuario).toBeNull()
    })

    it('gestiona un error al registrar un usuario', async () => {
        vi.mocked(registrarUsuario).mockRejectedValue(
            new Error('El correo ya está registrado'),
        )

        const { result } = renderHook(() => useAuth())

        let correcto = true
        await act(async () => {
            correcto = await result.current.registrarUsuario({
                nombre: usuario.nombre,
                correo: usuario.correo,
                contrasena: 'Contrasena123',
            })
        })

        expect(correcto).toBe(false)
        expect(result.current.procesando).toBe(false)
        expect(result.current.error).toBe('El correo ya está registrado')
    })

    it('cierra sesión correctamente', async () => {
        vi.mocked(iniciarSesion).mockResolvedValue({
            usuario,
            expiraEn: '2026-12-31T23:59:59.000Z',
        })
        vi.mocked(cerrarSesion).mockResolvedValue(undefined)

        const { result } = renderHook(() => useAuth())

        await act(async () => {
            await result.current.iniciarSesion({
                correo: usuario.correo,
                contrasena: 'Contrasena123',
            })
        })

        let correcto = false
        await act(async () => {
            correcto = await result.current.cerrarSesion()
        })

        expect(correcto).toBe(true)
        expect(result.current.usuario).toBeNull()
        expect(result.current.autenticado).toBe(false)
        expect(result.current.procesando).toBe(false)
        expect(result.current.error).toBe('')
    })

    it('gestiona un error al cerrar sesión', async () => {
        vi.mocked(cerrarSesion).mockRejectedValue(
            new Error('No se pudo cerrar la sesión'),
        )

        const { result } = renderHook(() => useAuth())

        let correcto = true
        await act(async () => {
            correcto = await result.current.cerrarSesion()
        })

        expect(correcto).toBe(false)
        expect(result.current.procesando).toBe(false)
        expect(result.current.error).toBe('No se pudo cerrar la sesión')
    })

    it('limpia el error sin alterar los demás datos del estado', async () => {
        vi.mocked(iniciarSesion).mockRejectedValue(
            new Error('Error de prueba'),
        )

        const { result } = renderHook(() => useAuth())

        await act(async () => {
            await result.current.iniciarSesion({
                correo: usuario.correo,
                contrasena: 'incorrecta',
            })
        })

        act(() => {
            result.current.limpiarError()
        })

        expect(result.current.error).toBe('')
        expect(result.current.procesando).toBe(false)
        expect(result.current.usuario).toBeNull()
    })

    it('convierte errores de conexión en un mensaje comprensible', async () => {
        vi.mocked(iniciarSesion).mockRejectedValue(
            new TypeError('Failed to fetch'),
        )

        const { result } = renderHook(() => useAuth())

        await act(async () => {
            await result.current.iniciarSesion({
                correo: usuario.correo,
                contrasena: 'Contrasena123',
            })
        })

        expect(result.current.error).not.toBe('Failed to fetch')
        expect(result.current.error).not.toBe('')
    })
    it('usa un mensaje genérico cuando el error no contiene texto', async () => {
        vi.mocked(iniciarSesion).mockRejectedValue(new Error('   '))

        const { result } = renderHook(() => useAuth())

        await act(async () => {
            await result.current.iniciarSesion({
                correo: usuario.correo,
                contrasena: 'Contrasena123',
            })
        })

        expect(result.current.error).not.toBe('')
        expect(result.current.error).not.toBe('   ')
    })
})