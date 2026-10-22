import { describe, expect, it } from 'vitest'
import type { Producto, Variante } from '../src/types/catalogo.types'
import {
  calcularCantidadTotal,
  calcularSubtotalCarrito,
  obtenerLineasCarrito,
  obtenerPrecioSeguro,
  validarAdicionCarrito,
} from '../src/modules/cart/utils/cart.utils'

const varianteBase: Variante = {
  id: 'variante-1',
  nombre: 'Unidad',
  sku: 'TEST-001',
  precio: '2.50',
  imagenUrl: null,
  stockDisponible: 5,
}

const productoBase: Producto = {
  id: 'producto-1',
  nombre: 'Producto de prueba',
  descripcion: 'Descripción de prueba',
  imagenUrl: null,
  categoria: {
    nombre: 'Pruebas',
    slug: 'pruebas',
  },
  variantes: [varianteBase],
}

describe('validarAdicionCarrito', () => {
  it('rechaza una variante inexistente', () => {
    expect(validarAdicionCarrito(undefined, 0)).toBe(
      'Este producto no tiene variantes disponibles.',
    )
  })

  it('rechaza una variante sin existencias', () => {
    expect(
      validarAdicionCarrito({ ...varianteBase, stockDisponible: 0 }, 0),
    ).toBe('Esta variante no tiene existencias disponibles.')
  })

  it('rechaza agregar cuando se alcanza el stock', () => {
    expect(validarAdicionCarrito(varianteBase, 5)).toBe(
      'No puedes agregar más unidades que las disponibles en stock.',
    )
  })

  it('permite agregar cuando queda stock', () => {
    expect(validarAdicionCarrito(varianteBase, 4)).toBeNull()
  })
})

describe('obtenerPrecioSeguro', () => {
  it('convierte el precio válido a número', () => {
    expect(obtenerPrecioSeguro(varianteBase)).toBe(2.5)
  })

  it('devuelve cero para un precio no numérico', () => {
    expect(
      obtenerPrecioSeguro({ ...varianteBase, precio: 'inválido' }),
    ).toBe(0)
  })

  it('devuelve cero para un precio negativo', () => {
    expect(
      obtenerPrecioSeguro({ ...varianteBase, precio: '-1.00' }),
    ).toBe(0)
  })
})

describe('obtenerLineasCarrito', () => {
  it('genera líneas solo para variantes con cantidades positivas', () => {
    const segundaVariante: Variante = {
      ...varianteBase,
      id: 'variante-2',
      precio: '4.00',
    }

    const producto: Producto = {
      ...productoBase,
      variantes: [varianteBase, segundaVariante],
    }

    const lineas = obtenerLineasCarrito(
      [producto],
      {
        'variante-1': 2,
        'variante-2': 0,
        desconocida: 3,
      },
    )

    expect(lineas).toHaveLength(1)
    expect(lineas[0]).toMatchObject({
      producto,
      variante: varianteBase,
      cantidad: 2,
      precioUnitario: 2.5,
      subtotal: 5,
    })
  })

  it('omite cantidades negativas y variantes sin cantidad', () => {
    const lineas = obtenerLineasCarrito(
      [productoBase],
      { 'variante-1': -1 },
    )

    expect(lineas).toEqual([])
  })

  it('usa precio cero si el precio de una variante es inválido', () => {
    const producto: Producto = {
      ...productoBase,
      variantes: [{ ...varianteBase, precio: 'inválido' }],
    }

    expect(
      obtenerLineasCarrito([producto], { 'variante-1': 2 }),
    ).toMatchObject([
      {
        cantidad: 2,
        precioUnitario: 0,
        subtotal: 0,
      },
    ])
  })

  it('procesa listas de productos vacías', () => {
    expect(obtenerLineasCarrito([], {})).toEqual([])
  })
})

describe('cálculos del carrito', () => {
  it('calcula la cantidad total de las líneas', () => {
    const lineas = obtenerLineasCarrito(
      [
        {
          ...productoBase,
          variantes: [
            varianteBase,
            { ...varianteBase, id: 'variante-2', precio: '4.00' },
          ],
        },
      ],
      { 'variante-1': 2, 'variante-2': 3 },
    )

    expect(calcularCantidadTotal(lineas)).toBe(5)
  })

  it('calcula el subtotal de las líneas', () => {
    const lineas = obtenerLineasCarrito(
      [
        {
          ...productoBase,
          variantes: [
            varianteBase,
            { ...varianteBase, id: 'variante-2', precio: '4.00' },
          ],
        },
      ],
      { 'variante-1': 2, 'variante-2': 3 },
    )

    expect(calcularSubtotalCarrito(lineas)).toBe(17)
  })

  it('devuelve cero para una lista vacía', () => {
    expect(calcularCantidadTotal([])).toBe(0)
    expect(calcularSubtotalCarrito([])).toBe(0)
  })
})
