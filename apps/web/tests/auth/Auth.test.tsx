import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Auth from '../../src/modules/auth/Auth'
import type { UsuarioAutenticado } from '../../src/modules/auth/types/auth.types'

const authMocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  iniciarSesion: vi.fn(),
  registrarUsuario: vi.fn(),
  cerrarSesion: vi.fn(),
  limpiarError: vi.fn(),
  estado: {} as Record<string, unknown>,
}))

vi.mock('../../src/modules/auth/hooks/useAuth', () => ({
  useAuth: authMocks.useAuth,
}))

const usuarioPrueba: UsuarioAutenticado = {
  id: 'usuario-1',
  nombre: 'Ana Pérez',
  correo: 'ana@example.com',
  rol: 'CLIENTE',
}

function renderizarAuth(
  opciones: {
    open?: boolean
    usuario?: UsuarioAutenticado | null
    onClose?: () => void
    onAuthenticated?: (usuario: UsuarioAutenticado) => void
    onLogout?: () => void
  } = {},
) {
  const onClose = opciones.onClose ?? vi.fn()
  const onAuthenticated = opciones.onAuthenticated ?? vi.fn()
  const onLogout = opciones.onLogout ?? vi.fn()

  const resultado = render(
    <Auth
      open={opciones.open ?? true}
      usuario={opciones.usuario ?? null}
      onClose={onClose}
      onAuthenticated={onAuthenticated}
      onLogout={onLogout}
    />,
  )

  return {
    ...resultado,
    onClose,
    onAuthenticated,
    onLogout,
  }
}

/**
 * Busca exclusivamente la pestaña superior de navegación.
 * Evita confundirla con el botón secundario del formulario.
 */
function obtenerPestana(nombre: 'Crear cuenta' | 'Iniciar sesión') {
  const dialogo = screen.getByRole('dialog')
  const boton = within(dialogo)
    .getAllByRole('button', { name: nombre })
    .find((elemento) =>
      elemento.classList.contains('auth-tabs__item'),
    )

  if (!boton) {
    throw new Error(`No se encontró la pestaña "${nombre}".`)
  }

  return boton
}

function obtenerFondo() {
  return screen.getByRole('button', {
    name: 'Cerrar el diálogo',
  })
}

/**
 * Ejecuta el manejador onClick registrado por React.
 * Permite probar la condición interna incluso si el elemento
 * está deshabilitado y un clic normal no ejecutaría el manejador.
 */
function ejecutarManejadorClick(elemento: HTMLElement) {
  const claveProps = Object.keys(elemento).find((clave) =>
    clave.startsWith('__reactProps$'),
  )

  if (!claveProps) {
    throw new Error('No se encontraron las propiedades de React.')
  }

  const props = (
    elemento as unknown as Record<
      string,
      { onClick?: () => void }
    >
  )[claveProps]

  if (typeof props.onClick !== 'function') {
    throw new Error('El elemento no tiene un manejador onClick.')
  }

  props.onClick()
}

function completarFormularioRegistro() {
  fireEvent.change(screen.getByLabelText(/nombre completo/i), {
    target: { value: 'Ana Pérez' },
  })

  fireEvent.change(screen.getByLabelText(/correo/i), {
    target: { value: 'ana@example.com' },
  })

  fireEvent.change(screen.getByLabelText(/contraseña/i), {
    target: { value: 'ContrasenaSegura123' },
  })
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()

  authMocks.estado = {
    usuario: null,
    procesando: false,
    error: '',
    iniciarSesion: authMocks.iniciarSesion,
    registrarUsuario: authMocks.registrarUsuario,
    cerrarSesion: authMocks.cerrarSesion,
    limpiarError: authMocks.limpiarError,
  }

  authMocks.iniciarSesion.mockResolvedValue(false)
  authMocks.registrarUsuario.mockResolvedValue(false)
  authMocks.cerrarSesion.mockResolvedValue(false)

  authMocks.useAuth.mockImplementation(
    () => authMocks.estado as never,
  )
})

