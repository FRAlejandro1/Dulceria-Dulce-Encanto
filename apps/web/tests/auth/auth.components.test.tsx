import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AuthMessage from '../../src/modules/auth/components/AuthMessage'
import LoginForm from '../../src/modules/auth/components/LoginForm'
import RegisterForm from '../../src/modules/auth/components/RegisterForm'
import type {
    DatosInicioSesion,
    DatosRegistro,
} from '../../src/modules/auth/types/auth.types'

afterEach(() => {
    cleanup()
})

describe('AuthMessage', () => {
    it('no renderiza contenido cuando el mensaje está vacío', () => {
        const { container } = render(<AuthMessage mensaje="" />)

        expect(container.firstChild).toBeNull()
    })

    it('renderiza un mensaje informativo con el rol status por defecto', () => {
        render(<AuthMessage mensaje="Información de prueba" />)

        expect(screen.getByRole('status').textContent).toBe(
            'Información de prueba',
        )
        expect(screen.getByRole('status').className).toContain(
            'auth-message--informacion',
        )
    })

    it('renderiza errores con el rol alert', () => {
        render(<AuthMessage mensaje="Ocurrió un error" tipo="error" />)

        expect(screen.getByRole('alert').textContent).toBe(
            'Ocurrió un error',
        )
        expect(screen.getByRole('alert').className).toContain(
            'auth-message--error',
        )
    })

    it('renderiza mensajes de éxito con el rol status', () => {
        render(<AuthMessage mensaje="Operación correcta" tipo="exito" />)

        expect(screen.getByRole('status').textContent).toBe(
            'Operación correcta',
        )
        expect(screen.getByRole('status').className).toContain(
            'auth-message--exito',
        )
    })
})

describe('LoginForm', () => {
    function renderizarFormulario(
        opciones: {
            procesando?: boolean
            error?: string
            onSubmit?: (datos: DatosInicioSesion) => Promise<boolean>
            onSwitchRegister?: () => void
        } = {},
    ) {
        const onSubmit =
            opciones.onSubmit ??
            vi.fn(async () => true)
        const onSwitchRegister = opciones.onSwitchRegister ?? vi.fn()

        const resultado = render(
            <LoginForm
                procesando={opciones.procesando ?? false}
                error={opciones.error ?? ''}
                onSubmit={onSubmit}
                onSwitchRegister={onSwitchRegister}
            />,
        )

        return { ...resultado, onSubmit, onSwitchRegister }
    }

    it('muestra errores de validación y no envía datos inválidos', () => {
        const { container, onSubmit } = renderizarFormulario()

        fireEvent.submit(container.querySelector('form')!)

        expect(
            screen.getByText('Introduce un correo electrónico válido.'),
        ).toBeTruthy()
        expect(
            screen.getByText('La contraseña es obligatoria.'),
        ).toBeTruthy()
        expect(
            screen.getByLabelText(/correo/i).getAttribute('aria-invalid'),
        ).toBe('true')
        expect(
            screen.getByLabelText(/contraseña/i).getAttribute('aria-invalid'),
        ).toBe('true')
        expect(onSubmit).not.toHaveBeenCalled()
    })

    it('envía los datos válidos con el correo normalizado', async () => {
        const onSubmit = vi.fn(async () => true)
        const { container } = renderizarFormulario({ onSubmit })

        fireEvent.change(screen.getByLabelText(/correo/i), {
            target: { value: ' ANA@EXAMPLE.COM ' },
        })
        fireEvent.change(screen.getByLabelText(/contraseña/i), {
            target: { value: 'ContrasenaSegura123' },
        })
        fireEvent.submit(container.querySelector('form')!)

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledWith({
                correo: 'ana@example.com',
                contrasena: 'ContrasenaSegura123',
            })
        })
    })

    it('muestra el error recibido desde el servicio', () => {
        renderizarFormulario({ error: 'Credenciales incorrectas.' })

        expect(screen.getByRole('alert').textContent).toBe(
            'Credenciales incorrectas.',
        )
    })

    it('deshabilita el envío y el cambio de formulario mientras procesa', () => {
        renderizarFormulario({ procesando: true })

        expect(
            screen.getByRole('button', {
                name: /iniciando sesi/i,
            }).hasAttribute('disabled'),
        ).toBe(true)

        expect(
            screen.getByRole('button', {
                name: /crear cuenta/i,
            }).hasAttribute('disabled'),
        ).toBe(true)
    })

    it('permite solicitar el cambio al registro', () => {
        const onSwitchRegister = vi.fn()
        renderizarFormulario({ onSwitchRegister })

        fireEvent.click(
            screen.getByRole('button', {
                name: /crear cuenta/i,
            }),
        )

        expect(onSwitchRegister).toHaveBeenCalledOnce()
    })
})

