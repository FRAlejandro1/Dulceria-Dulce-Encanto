import { describe, expect, it } from 'vitest'

import {
    validarInicioSesion,
    validarRegistro,
} from '../../src/modules/auth/schemas/auth.schemas'

describe('validarInicioSesion', () => {
    it('normaliza el correo y conserva la contraseña', () => {
        const resultado = validarInicioSesion({
            correo: '  ANA@EXAMPLE.COM  ',
            contrasena: 'ContrasenaSegura123',
        })

        expect(resultado).toEqual({
            datos: {
                correo: 'ana@example.com',
                contrasena: 'ContrasenaSegura123',
            },
            errores: {},
        })
    })

    it('rechaza el correo vacío', () => {
        const resultado = validarInicioSesion({
            correo: '   ',
            contrasena: 'ContrasenaSegura123',
        })

        expect(resultado.datos).toBeUndefined()
        expect(resultado.errores.correo).toBe(
            'Introduce un correo electrónico válido.',
        )
    })

    it.each([
        'correo-invalido',
        'usuario@',
        '@example.com',
        'usuario @example.com',
    ])('rechaza el correo inválido: %s', (correo) => {
        const resultado = validarInicioSesion({
            correo,
            contrasena: 'ContrasenaSegura123',
        })

        expect(resultado.datos).toBeUndefined()
        expect(resultado.errores.correo).toBe(
            'Introduce un correo electrónico válido.',
        )
    })

    it('rechaza un correo de más de 254 caracteres', () => {
        const resultado = validarInicioSesion({
            correo: `${'a'.repeat(243)}@example.com`,
            contrasena: 'ContrasenaSegura123',
        })

        expect(resultado.datos).toBeUndefined()
        expect(resultado.errores.correo).toBe(
            'El correo no puede superar 254 caracteres.',
        )
    })

    it('acepta una contraseña de un carácter', () => {
        const resultado = validarInicioSesion({
            correo: 'ana@example.com',
            contrasena: 'a',
        })

        expect(resultado.datos).toEqual({
            correo: 'ana@example.com',
            contrasena: 'a',
        })
        expect(resultado.errores).toEqual({})
    })

    it('rechaza una contraseña vacía', () => {
        const resultado = validarInicioSesion({
            correo: 'ana@example.com',
            contrasena: '',
        })

        expect(resultado.datos).toBeUndefined()
        expect(resultado.errores.contrasena).toBe(
            'La contraseña es obligatoria.',
        )
    })

    it('rechaza una contraseña superior a 128 caracteres', () => {
        const resultado = validarInicioSesion({
            correo: 'ana@example.com',
            contrasena: 'a'.repeat(129),
        })

        expect(resultado.datos).toBeUndefined()
        expect(resultado.errores.contrasena).toBe(
            'La contraseña no puede superar 128 caracteres.',
        )
    })

    it('devuelve los errores de ambos campos cuando son inválidos', () => {
        const resultado = validarInicioSesion({
            correo: 'correo-invalido',
            contrasena: '',
        })

        expect(resultado.datos).toBeUndefined()
        expect(resultado.errores).toEqual({
            correo: 'Introduce un correo electrónico válido.',
            contrasena: 'La contraseña es obligatoria.',
        })
    })
})

describe('validarRegistro', () => {
    it('normaliza el nombre y el correo cuando los datos son válidos', () => {
        const resultado = validarRegistro({
            nombre: '  Ana Pérez  ',
            correo: '  ANA@EXAMPLE.COM  ',
            contrasena: 'ContrasenaSegura123',
        })

        expect(resultado).toEqual({
            datos: {
                nombre: 'Ana Pérez',
                correo: 'ana@example.com',
                contrasena: 'ContrasenaSegura123',
            },
            errores: {},
        })
    })

    it.each([
        '',
        ' ',
        'A',
        'a'.repeat(121),
    ])('rechaza un nombre de longitud inválida', (nombre) => {
        const resultado = validarRegistro({
            nombre,
            correo: 'ana@example.com',
            contrasena: 'ContrasenaSegura123',
        })

        expect(resultado.datos).toBeUndefined()
        expect(resultado.errores.nombre).toBe(
            'El nombre debe tener entre 2 y 120 caracteres.',
        )
    })

    it('acepta un nombre de dos caracteres', () => {
        const resultado = validarRegistro({
            nombre: 'Ana',
            correo: 'ana@example.com',
            contrasena: 'ContrasenaSegura123',
        })

        expect(resultado.datos?.nombre).toBe('Ana')
        expect(resultado.errores.nombre).toBeUndefined()
    })

    it('acepta un nombre de 120 caracteres', () => {
        const nombre = 'A'.repeat(120)
        const resultado = validarRegistro({
            nombre,
            correo: 'ana@example.com',
            contrasena: 'ContrasenaSegura123',
        })

        expect(resultado.datos?.nombre).toBe(nombre)
        expect(resultado.errores.nombre).toBeUndefined()
    })

    it('rechaza un correo vacío o con formato inválido', () => {
        for (const correo of ['', '   ', 'correo-invalido']) {
            const resultado = validarRegistro({
                nombre: 'Ana Pérez',
                correo,
                contrasena: 'ContrasenaSegura123',
            })

            expect(resultado.datos).toBeUndefined()
            expect(resultado.errores.correo).toBe(
                'Introduce un correo electrónico válido.',
            )
        }
    })

    it('rechaza un correo superior a 254 caracteres', () => {
        const resultado = validarRegistro({
            nombre: 'Ana Pérez',
            correo: `${'a'.repeat(243)}@example.com`,
            contrasena: 'ContrasenaSegura123',
        })

        expect(resultado.datos).toBeUndefined()
        expect(resultado.errores.correo).toBe(
            'El correo no puede superar 254 caracteres.',
        )
    })

    it('acepta una contraseña de 12 caracteres', () => {
        const resultado = validarRegistro({
            nombre: 'Ana Pérez',
            correo: 'ana@example.com',
            contrasena: 'a'.repeat(12),
        })

        expect(resultado.datos?.contrasena).toBe('a'.repeat(12))
        expect(resultado.errores.contrasena).toBeUndefined()
    })

    it('acepta una contraseña de 128 caracteres', () => {
        const contrasena = 'a'.repeat(128)
        const resultado = validarRegistro({
            nombre: 'Ana Pérez',
            correo: 'ana@example.com',
            contrasena,
        })

        expect(resultado.datos?.contrasena).toBe(contrasena)
        expect(resultado.errores.contrasena).toBeUndefined()
    })

    it.each([11, 129])(
        'rechaza una contraseña de %i caracteres',
        (longitud) => {
            const resultado = validarRegistro({
                nombre: 'Ana Pérez',
                correo: 'ana@example.com',
                contrasena: 'a'.repeat(longitud),
            })

            expect(resultado.datos).toBeUndefined()
            expect(resultado.errores.contrasena).toBe(
                'La contraseña debe tener entre 12 y 128 caracteres.',
            )
        },
    )

    it('devuelve todos los errores cuando los tres campos son inválidos', () => {
        const resultado = validarRegistro({
            nombre: 'A',
            correo: 'correo-invalido',
            contrasena: 'corta',
        })

        expect(resultado.datos).toBeUndefined()
        expect(resultado.errores).toEqual({
            nombre: 'El nombre debe tener entre 2 y 120 caracteres.',
            correo: 'Introduce un correo electrónico válido.',
            contrasena:
                'La contraseña debe tener entre 12 y 128 caracteres.',
        })
    })
})
