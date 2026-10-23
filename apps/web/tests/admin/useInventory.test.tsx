import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Producto, Variante } from '../../src/types/catalogo.types'
import { useInventory } from '../../src/modules/admin/hooks/useInventory'

function crearVariante(
  id: string,
  stockDisponible: number,
): Variante {
  return {
    id,
    nombre: 'Unidad',
    sku: `SKU-${id}`,
    precio: '5.00',
    imagenUrl: null,
    stockDisponible,
  }
}

function crearProducto(
  id: string,
  nombre: string,
  categoria: string,
  descripcion: string | null = null,
  variantes: Variante[] = [crearVariante(`var-${id}`, 10)],
): Producto {
  return {
    id,
    nombre,
    descripcion,
    imagenUrl: null,
    categoria: {
      nombre: categoria,
      slug: categoria.toLowerCase(),
    },
    variantes,
  }
}

const productos = [
  crearProducto(
    '1',
    'Chocolate',
    'Dulces',
    'Chocolate oscuro',
    [crearVariante('var-1a', 5), crearVariante('var-1b', 3)],
  ),
  crearProducto('2', 'Caramelo', 'Confites', 'Caramelo de menta', [
    crearVariante('var-2', 7),
  ]),
  crearProducto('3', 'Galleta', 'Dulces', null, []),
]

describe('useInventory', () => {
  it('inicializa filtros, selección y cantidades', () => {
    const { result } = renderHook(() => useInventory(productos))

    expect(result.current.busqueda).toBe('')
    expect(result.current.categoriaSeleccionada).toBe('Todas')
    expect(result.current.productoSeleccionadoId).toBe('1')
    expect(result.current.productoSeleccionado).toEqual(productos[0])
    expect(result.current.categorias).toEqual(['Todas', 'Dulces', 'Confites'])
    expect(result.current.cantidadProductos).toBe(3)
    expect(result.current.cantidadVariantes).toBe(3)
    expect(result.current.existenciasDisponibles).toBe(15)
    expect(result.current.productosFiltrados).toEqual(productos)
  })

  it('inicializa sin productos y sin selección', () => {
    const { result } = renderHook(() => useInventory([]))

    expect(result.current.categorias).toEqual(['Todas'])
    expect(result.current.productosFiltrados).toEqual([])
    expect(result.current.productoSeleccionado).toBeUndefined()
    expect(result.current.productoSeleccionadoId).toBe('')
    expect(result.current.cantidadProductos).toBe(0)
    expect(result.current.cantidadVariantes).toBe(0)
    expect(result.current.existenciasDisponibles).toBe(0)
  })

  it('filtra por nombre sin distinguir mayúsculas y espacios exteriores', () => {
    const { result } = renderHook(() => useInventory(productos))

    act(() => result.current.cambiarBusqueda('  CHOCOLATE  '))

    expect(result.current.productosFiltrados).toEqual([productos[0]])
    expect(result.current.productoSeleccionado).toEqual(productos[0])
  })

  it('filtra por descripción', () => {
    const { result } = renderHook(() => useInventory(productos))

    act(() => result.current.cambiarBusqueda('MENTA'))

    expect(result.current.productosFiltrados).toEqual([productos[1]])
  })

  it('tolera descripciones nulas durante la búsqueda', () => {
    const { result } = renderHook(() => useInventory(productos))

    act(() => result.current.cambiarBusqueda('galleta'))

    expect(result.current.productosFiltrados).toEqual([productos[2]])
  })

  it('no filtra productos cuando la búsqueda contiene solo espacios', () => {
    const { result } = renderHook(() => useInventory(productos))

    act(() => result.current.cambiarBusqueda('   '))

    expect(result.current.productosFiltrados).toEqual(productos)
  })

  it('filtra por categoría y reinicia la selección', () => {
    const { result } = renderHook(() => useInventory(productos))

    act(() => result.current.seleccionarProducto('2'))
    act(() => result.current.cambiarCategoria('Dulces'))

    expect(result.current.categoriaSeleccionada).toBe('Dulces')
    expect(result.current.productoSeleccionadoId).toBe('')
    expect(result.current.productosFiltrados).toEqual([
      productos[0],
      productos[2],
    ])
    expect(result.current.productoSeleccionado).toEqual(productos[0])
  })

  it('combina la búsqueda y la categoría seleccionada', () => {
    const { result } = renderHook(() => useInventory(productos))

    act(() => {
      result.current.cambiarCategoria('Dulces')
      result.current.cambiarBusqueda('galleta')
    })

    expect(result.current.productosFiltrados).toEqual([productos[2]])
  })

  it('permite seleccionar un producto filtrado', () => {
    const { result } = renderHook(() => useInventory(productos))

    act(() => result.current.cambiarCategoria('Confites'))
    act(() => result.current.seleccionarProducto('2'))

    expect(result.current.productoSeleccionadoId).toBe('2')
    expect(result.current.productoSeleccionado).toEqual(productos[1])
  })

  it('usa el primer producto filtrado si el seleccionado no coincide', () => {
    const { result } = renderHook(() => useInventory(productos))

    act(() => result.current.seleccionarProducto('2'))
    act(() => result.current.cambiarBusqueda('chocolate'))

    expect(result.current.productoSeleccionado).toEqual(productos[0])
  })

  it('no selecciona un producto cuando los filtros no devuelven resultados', () => {
    const { result } = renderHook(() => useInventory(productos))

    act(() => result.current.cambiarBusqueda('inexistente'))

    expect(result.current.productosFiltrados).toEqual([])
    expect(result.current.productoSeleccionado).toBeUndefined()
  })

  it('actualiza categorías y cantidades cuando cambia la lista', () => {
    const { result, rerender } = renderHook(
      ({ lista }: { lista: Producto[] }) => useInventory(lista),
      { initialProps: { lista: productos } },
    )

    const nuevosProductos = [
      ...productos,
      crearProducto('4', 'Turrón', 'Navideños', 'Dulce de almendra', [
        crearVariante('var-4', 12),
        crearVariante('var-4b', 4),
      ]),
    ]

    rerender({ lista: nuevosProductos })

    expect(result.current.categorias).toEqual([
      'Todas',
      'Dulces',
      'Confites',
      'Navideños',
    ])
    expect(result.current.cantidadProductos).toBe(4)
    expect(result.current.cantidadVariantes).toBe(5)
    expect(result.current.existenciasDisponibles).toBe(31)
  })
})
