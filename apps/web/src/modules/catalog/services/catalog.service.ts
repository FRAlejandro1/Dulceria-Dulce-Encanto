import type {
  Producto,
  RespuestaCatalogo,
} from '../../../types/catalogo.types'

const RUTA_CATALOGO = '/api/v1/catalog/products'

function esProductoValido(valor: unknown): valor is Producto {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const producto = valor as Partial<Producto>

  return (
    typeof producto.id === 'string' &&
    typeof producto.nombre === 'string' &&
    typeof producto.categoria?.nombre === 'string' &&
    typeof producto.categoria?.slug === 'string' &&
    Array.isArray(producto.variantes)
  )
}

export async function obtenerProductosCatalogo(
  signal: AbortSignal,
): Promise<Producto[]> {
  const respuesta = await fetch(RUTA_CATALOGO, {
    method: 'GET',
    cache: 'no-store',
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!respuesta.ok) {
    throw new Error('No se pudo cargar el catálogo.')
  }

  const datos: unknown = await respuesta.json()

  if (
    typeof datos !== 'object' ||
    datos === null ||
    !('productos' in datos) ||
    !Array.isArray(datos.productos)
  ) {
    throw new Error('La respuesta del catálogo no tiene un formato válido.')
  }

  const catalogo = datos as RespuestaCatalogo

  return catalogo.productos.filter(esProductoValido)
}