describe('RegisterForm', () => {
    function renderizarFormulario(
        opciones: {
            procesando?: boolean
            error?: string
            mensajeExito?: string
            onSubmit?: (datos: DatosRegistro) => Promise<boolean>
            onSwitchLogin?: () => void
        } = {},
    ) {
        const onSubmit =
            opciones.onSubmit ??
            vi.fn(async () => true)
        const onSwitchLogin = opciones.onSwitchLogin ?? vi.fn()

        const resultado = render(
            <RegisterForm
                procesando={opciones.procesando ?? false}
                error={opciones.error ?? ''}
                mensajeExito={opciones.mensajeExito ?? ''}
                onSubmit={onSubmit}
                onSwitchLogin={onSwitchLogin}
            />,
        )

        return { ...resultado, onSubmit, onSwitchLogin }
    }

    function completarFormulario() {
        fireEvent.change(screen.getByLabelText(/nombre completo/i), {
            target: { value: 'Ana Pérez' },
        })
        fireEvent.change(screen.getByLabelText(/correo/i), {
            target: { value: ' ANA@EXAMPLE.COM ' },
        })
        fireEvent.change(screen.getByLabelText(/contraseña/i), {
            target: { value: 'ContrasenaSegura123' },
        })
    }

    it('muestra los errores de los campos obligatorios', () => {
        const { container, onSubmit } = renderizarFormulario()

        fireEvent.submit(container.querySelector('form')!)

        expect(
            screen.getByText(
                'El nombre debe tener entre 2 y 120 caracteres.',
            ),
        ).toBeTruthy()
        expect(
            screen.getByText('Introduce un correo electrónico válido.'),
        ).toBeTruthy()
        expect(
            screen.getByText(
                'La contraseña debe tener entre 12 y 128 caracteres.',
            ),
        ).toBeTruthy()
        expect(onSubmit).not.toHaveBeenCalled()
    })

    it('envía los datos válidos normalizados', async () => {
        const onSubmit = vi.fn(async () => true)
        const { container } = renderizarFormulario({ onSubmit })

        completarFormulario()
        fireEvent.submit(container.querySelector('form')!)

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledWith({
                nombre: 'Ana Pérez',
                correo: 'ana@example.com',
                contrasena: 'ContrasenaSegura123',
            })
        })
    })

    it('limpia los campos y los errores después de un registro correcto', async () => {
        const onSubmit = vi.fn(async () => true)
        const { container } = renderizarFormulario({ onSubmit })

        completarFormulario()
        fireEvent.submit(container.querySelector('form')!)

        await waitFor(() => {
            expect(
                (screen.getByLabelText(
                    /nombre completo/i,
                ) as HTMLInputElement).value,
            ).toBe('')

            expect(
                (screen.getByLabelText(
                    /correo/i,
                ) as HTMLInputElement).value,
            ).toBe('')

            expect(
                (screen.getByLabelText(
                    /contraseña/i,
                ) as HTMLInputElement).value,
            ).toBe('')
        })

        expect(
            screen.queryByText(
                'El nombre debe tener entre 2 y 120 caracteres.',
            ),
        ).toBeNull()
    })

    it('conserva los campos cuando el registro no es correcto', async () => {
        const onSubmit = vi.fn(async () => false)
        const { container } = renderizarFormulario({ onSubmit })

        completarFormulario()
        fireEvent.submit(container.querySelector('form')!)

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledOnce()
        })

        expect(
            (screen.getByLabelText(
                /nombre completo/i,
            ) as HTMLInputElement).value,
        ).toBe('Ana Pérez')

        expect(
            (screen.getByLabelText(
                /correo/i,
            ) as HTMLInputElement).value,
        ).toBe('ANA@EXAMPLE.COM')

        expect(
            (screen.getByLabelText(
                /contraseña/i,
            ) as HTMLInputElement).value,
        ).toBe('ContrasenaSegura123')
    })

    it('muestra los mensajes de error y éxito recibidos', () => {
        renderizarFormulario({
            error: 'No se pudo registrar la cuenta.',
            mensajeExito: 'Registro completado.',
        })

        expect(screen.getByRole('alert').textContent).toBe(
            'No se pudo registrar la cuenta.',
        )
        expect(screen.getByRole('status').textContent).toBe(
            'Registro completado.',
        )
    })

    it('deshabilita los botones mientras procesa', () => {
        renderizarFormulario({ procesando: true })

        expect(
            screen.getByRole('button', {
                name: /creando cuenta/i,
            }).hasAttribute('disabled'),
        ).toBe(true)

        expect(
            screen.getByRole('button', {
                name: /iniciar sesi/i,
            }).hasAttribute('disabled'),
        ).toBe(true)
    })

    it('permite solicitar el cambio al inicio de sesión', () => {
        const onSwitchLogin = vi.fn()
        renderizarFormulario({ onSwitchLogin })

        fireEvent.click(
            screen.getByRole('button', {
                name: /iniciar sesi/i,
            }),
        )

        expect(onSwitchLogin).toHaveBeenCalledOnce()
    })
})
