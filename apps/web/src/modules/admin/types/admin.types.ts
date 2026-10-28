import type {
  ActualizarProductoAdmin,
  ActualizarVarianteAdmin,
  AjustarStockAdmin,
  CategoriaAdmin,
  CrearProductoAdmin,
  ProductoAdmin,
  ResultadoAjusteStockAdmin,
} from './inventory.types'

export type PropiedadesPanelAdmin = {
  alVolverATienda: () => void
}

export type PropiedadesResumenInventario = {
  cantidadProductos: number
  cantidadVariantes: number
  existenciasDisponibles: number
}

export type PropiedadesListaProductos = {
  productos: ProductoAdmin[]
  productoSeleccionadoId: string
  busqueda: string
  categoriaSeleccionada: string
  categorias: string[]
  onCambiarBusqueda: (busqueda: string) => void
  onCambiarCategoria: (categoria: string) => void
  onSeleccionarProducto: (productoId: string) => void
  categoriasDisponibles: CategoriaAdmin[]

  onCrearProducto: (datos: CrearProductoAdmin) => Promise<string>
  onCargarImagenProducto: (
    productoId: string,
    archivo: File,
  ) => Promise<string>
}


export type CategoriaEditableAdmin = {
  id: string
  nombre: string
}

export type PropiedadesDetalleProducto = {
  producto: ProductoAdmin | undefined
  categorias: CategoriaEditableAdmin[]
  onGuardarProducto: (
    productoId: string,
    cambios: ActualizarProductoAdmin,
  ) => Promise<void>
  onGuardarVariante: (
    varianteId: string,
    cambios: ActualizarVarianteAdmin,
  ) => Promise<void>
  onAjustarStock: (
    varianteId: string,
    cambios: AjustarStockAdmin,
  ) => Promise<ResultadoAjusteStockAdmin>
  onCrearVariante: (
    productoId: string,
    datos: import('./inventory.types').CrearVarianteAdmin,
  ) => Promise<void>
  cargarImagenProducto: (productoId: string, archivo: File) => Promise<string>
  eliminarImagenProducto: (productoId: string) => Promise<void>
  cargarImagenVariante: (varianteId: string, archivo: File) => Promise<string>
  eliminarImagenVariante: (varianteId: string) => Promise<void>
  obtenerImagenesVariante: (varianteId: string) => Promise<import('./inventory.types').ImagenVarianteAdmin[]>
  cargarImagenAdicionalVariante: (varianteId: string, archivo: File, posicion: number) => Promise<string>
  eliminarImagenAdicionalVariante: (varianteId: string, imagenId: string) => Promise<void>
}