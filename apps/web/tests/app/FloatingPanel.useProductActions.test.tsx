import { cleanup, fireEvent, render, renderHook, screen, act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Producto, Variante } from '../../src/types/catalogo.types'
import type { UsuarioAutenticado } from '../../src/modules/auth/types/auth.types'
import FloatingPanel from '../../src/modules/app/components/FloatingPanel'
import { useProductActions } from '../../src/modules/app/hooks/useProductActions'

afterEach(() => {
  cleanup()
})

const variante: Variante = {
  id: 'variante-1',
  nombre: 'Unidad',
  sku: 'TEST-001',
  precio: '2.50',
  imagenUrl: null,
  stockDisponible: 3,
}

function crearProducto(variantes: Variante[] = [variante]): Producto {
  return {
    id: 'producto-1',
    nombre: 'Alfajor de prueba',
    descripcion: 'Producto de prueba',
    imagenUrl: null,
    categoria: {
      nombre: 'Dulces',
      slug: 'dulces',
    },
    variantes,
  }
}

function crearUsuario(rol: 'CLIENTE' | 'ADMIN'): UsuarioAutenticado {
  return {
    id: 'usuario-1',
    nombre: 'Usuario de prueba',
    correo: 'usuario@example.com',
    rol,
  }
}

describe('FloatingPanel', () => {
  const callbacks = () => ({
    onCerrar: vi.fn(),
    onAbrirAutenticacion: vi.fn(),
    onAbrirAdministracion: vi.fn(),
  })

  it('no renderiza contenido cuando el panel está cerrado', () => {
    const props = callbacks()
    const { container } = render(
      <FloatingPanel panel="ninguno" usuario={null} {...props} />,
    )

    expect(container.firstChild).toBeNull()
  })

  it('muestra notificaciones y permite cerrar el panel', () => {
    const props = callbacks()

    render(
      <FloatingPanel
        panel="notificaciones"
        usuario={null}
        {...props}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Notificaciones' }),
    ).toBeTruthy()
    expect(screen.getByText('No tienes notificaciones nuevas.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }))
    expect(props.onCerrar).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Iniciar sesión' })).toBeNull()
  })

  it('muestra el acceso de autenticación para usuarios anónimos', () => {
    const props = callbacks()

    render(
      <FloatingPanel panel="perfil" usuario={null} {...props} />,
    )

    expect(
      screen.getByText(/Inicia sesión para acceder a tu cuenta/),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(props.onAbrirAutenticacion).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: /Abrir administración/ })).toBeNull()
  })

  it('muestra la cuenta de un cliente autenticado', () => {
    const props = callbacks()

    render(
      <FloatingPanel
        panel="perfil"
        usuario={crearUsuario('CLIENTE')}
        {...props}
      />,
    )

    expect(screen.getByText(/Usuario de prueba/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Ver mi cuenta' }))
    expect(props.onAbrirAutenticacion).toHaveBeenCalledOnce()
    expect(props.onAbrirAdministracion).not.toHaveBeenCalled()
  })

  it('permite al administrador abrir la administración', () => {
    const props = callbacks()

    render(
      <FloatingPanel
        panel="perfil"
        usuario={crearUsuario('ADMIN')}
        {...props}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: /Abrir administración/ }),
    )
    expect(props.onAbrirAdministracion).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: 'Ver mi cuenta' }))
    expect(props.onAbrirAutenticacion).toHaveBeenCalledOnce()
  })
})

