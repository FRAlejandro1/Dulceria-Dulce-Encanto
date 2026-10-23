import { useMemo, useState } from 'react'
import type { Producto } from '../../../types/catalogo.types'

export function useInventory(productos: Producto[]) {
  const [busqueda, setBusqueda] = useState('')
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas')
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState(
    productos[0]?.id ?? '',
  )

  const categorias = useMemo(
    () => [
      'Todas',
      ...new Set(productos.map((producto) => producto.categoria.nombre)),
    ],
    [productos],
  )

  const productosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase()

    return productos.filter((producto) => {
      const coincideCategoria =
        categoriaSeleccionada === 'Todas' ||
        producto.categoria.nombre === categoriaSeleccionada

      const coincideBusqueda =
        termino.length === 0 ||
        producto.nombre.toLocaleLowerCase().includes(termino) ||
        (producto.descripcion ?? '').toLocaleLowerCase().includes(termino)

      return coincideCategoria && coincideBusqueda
    })
  }, [busqueda, categoriaSeleccionada, productos])

  const productoSeleccionado =
    productosFiltrados.find(
      (producto) => producto.id === productoSeleccionadoId,
    ) ?? productosFiltrados[0]

  const cantidadVariantes = productos.reduce(
    (total, producto) => total + producto.variantes.length,
    0,
  )

  const existenciasDisponibles = productos.reduce(
    (total, producto) =>
      total +
      producto.variantes.reduce(
        (subtotal, variante) => subtotal + variante.stockDisponible,
        0,
      ),
    0,
  )

  function cambiarCategoria(categoria: string) {
    setCategoriaSeleccionada(categoria)
    setProductoSeleccionadoId('')
  }

  return {
    busqueda,
    categorias,
    categoriaSeleccionada,
    productosFiltrados,
    productoSeleccionado,
    productoSeleccionadoId,
    cantidadProductos: productos.length,
    cantidadVariantes,
    existenciasDisponibles,
    cambiarBusqueda: setBusqueda,
    cambiarCategoria,
    seleccionarProducto: setProductoSeleccionadoId,
  }
}
