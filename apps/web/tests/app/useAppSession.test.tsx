import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAppSession } from '../../src/modules/app/hooks/useAppSession'

describe('useAppSession', () => {
  const preparar = () => {
    const setAviso = vi.fn()
    const setVistaCarrito = vi.fn()
    const setPanel = vi.fn()
    const hook = renderHook(() =>
      useAppSession({ setAviso, setVistaCarrito, setPanel }),
    )
    return { ...hook, setAviso, setVistaCarrito, setPanel }
  }

  it('abre y cierra la autenticación', () => {
    const h = preparar()
    act(() => h.result.current.abrirAutenticacion())
    expect(h.result.current.authAbierta).toBe(true)
    expect(h.setPanel).toHaveBeenCalledWith('ninguno')
    act(() => h.result.current.cerrarAutenticacion())
    expect(h.result.current.authAbierta).toBe(false)
  })

  it('inicia sesión de cliente y cierra sesión', () => {
    const h = preparar()
    const usuario = {
      id: '1', nombre: 'Ana', correo: 'ana@example.com', rol: 'CLIENTE',
    } as const
    act(() => h.result.current.manejarAutenticacion(usuario))
    expect(h.result.current.usuario?.nombre).toBe('Ana')
    expect(h.result.current.vistaAdministracion).toBe(false)
    expect(h.setAviso).toHaveBeenCalledWith('Sesión iniciada como Ana.')
    expect(h.setVistaCarrito).toHaveBeenCalledWith(false)
    act(() => h.result.current.manejarCierreSesion())
    expect(h.result.current.usuario).toBeNull()
    expect(h.result.current.authAbierta).toBe(false)
    expect(h.setAviso).toHaveBeenLastCalledWith(
      'Has cerrado sesión. Tus favoritos y carrito siguen siendo temporales.',
    )
  })

  it('permite acceder a administración solo al administrador', () => {
    const h = preparar()
    act(() => h.result.current.abrirAdministracion())
    expect(h.setAviso).toHaveBeenCalledWith(
      'No tienes permisos para acceder a la administración.',
    )
    act(() => h.result.current.manejarAutenticacion({
      id: '2', nombre: 'Admin', correo: 'admin@example.com', rol: 'ADMIN',
    }))
    expect(h.result.current.vistaAdministracion).toBe(true)
    act(() => h.result.current.abrirAutenticacion())
    act(() => h.result.current.abrirAdministracion())
    expect(h.result.current.vistaAdministracion).toBe(true)
    expect(h.result.current.authAbierta).toBe(false)
    expect(h.setPanel).toHaveBeenLastCalledWith('ninguno')
  })

  it('vuelve a la tienda y limpia la navegación', () => {
    const h = preparar()
    act(() => h.result.current.manejarAutenticacion({
      id: '2', nombre: 'Admin', correo: 'admin@example.com', rol: 'ADMIN',
    }))
    act(() => h.result.current.volverATienda())
    expect(h.result.current.vistaAdministracion).toBe(false)
    expect(h.setVistaCarrito).toHaveBeenLastCalledWith(false)
    expect(h.setPanel).toHaveBeenLastCalledWith('ninguno')
  })
})
