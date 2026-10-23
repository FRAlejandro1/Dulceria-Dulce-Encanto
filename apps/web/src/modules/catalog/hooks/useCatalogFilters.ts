import { useMemo, useState } from 'react'
import type { Producto } from '../../../types/catalogo.types'
import { obtenerPrecioMinimo } from '../utils/product.utils'

export function useCatalogFilters(productos: Producto[]) {
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todos')
  const [orden, setOrden] = useState('destacados')
  const [favoritos, setFavoritos] = useState<string[]>([])
  const [verFavoritos, setVerFavoritos] = useState(false)

  const categorias = useMemo(
    () => [
      'Todos',
      ...Array.from(
        new Set(productos.map((producto) => producto.categoria.nombre)),
      ).sort((a, b) => a.localeCompare(b, 'es')),
    ],
    [productos],
  )

  const productosVisibles = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase('es')

    const lista = productos.filter((producto) => {
      const coincideTexto =
        `${producto.nombre} ${producto.descripcion ?? ''}`
          .toLocaleLowerCase('es')
          .includes(texto)

      const coincideCategoria =
        categoria === 'Todos' || producto.categoria.nombre === categoria

      const coincideFavorito =
        !verFavoritos || favoritos.includes(producto.id)

      return (
        coincideTexto &&
        coincideCategoria &&
        coincideFavorito &&
        producto.variantes.length > 0
      )
    })

    if (orden === 'precio-menor') {
      return [...lista].sort(
        (a, b) => obtenerPrecioMinimo(a) - obtenerPrecioMinimo(b),
      )
    }

    if (orden === 'precio-mayor') {
      return [...lista].sort(
        (a, b) => obtenerPrecioMinimo(b) - obtenerPrecioMinimo(a),
      )
    }

    return lista
  }, [busqueda, categoria, favoritos, orden, productos, verFavoritos])

  function alternarFavorito(id: string) {
    setFavoritos((actuales) =>
      actuales.includes(id)
        ? actuales.filter((favorito) => favorito !== id)
        : [...actuales, id],
    )
  }

  function restablecerFiltros() {
    setBusqueda('')
    setCategoria('Todos')
    setVerFavoritos(false)
  }

  return {
    busqueda,
    setBusqueda,
    categoria,
    setCategoria,
    orden,
    setOrden,
    favoritos,
    verFavoritos,
    setVerFavoritos,
    categorias,
    productosVisibles,
    alternarFavorito,
    restablecerFiltros,
  }
}