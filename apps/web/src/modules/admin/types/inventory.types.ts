export type CategoriaAdmin = {
  id: string
  nombre: string
  slug: string
  activa: boolean
}

export type VarianteAdmin = {
  id: string
  nombre: string
  sku: string
  precio: string
  imagenUrl: string | null
  activa: boolean
  stockDisponible: number
  stockFisico: number
  stockReservado: number
}

export type ProductoAdmin = {
  id: string
  nombre: string
  descripcion: string | null
  imagenUrl: string | null
  activo: boolean
  categoriaId: string
  categoria: {
    nombre: string
    slug: string
    activa: boolean
  }
  variantes: VarianteAdmin[]
}

export type RespuestaCategoriasAdmin = {
  categorias: CategoriaAdmin[]
}

export type RespuestaProductosAdmin = {
  productos: ProductoAdmin[]
}

export type ResultadoAjusteStockAdmin = {
  mensaje: string
  inventario: {
    varianteId: string
    stockFisicoAnterior: number
    stockFisico: number
    stockReservado: number
    stockDisponible: number
    diferencia: number
  }
}

export type ActualizarProductoAdmin = {
  nombre?: string
  descripcion?: string
  imagenUrl?: string
  categoriaId?: string
  activo?: boolean
}

export type ActualizarVarianteAdmin = {
  nombre?: string
  sku?: string
  precio?: string
  imagenUrl?: string
  activa?: boolean
}

export type AjustarStockAdmin = {
  cantidad: number
  motivo: string
}


export type CrearVarianteAdmin = {
  nombre: string
  sku: string
  precio: string
}

export type ImagenVarianteAdmin = {
  id: string
  imagenUrl: string
  posicion: number
}

export type RespuestaImagenesVarianteAdmin = {
  imagenes: ImagenVarianteAdmin[]
}


export type CrearProductoAdmin = {
  nombre: string
  descripcion: string
  categoriaId: string
  variantes: CrearVarianteAdmin[]
}
