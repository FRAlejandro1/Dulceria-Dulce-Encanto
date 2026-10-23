
import { describe, expect, it } from 'vitest'
import type { Producto, Variante } from '../../src/types/catalogo.types'
import {
  obtenerPrecio,
  obtenerPrecioMinimo,
} from '../../src/modules/catalog/utils/product.utils'

function crearVariante(precio: string): Variante {
  return {
    id: 'variante-1',
    nombre: 'Unidad',
    sku: 'SKU-001',
    precio,
    imagenUrl: null,
    stockDisponible: 10,
  }
}

function crearProducto(variantes: Variante[]): Producto {
  return {
    id: 'producto-1',
    nombre: 'Producto de prueba',
    descripcion: null,
    imagenUrl: null,
    categoria: {
      nombre: 'Dulces',
      slug: 'dulces',
    },
    variantes,
  }
}

describe('obtenerPrecio', () => {
  it('convierte un precio válido en número', () => {
    expect(obtenerPrecio(crearVariante('12.50'))).toBe(12.5)
  })

  it('acepta un precio igual a cero', () => {
    expect(obtenerPrecio(crearVariante('0'))).toBe(0)
  })

  it('devuelve cero si el precio es negativo', () => {
    expect(obtenerPrecio(crearVariante('-3'))).toBe(0)
  })

  it('devuelve cero si el precio no es válido', () => {
    expect(obtenerPrecio(crearVariante('inválido'))).toBe(0)
  })

  it('devuelve cero si el precio no es finito', () => {
    expect(obtenerPrecio(crearVariante('Infinity'))).toBe(0)
  })
})

describe('obtenerPrecioMinimo', () => {
  it('devuelve el precio mínimo entre las variantes', () => {
    const producto = crearProducto([
      crearVariante('8.50'),
      crearVariante('3.25'),
      crearVariante('6.00'),
    ])

    expect(obtenerPrecioMinimo(producto)).toBe(3.25)
  })

  it('devuelve Infinity cuando el producto no tiene variantes', () => {
    expect(obtenerPrecioMinimo(crearProducto([]))).toBe(Infinity)
  })

  it('considera cero cuando una variante tiene un precio inválido', () => {
    const producto = crearProducto([
      crearVariante('5.00'),
      crearVariante('inválido'),
    ])

    expect(obtenerPrecioMinimo(producto)).toBe(0)
  })
})
