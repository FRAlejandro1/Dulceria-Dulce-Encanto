import type { Producto } from '../../../types/catalogo.types'

export type PropiedadesPanelAdmin = {
  productos: Producto[]
  alVolverATienda: () => void
}

export type PropiedadesResumenInventario = {
  cantidadProductos: number
  cantidadVariantes: number
  existenciasDisponibles: number
}

export type PropiedadesListaProductos = {
  productos: Producto[]
  productoSeleccionadoId: string
  busqueda: string
  categoriaSeleccionada: string
  categorias: string[]
  onCambiarBusqueda: (busqueda: string) => void
  onCambiarCategoria: (categoria: string) => void
  onSeleccionarProducto: (productoId: string) => void
}

export type PropiedadesDetalleProducto = {
  producto: Producto | undefined
}
