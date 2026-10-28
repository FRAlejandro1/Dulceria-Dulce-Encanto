import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Producto, Variante } from '../../src/types/catalogo.types'
import { useCart } from '../../src/modules/cart/hooks/useCart'

const variante: Variante = {
  id: 'variante-1',
  nombre: 'Unidad',
  sku: 'TEST-001',
  precio: '2.50',
  imagenUrl: null,
  stockDisponible: 3,
}

const producto: Producto = {
  id: 'producto-1',
  nombre: 'Producto de prueba',
  descripcion: 'Descripción de prueba',
  imagenUrl: null,
  categoria: { nombre: 'Pruebas', slug: 'pruebas' },
  variantes: [variante],
}

describe('useCart', () => {
  it('inicia con el carrito vacío', () => {
    const { result } = renderHook(() => useCart([producto]))

    expect(result.current.carrito).toEqual({})
    expect(result.current.lineas).toEqual([])
    expect(result.current.cantidadCarrito).toBe(0)
    expect(result.current.subtotalCarrito).toBe(0)
  })

  it('agrega variantes y actualiza cantidad y subtotal', () => {
    const { result } = renderHook(() => useCart([producto]))

    act(() => {
      expect(result.current.agregarVariante(variante)).toBeNull()
    })

    act(() => {
      expect(result.current.agregarVariante(variante)).toBeNull()
    })

    expect(result.current.carrito).toEqual({ 'variante-1': 2 })
    expect(result.current.cantidadCarrito).toBe(2)
    expect(result.current.subtotalCarrito).toBe(5)
  })

  it('rechaza agregar más unidades que las disponibles', () => {
    const { result } = renderHook(() => useCart([producto]))

    act(() => {
      result.current.agregarVariante(variante)
      result.current.agregarVariante(variante)
      result.current.agregarVariante(variante)
    })

    expect(result.current.agregarVariante(variante)).toBe(
      'No puedes agregar más unidades que las disponibles en stock.',
    )
    expect(result.current.cantidadCarrito).toBe(3)
  })

  it('rechaza cantidades que no son enteros positivos', () => {
    const { result } = renderHook(() => useCart([producto]))

    act(() => {
      expect(result.current.cambiarCantidad('variante-1', 0)).toBe(
        'La cantidad debe ser un número entero mayor que cero.',
      )
      expect(result.current.cambiarCantidad('variante-1', 1.5)).toBe(
        'La cantidad debe ser un número entero mayor que cero.',
      )
    })

    expect(result.current.carrito).toEqual({})
  })

  it('conserva la cantidad actual cuando se intenta establecer cero', () => {
    const { result } = renderHook(() => useCart([producto]))

    act(() => {
      expect(result.current.agregarVariante(variante)).toBeNull()
    })

    let error: string | null = null

    act(() => {
      error = result.current.cambiarCantidad('variante-1', 0)
    })

    expect(error).toBe(
      'La cantidad debe ser un número entero mayor que cero.',
    )
    expect(result.current.carrito).toEqual({ 'variante-1': 1 })
    expect(result.current.cantidadCarrito).toBe(1)
    expect(result.current.subtotalCarrito).toBe(2.5)
  })

  it('rechaza variantes inexistentes o agotadas', () => {
    const productoAgotado: Producto = {
      ...producto,
      variantes: [{ ...variante, id: 'agotada', stockDisponible: 0 }],
    }
    const { result } = renderHook(() => useCart([productoAgotado]))

    act(() => {
      expect(result.current.cambiarCantidad('desconocida', 1)).toBe(
        'Esta variante ya no está disponible.',
      )
      expect(result.current.cambiarCantidad('agotada', 1)).toBe(
        'Esta variante ya no está disponible.',
      )
    })

    expect(result.current.carrito).toEqual({})
  })

  it('rechaza cantidades superiores al stock', () => {
    const { result } = renderHook(() => useCart([producto]))

    act(() => {
      expect(result.current.cambiarCantidad('variante-1', 4)).toBe(
        'No puedes superar las existencias disponibles.',
      )
    })

    expect(result.current.carrito).toEqual({})
  })

  it('permite cambiar la cantidad de una variante válida', () => {
    const { result } = renderHook(() => useCart([producto]))

    act(() => {
      expect(result.current.cambiarCantidad('variante-1', 2)).toBeNull()
    })

    expect(result.current.carrito).toEqual({ 'variante-1': 2 })
    expect(result.current.cantidadCarrito).toBe(2)
    expect(result.current.subtotalCarrito).toBe(5)
  })

  it('elimina una variante y permite vaciar el carrito', () => {
    const { result } = renderHook(() => useCart([producto]))

    act(() => {
      result.current.cambiarCantidad('variante-1', 2)
    })

    act(() => {
      result.current.eliminarVariante('variante-1')
    })

    expect(result.current.carrito).toEqual({})
    expect(result.current.cantidadCarrito).toBe(0)

    act(() => {
      result.current.cambiarCantidad('variante-1', 1)
      result.current.vaciarCarrito()
    })

    expect(result.current.carrito).toEqual({})
    expect(result.current.subtotalCarrito).toBe(0)
  })
})