describe('Auth', () => {
  it('no renderiza el diálogo cuando está cerrado', () => {
    const { container } = renderizarAuth({ open: false })

    expect(container.firstChild).toBeNull()
  })

  it('renderiza el formulario de inicio de sesión al abrirse', () => {
    renderizarAuth()

    expect(screen.getByRole('dialog')).toBeTruthy()

    expect(
      screen.getByRole('heading', {
        name: 'Bienvenido de nuevo',
      }),
    ).toBeTruthy()

    expect(
      screen.getByText('Inicia sesión para continuar.'),
    ).toBeTruthy()
  })

  it('cierra el diálogo al pulsar el botón de cierre', () => {
    const { onClose } = renderizarAuth()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cerrar autenticación',
      }),
    )

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('cierra el diálogo al pulsar Escape', () => {
    const { onClose } = renderizarAuth()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('no cierra el diálogo con Escape mientras procesa', () => {
    authMocks.estado.procesando = true

    const { onClose } = renderizarAuth()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).not.toHaveBeenCalled()

    expect(
      screen.getByRole('button', {
        name: 'Cerrar autenticación',
      }).hasAttribute('disabled'),
    ).toBe(true)
  })

  it('retira el listener de teclado cuando se cierra el diálogo', () => {
    const removeEventListener = vi.spyOn(
      window,
      'removeEventListener',
    )

    const { rerender, onClose, onAuthenticated, onLogout } =
      renderizarAuth()

    rerender(
      <Auth
        open={false}
        usuario={null}
        onClose={onClose}
        onAuthenticated={onAuthenticated}
        onLogout={onLogout}
      />,
    )

    expect(removeEventListener).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
    )
  })

  it('cierra el diálogo al pulsar el fondo exterior', () => {
    const { onClose } = renderizarAuth()

    fireEvent.click(obtenerFondo())

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('no cierra el diálogo al pulsar su contenido', () => {
    const { onClose } = renderizarAuth()

    fireEvent.mouseDown(screen.getByRole('dialog'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('no cierra el diálogo desde el fondo mientras procesa', () => {
    authMocks.estado.procesando = true

    const { onClose } = renderizarAuth()
    const fondo = obtenerFondo()

    expect(fondo.hasAttribute('disabled')).toBe(true)

    ejecutarManejadorClick(fondo)

    expect(onClose).not.toHaveBeenCalled()
  })

  it('no cierra el diálogo desde el botón de cierre mientras procesa', () => {
    authMocks.estado.procesando = true

    const { onClose } = renderizarAuth()
    const boton = screen.getByRole('button', {
      name: 'Cerrar autenticación',
    })

    expect(boton.hasAttribute('disabled')).toBe(true)

    ejecutarManejadorClick(boton)

    expect(onClose).not.toHaveBeenCalled()
  })

  it('cambia al formulario de registro y limpia los mensajes anteriores', () => {
    authMocks.estado.error = 'Error anterior'
    authMocks.limpiarError.mockImplementation(() => {
      authMocks.estado.error = ''
    })

    renderizarAuth()

    expect(screen.getByRole('alert').textContent).toBe('Error anterior')

    fireEvent.click(obtenerPestana('Crear cuenta'))

    expect(
      screen.getByRole('heading', {
        name: 'Crea tu cuenta',
      }),
    ).toBeTruthy()

    expect(
      screen.getByText('Regístrate para acceder a tu cuenta.'),
    ).toBeTruthy()

    expect(authMocks.limpiarError).toHaveBeenCalledOnce()
    expect(authMocks.estado.error).toBe('')
  })

  it('permite volver del registro al inicio de sesión desde la pestaña superior', () => {
    renderizarAuth()

    fireEvent.click(obtenerPestana('Crear cuenta'))
    fireEvent.click(obtenerPestana('Iniciar sesión'))

    expect(
      screen.getByRole('heading', {
        name: 'Bienvenido de nuevo',
      }),
    ).toBeTruthy()
  })

  it('cambia al registro desde el botón secundario del formulario de inicio de sesión', () => {
    renderizarAuth()

    const formulario = screen
      .getByLabelText(/correo electrónico/i)
      .closest('form')

    if (!formulario) {
      throw new Error('No se encontró el formulario de inicio de sesión.')
    }

    fireEvent.click(
      within(formulario).getByRole('button', {
        name: 'Crear cuenta',
      }),
    )

    expect(
      screen.getByRole('heading', {
        name: 'Crea tu cuenta',
      }),
    ).toBeTruthy()
  })

  it('vuelve al inicio de sesión desde el botón secundario del formulario de registro', () => {
    renderizarAuth()

    fireEvent.click(obtenerPestana('Crear cuenta'))

    const formulario = screen
      .getByLabelText(/nombre completo/i)
      .closest('form')

    if (!formulario) {
      throw new Error('No se encontró el formulario de registro.')
    }

    fireEvent.click(
      within(formulario).getByRole('button', {
        name: 'Iniciar sesión',
      }),
    )

    expect(
      screen.getByRole('heading', {
        name: 'Bienvenido de nuevo',
      }),
    ).toBeTruthy()
  })

  it('regresa al inicio de sesión y muestra el mensaje cuando el registro es correcto', async () => {
    authMocks.registrarUsuario.mockResolvedValue(true)

    renderizarAuth()

    fireEvent.click(obtenerPestana('Crear cuenta'))
    completarFormularioRegistro()

    const formulario = screen
      .getByLabelText(/nombre completo/i)
      .closest('form')

    if (!formulario) {
      throw new Error('No se encontró el formulario de registro.')
    }

    fireEvent.submit(formulario)

    await waitFor(() => {
      expect(authMocks.registrarUsuario).toHaveBeenCalledWith({
        nombre: 'Ana Pérez',
        correo: 'ana@example.com',
        contrasena: 'ContrasenaSegura123',
      })
    })

    expect(
      await screen.findByRole('heading', {
        name: 'Bienvenido de nuevo',
      }),
    ).toBeTruthy()

    expect(screen.getByRole('status')).toBeTruthy()
    expect(authMocks.limpiarError).toHaveBeenCalled()
  })

  it('permanece en el registro cuando el registro falla', async () => {
    authMocks.registrarUsuario.mockResolvedValue(false)

    renderizarAuth()

    fireEvent.click(obtenerPestana('Crear cuenta'))
    completarFormularioRegistro()

    const formulario = screen
      .getByLabelText(/nombre completo/i)
      .closest('form')

    if (!formulario) {
      throw new Error('No se encontró el formulario de registro.')
    }

    fireEvent.submit(formulario)

    await waitFor(() => {
      expect(authMocks.registrarUsuario).toHaveBeenCalledOnce()
    })

    expect(
      screen.getByRole('heading', {
        name: 'Crea tu cuenta',
      }),
    ).toBeTruthy()
  })

  it('notifica la autenticación cuando el hook devuelve un usuario', async () => {
    authMocks.estado.usuario = usuarioPrueba

    const { onAuthenticated } = renderizarAuth()

    await waitFor(() => {
      expect(onAuthenticated).toHaveBeenCalledWith(usuarioPrueba)
    })
  })

  it('usa el callback de autenticación más reciente', async () => {
    const primerCallback = vi.fn()
    const segundoCallback = vi.fn()
    const onClose = vi.fn()
    const onLogout = vi.fn()

    const { rerender } = render(
      <Auth
        open
        usuario={null}
        onClose={onClose}
        onAuthenticated={primerCallback}
        onLogout={onLogout}
      />,
    )

    await waitFor(() => {
      expect(authMocks.useAuth).toHaveBeenCalled()
    })

    authMocks.estado.usuario = usuarioPrueba

    rerender(
      <Auth
        open
        usuario={null}
        onClose={onClose}
        onAuthenticated={segundoCallback}
        onLogout={onLogout}
      />,
    )

    await waitFor(() => {
      expect(segundoCallback).toHaveBeenCalledWith(usuarioPrueba)
    })

    expect(primerCallback).not.toHaveBeenCalled()
  })

  it('muestra los datos de la cuenta del usuario recibido por props', () => {
    renderizarAuth({ usuario: usuarioPrueba })

    expect(
      screen.getByRole('heading', { name: 'Mi cuenta' }),
    ).toBeTruthy()

    expect(screen.getByText('Ana Pérez')).toBeTruthy()
    expect(screen.getByText('ana@example.com')).toBeTruthy()

    expect(
      screen.getByRole('button', { name: 'Cerrar sesión' }),
    ).toBeTruthy()
  })

  it('prioriza el usuario recibido por props sobre el usuario del hook', () => {
    authMocks.estado.usuario = {
      ...usuarioPrueba,
      nombre: 'Usuario del hook',
    }

    renderizarAuth({
      usuario: {
        ...usuarioPrueba,
        nombre: 'Usuario de props',
      },
    })

    expect(screen.getByText('Usuario de props')).toBeTruthy()
    expect(screen.queryByText('Usuario del hook')).toBeNull()
  })

  it('muestra el error del cierre de sesión cuando la operación falla', () => {
    authMocks.estado.usuario = usuarioPrueba
    authMocks.estado.error = 'No se pudo cerrar la sesión.'

    renderizarAuth()

    expect(screen.getByRole('alert').textContent).toBe(
      'No se pudo cerrar la sesión.',
    )
  })

  it('notifica el cierre de sesión cuando la operación es correcta', async () => {
    authMocks.estado.usuario = usuarioPrueba

    authMocks.cerrarSesion.mockImplementation(async () => {
      authMocks.estado.usuario = null
      authMocks.estado.procesando = false

      return true
    })

    const { onLogout } = renderizarAuth()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cerrar sesión',
      }),
    )

    await waitFor(() => {
      expect(authMocks.cerrarSesion).toHaveBeenCalledOnce()
      expect(onLogout).toHaveBeenCalledOnce()
    })
  })

  it('no notifica el cierre de sesión cuando la operación falla', async () => {
    authMocks.estado.usuario = usuarioPrueba
    authMocks.cerrarSesion.mockResolvedValue(false)

    const { onLogout } = renderizarAuth()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cerrar sesión',
      }),
    )

    await waitFor(() => {
      expect(authMocks.cerrarSesion).toHaveBeenCalledOnce()
    })

    expect(onLogout).not.toHaveBeenCalled()
  })

  it('deshabilita el botón de cierre de sesión mientras procesa', () => {
    authMocks.estado.usuario = usuarioPrueba
    authMocks.estado.procesando = true

    renderizarAuth()

    expect(
      screen.getByRole('button', {
        name: /cerrando sesión/i,
      }).hasAttribute('disabled'),
    ).toBe(true)
  })
})
