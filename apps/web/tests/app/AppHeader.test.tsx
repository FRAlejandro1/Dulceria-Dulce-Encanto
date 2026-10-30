import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppHeader from '../../src/modules/app/components/AppHeader'
import type { UsuarioAutenticado } from '../../src/modules/auth/types/auth.types'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const usuarioAdmin: UsuarioAutenticado = {
  id: 'admin-1',
  nombre: 'Administradora',
  correo: 'admin@dulceencanto.test',
  rol: 'ADMIN',
}

const usuarioCliente: UsuarioAutenticado = {
  id: 'cliente-1',
  nombre: 'Cliente',
  correo: 'cliente@dulceencanto.test',
  rol: 'CLIENTE',
}

function renderizarCabecera(
  opciones: {
    usuario?: UsuarioAutenticado | null
    vistaAdministracion?: boolean
    temaOscuro?: boolean
    verFavoritos?: boolean
    panel?: 'ninguno' | 'notificaciones' | 'perfil'
    cantidadCarrito?: number
    cantidadNotificacionesPendientes?: number
  } = {},
) {
  const callbacks = {
    onVolverAlInicio: vi.fn(),
    onNavegarAProductos: vi.fn(),
    onAlternarFavoritos: vi.fn(),
    onAbrirCarrito: vi.fn(),
    onAlternarTema: vi.fn(),
    onAlternarPanel: vi.fn(),
    onAbrirAutenticacion: vi.fn(),
    onVolverATienda: vi.fn(),
  }

  render(
    <AppHeader
      cantidadCarrito={opciones.cantidadCarrito ?? 0}
      cantidadFavoritos={3}
      cantidadNotificacionesPendientes={opciones.cantidadNotificacionesPendientes ?? 0}
      temaOscuro={opciones.temaOscuro ?? false}
      usuario={opciones.usuario === undefined ? usuarioCliente : opciones.usuario}
      vistaAdministracion={opciones.vistaAdministracion ?? false}
      verFavoritos={opciones.verFavoritos ?? false}
      panel={opciones.panel ?? 'ninguno'}
      {...callbacks}
    />,
  )

  return callbacks
}

describe('AppHeader', () => {
  it('muestra la navegación administrativa para un administrador', () => {
    const callbacks = renderizarCabecera({
      usuario: usuarioAdmin,
      vistaAdministracion: true,
    })

    expect(
      screen.getByRole('navigation', { name: 'Navegación administrativa' }),
    ).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: 'Navegación principal' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Notificaciones' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Carrito, 0 productos' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Volver a la tienda' }))
    expect(callbacks.onVolverATienda).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('link', { name: 'Dulce Encanto, inicio' }))
    expect(callbacks.onVolverATienda).toHaveBeenCalledTimes(2)
    expect(callbacks.onVolverAlInicio).not.toHaveBeenCalled()
  })

  it('muestra navegación normal si la vista administrativa no corresponde a un administrador', () => {
    const callbacks = renderizarCabecera({
      usuario: usuarioCliente,
      vistaAdministracion: true,
    })

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: 'Navegación administrativa' })).toBeNull()

    fireEvent.click(screen.getByRole('link', { name: 'Dulce Encanto, inicio' }))
    expect(callbacks.onVolverATienda).toHaveBeenCalledOnce()
    expect(callbacks.onVolverAlInicio).not.toHaveBeenCalled()
  })

  it('permite navegar por la tienda y abrir sus acciones', () => {
    const callbacks = renderizarCabecera({
      cantidadCarrito: 2,
      verFavoritos: true,
      panel: 'notificaciones',
    })

    fireEvent.click(screen.getByRole('link', { name: 'Inicio' }))
    fireEvent.click(screen.getByRole('link', { name: 'Ofertas' }))
    fireEvent.click(screen.getByRole('link', { name: 'Productos' }))
    fireEvent.click(screen.getByRole('button', { name: /Favoritos/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }))
    fireEvent.click(screen.getByRole('button', { name: 'Carrito, 2 productos' }))
    fireEvent.click(screen.getByRole('button', { name: 'Activar modo oscuro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir perfil' }))

    expect(callbacks.onVolverAlInicio).toHaveBeenCalledOnce()
    expect(callbacks.onNavegarAProductos).toHaveBeenNthCalledWith(1, true)
    expect(callbacks.onNavegarAProductos).toHaveBeenNthCalledWith(2, false)
    expect(callbacks.onAlternarFavoritos).toHaveBeenCalledOnce()
    expect(callbacks.onAlternarPanel).toHaveBeenCalledWith('notificaciones')
    expect(callbacks.onAbrirCarrito).toHaveBeenCalledOnce()
    expect(callbacks.onAlternarTema).toHaveBeenCalledOnce()
    expect(callbacks.onAbrirAutenticacion).toHaveBeenCalledOnce()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Notificaciones' }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('button', { name: /Favoritos/ }).getAttribute('aria-pressed')).toBe('true')
  })

  it('muestra la cuenta por defecto y permite activar el modo claro', () => {
    const callbacks = renderizarCabecera({
      usuario: null,
      temaOscuro: true,
    })

    expect(screen.getByText('Mi cuenta')).toBeTruthy()
    expect(screen.getByText('U')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Activar modo claro' }))
    expect(callbacks.onAlternarTema).toHaveBeenCalledOnce()
  })

  it('usa el inicio normal al pulsar la marca fuera de administración', () => {
    const callbacks = renderizarCabecera()

    fireEvent.click(screen.getByRole('link', { name: 'Dulce Encanto, inicio' }))

    expect(callbacks.onVolverAlInicio).toHaveBeenCalledOnce()
    expect(callbacks.onVolverATienda).not.toHaveBeenCalled()
  })

  it('muestra la cantidad de notificaciones pendientes', () => {
    renderizarCabecera({ cantidadNotificacionesPendientes: 3 })

    expect(
      screen.getByRole('button', {
        name: 'Notificaciones, 3 sin leer',
      }),
    ).toBeTruthy()

    expect(
      screen.getByRole('button', {
        name: 'Notificaciones, 3 sin leer',
      }).querySelector('.icon-button__badge')?.textContent,
    ).toBe('3')
  })
})
