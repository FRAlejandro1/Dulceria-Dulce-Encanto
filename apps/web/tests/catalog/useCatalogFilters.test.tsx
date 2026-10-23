import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Producto, Variante } from '../../src/types/catalogo.types'
import { useCatalogFilters } from '../../src/modules/catalog/hooks/useCatalogFilters'

function crearVariante(id: string, precio: string): Variante {
    return {
        id,
        nombre: 'Unidad',
        sku: `SKU-${id}`,
        precio,
        imagenUrl: null,
        stockDisponible: 10,
    }
}

function crearProducto(
    id: string,
    nombre: string,
    categoria: string,
    precio: string,
    descripcion: string | null = null,
    variantes: Variante[] = [crearVariante(`var-${id}`, precio)],
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
    crearProducto('1', 'Chocolate', 'Dulces', '5.00', 'Chocolate oscuro'),
    crearProducto('2', 'Caramelo', 'Confites', '2.00'),
    crearProducto('3', 'Galleta', 'Dulces', '3.00'),
    crearProducto('4', 'Producto sin variantes', 'Dulces', '1.00', null, []),
]

describe('useCatalogFilters', () => {
    it('genera categorías únicas ordenadas y agrega Todos', () => {
        const { result } = renderHook(() => useCatalogFilters(productos))

        expect(result.current.categorias).toEqual(['Todos', 'Confites', 'Dulces'])
    })

    it('filtra por nombre sin distinguir mayúsculas', () => {
        const { result } = renderHook(() => useCatalogFilters(productos))

        act(() => result.current.setBusqueda('CHOCOLATE'))

        expect(result.current.productosVisibles.map((p) => p.id)).toEqual(['1'])
    })

    it('filtra por descripción', () => {
        const { result } = renderHook(() => useCatalogFilters(productos))

        act(() => result.current.setBusqueda('oscuro'))

        expect(result.current.productosVisibles.map((p) => p.id)).toEqual(['1'])
    })

    it('ignora espacios al buscar', () => {
        const { result } = renderHook(() => useCatalogFilters(productos))

        act(() => result.current.setBusqueda('   '))

        expect(result.current.productosVisibles.map((p) => p.id)).toEqual([
            '1',
            '2',
            '3',
        ])
    })

    it('filtra por categoría', () => {
        const { result } = renderHook(() => useCatalogFilters(productos))

        act(() => result.current.setCategoria('Confites'))

        expect(result.current.productosVisibles.map((p) => p.id)).toEqual(['2'])
    })

    it('ordena los productos por precio ascendente', () => {
        const { result } = renderHook(() => useCatalogFilters(productos))

        act(() => result.current.setOrden('precio-menor'))

        expect(result.current.productosVisibles.map((p) => p.id)).toEqual([
            '2',
            '3',
            '1',
        ])
    })

    it('ordena los productos por precio descendente', () => {
        const { result } = renderHook(() => useCatalogFilters(productos))

        act(() => result.current.setOrden('precio-mayor'))

        expect(result.current.productosVisibles.map((p) => p.id)).toEqual([
            '1',
            '3',
            '2',
        ])
    })

    it('conserva el orden original en destacados', () => {
        const { result } = renderHook(() => useCatalogFilters(productos))

        expect(result.current.productosVisibles.map((p) => p.id)).toEqual([
            '1',
            '2',
            '3',
        ])
    })

    it('permite activar y desactivar favoritos', () => {
        const { result } = renderHook(() => useCatalogFilters(productos))

        act(() => result.current.alternarFavorito('1'))

        expect(result.current.favoritos).toEqual(['1'])
        expect(result.current.productosVisibles.map((p) => p.id)).toEqual([
            '1',
            '2',
            '3',
        ])

        act(() => result.current.setVerFavoritos(true))

        expect(result.current.productosVisibles.map((p) => p.id)).toEqual(['1'])

        act(() => result.current.alternarFavorito('1'))

        expect(result.current.favoritos).toEqual([])
        expect(result.current.productosVisibles).toEqual([])
    })

    it('restablece búsqueda, categoría y vista de favoritos', () => {
        const { result } = renderHook(() => useCatalogFilters(productos))

        act(() => {
            result.current.setBusqueda('chocolate')
            result.current.setCategoria('Dulces')
            result.current.setVerFavoritos(true)
        })

        act(() => result.current.restablecerFiltros())

        expect(result.current.busqueda).toBe('')
        expect(result.current.categoria).toBe('Todos')
        expect(result.current.verFavoritos).toBe(false)
        expect(result.current.productosVisibles.map((p) => p.id)).toEqual([
            '1',
            '2',
            '3',
        ])
    })

    it('mantiene los filtros al recibir una lista actualizada', () => {
        const { result, rerender } = renderHook(
            ({ lista }: { lista: Producto[] }) => useCatalogFilters(lista),
            { initialProps: { lista: productos } },
        )

        act(() => result.current.setCategoria('Confites'))

        rerender({
            lista: [...productos, crearProducto('5', 'Turrón', 'Confites', '4.00')],
        })

        expect(result.current.productosVisibles.map((p) => p.id)).toEqual(['2', '5'])
    })
})