describe('useProductActions', () => {
  function crearParametros(
    cambios: Partial<{
      variantesSeleccionadas: Record<string, string>
      agregarVariante: (variante: Variante) => string | null
      cambiarCantidad: (varianteId: string, cantidad: number) => string | null
    }> = {},
  ) {
    return {
      variantesSeleccionadas: cambios.variantesSeleccionadas ?? {},
      setVariantesSeleccionadas: vi.fn(),
      agregarVariante: cambios.agregarVariante ?? vi.fn(() => null),
      cambiarCantidad: cambios.cambiarCantidad ?? vi.fn(() => null),
      setAviso: vi.fn(),
    }
  }

  it('obtiene la variante seleccionada o la primera disponible como alternativa', () => {
    const segundaVariante: Variante = {
      ...variante,
      id: 'variante-2',
      nombre: 'Caja',
    }
    const producto = crearProducto([variante, segundaVariante])

    const seleccionada = renderHook(() =>
      useProductActions(
        crearParametros({
          variantesSeleccionadas: { [producto.id]: segundaVariante.id },
        }),
      ),
    )

    expect(
      seleccionada.result.current.obtenerVarianteSeleccionada(producto)?.id,
    ).toBe('variante-2')

    const alternativa = renderHook(() =>
      useProductActions(crearParametros()),
    )

    expect(
      alternativa.result.current.obtenerVarianteSeleccionada(producto)?.id,
    ).toBe('variante-1')
  })

  it('avisa cuando el producto no tiene variantes', () => {
    const parametros = crearParametros()
    const { result } = renderHook(() => useProductActions(parametros))

    act(() => {
      result.current.agregarAlCarrito(crearProducto([]))
    })

    expect(parametros.setAviso).toHaveBeenCalledWith(
      'Este producto no tiene variantes disponibles.',
    )
    expect(parametros.agregarVariante).not.toHaveBeenCalled()
  })

  it('avisa si falla la adición al carrito', () => {
    const parametros = crearParametros({
      agregarVariante: vi.fn(() => 'Stock insuficiente'),
    })
    const { result } = renderHook(() => useProductActions(parametros))

    act(() => {
      result.current.agregarAlCarrito(crearProducto())
    })

    expect(parametros.agregarVariante).toHaveBeenCalledWith(variante)
    expect(parametros.setAviso).toHaveBeenCalledWith('Stock insuficiente')
  })

  it('añade la variante y muestra un aviso cuando la operación tiene éxito', () => {
    const parametros = crearParametros({
      agregarVariante: vi.fn(() => null),
    })
    const { result } = renderHook(() => useProductActions(parametros))

    act(() => {
      result.current.agregarAlCarrito(crearProducto())
    })

    expect(parametros.agregarVariante).toHaveBeenCalledWith(variante)
    expect(parametros.setAviso).toHaveBeenCalledOnce()
    expect(parametros.setAviso.mock.calls[0][0]).toContain('Alfajor de prueba')
    expect(parametros.setAviso.mock.calls[0][0]).toContain('carrito')
  })

  it('muestra el error al cambiar la cantidad cuando la operación falla', () => {
    const parametros = crearParametros({
      cambiarCantidad: vi.fn(() => 'Cantidad no disponible'),
    })
    const { result } = renderHook(() => useProductActions(parametros))

    act(() => {
      result.current.manejarCambioCantidad('variante-1', 5)
    })

    expect(parametros.cambiarCantidad).toHaveBeenCalledWith('variante-1', 5)
    expect(parametros.setAviso).toHaveBeenCalledWith('Cantidad no disponible')
  })

  it('no muestra un aviso si cambiar la cantidad tiene éxito', () => {
    const parametros = crearParametros({
      cambiarCantidad: vi.fn(() => null),
    })
    const { result } = renderHook(() => useProductActions(parametros))

    act(() => {
      result.current.manejarCambioCantidad('variante-1', 2)
    })

    expect(parametros.cambiarCantidad).toHaveBeenCalledWith('variante-1', 2)
    expect(parametros.setAviso).not.toHaveBeenCalled()
  })

  it('actualiza la variante seleccionada conservando las anteriores', () => {
    const setter = vi.fn()
    const parametros = {
      ...crearParametros({
        variantesSeleccionadas: { 'producto-anterior': 'variante-anterior' },
      }),
      setVariantesSeleccionadas: setter,
    }
    const { result } = renderHook(() => useProductActions(parametros))

    act(() => {
      result.current.manejarCambioVariante('producto-1', 'variante-2')
    })

    expect(setter).toHaveBeenCalledOnce()

    const actualizador = setter.mock.calls[0][0]
    expect(typeof actualizador).toBe('function')

    if (typeof actualizador === 'function') {
      expect(
        actualizador({ 'producto-anterior': 'variante-anterior' }),
      ).toEqual({
        'producto-anterior': 'variante-anterior',
        'producto-1': 'variante-2',
      })
    }
  })
})
