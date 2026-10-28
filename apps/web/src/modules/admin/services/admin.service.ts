import {
  comprobarRespuesta,
  enviarSolicitudProtegida,
} from '../../../services/http.service'
import type {
  ActualizarProductoAdmin,
  ActualizarVarianteAdmin,
  AjustarStockAdmin,
  CategoriaAdmin,
  CrearVarianteAdmin,
  CrearProductoAdmin,
  ImagenVarianteAdmin,
  ProductoAdmin,
  RespuestaCategoriasAdmin,
  RespuestaProductosAdmin,
  ResultadoAjusteStockAdmin,
} from '../types/inventory.types'

function esObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null
}

function validarRespuestaImagen(
  resultado: unknown,
): string {
  if (
    !esObjeto(resultado)
    || !esObjeto(resultado.imagen)
    || typeof resultado.imagen.imagenUrl !== 'string'
  ) {
    throw new Error('La respuesta de la imagen no es válida.')
  }

  return resultado.imagen.imagenUrl
}

function validarImagenes(
  resultado: unknown,
): ImagenVarianteAdmin[] {
  if (!esObjeto(resultado) || !Array.isArray(resultado.imagenes)) {
    throw new Error('La respuesta de imágenes de variante no es válida.')
  }

  const imagenes = resultado.imagenes

  for (const imagen of imagenes) {
    if (
      !esObjeto(imagen)
      || typeof imagen.id !== 'string'
      || typeof imagen.imagenUrl !== 'string'
      || typeof imagen.posicion !== 'number'
      || !Number.isInteger(imagen.posicion)
      || imagen.posicion < 1
      || imagen.posicion > 3
    ) {
      throw new Error('Una imagen de variante tiene datos inválidos.')
    }
  }

  return imagenes as ImagenVarianteAdmin[]
}

function crearFormularioImagen(
  archivo: File,
): FormData {
  const formulario = new FormData()
  formulario.append('imagen', archivo)
  return formulario
}

async function obtenerDatos(ruta: string): Promise<unknown> {
  const respuesta = await fetch(ruta, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })

  return comprobarRespuesta(respuesta)
}

export async function obtenerCategoriasAdmin(): Promise<CategoriaAdmin[]> {
  const datos = await obtenerDatos('/api/v1/admin/categories')

  if (!esObjeto(datos) || !Array.isArray(datos.categorias)) {
    throw new Error('La respuesta de categorías administrativas no es válida.')
  }

  return (datos as RespuestaCategoriasAdmin).categorias
}


export async function crearProductoAdmin(
  datos: CrearProductoAdmin,
): Promise<string> {
  const resultado = await enviarSolicitudProtegida(
    '/api/v1/admin/products',
    {
      metodo: 'POST',
      cuerpo: datos,
    },
  )

  if (
    !esObjeto(resultado)
    || !esObjeto(resultado.producto)
    || typeof resultado.producto.id !== 'string'
    || !resultado.producto.id
  ) {
    throw new Error('No se recibió un identificador válido del producto creado.')
  }

  return resultado.producto.id
}

export async function obtenerProductosAdmin(): Promise<ProductoAdmin[]> {
  const datos = await obtenerDatos('/api/v1/admin/products')

  if (!esObjeto(datos) || !Array.isArray(datos.productos)) {
    throw new Error('La respuesta de productos administrativos no es válida.')
  }

  return (datos as RespuestaProductosAdmin).productos
}

export async function actualizarProductoAdmin(
  id: string,
  cambios: ActualizarProductoAdmin,
): Promise<void> {
  await enviarSolicitudProtegida(
    `/api/v1/admin/products/${encodeURIComponent(id)}`,
    {
      metodo: 'PATCH',
      cuerpo: cambios,
    },
  )
}

export async function actualizarVarianteAdmin(
  id: string,
  cambios: ActualizarVarianteAdmin,
): Promise<void> {
  await enviarSolicitudProtegida(
    `/api/v1/admin/variants/${encodeURIComponent(id)}`,
    {
      metodo: 'PATCH',
      cuerpo: cambios,
    },
  )
}

export async function crearVarianteAdmin(
  productoId: string,
  datos: CrearVarianteAdmin,
): Promise<void> {
  await enviarSolicitudProtegida(
    `/api/v1/admin/products/${encodeURIComponent(productoId)}/variants`,
    {
      metodo: 'POST',
      cuerpo: datos,
    },
  )
}

export async function ajustarStockAdmin(
  id: string,
  cambios: AjustarStockAdmin,
): Promise<ResultadoAjusteStockAdmin> {
  const resultado = await enviarSolicitudProtegida(
    `/api/v1/admin/variants/${encodeURIComponent(id)}/stock`,
    {
      metodo: 'PATCH',
      cuerpo: cambios,
    },
  )

  if (
    !esObjeto(resultado)
    || typeof resultado.mensaje !== 'string'
    || !esObjeto(resultado.inventario)
  ) {
    throw new Error('La respuesta del ajuste de stock no es válida.')
  }

  return resultado as unknown as ResultadoAjusteStockAdmin
}

export async function cargarImagenProductoAdmin(
  productoId: string,
  archivo: File,
): Promise<string> {
  const resultado = await enviarSolicitudProtegida(
    `/api/v1/admin/products/${encodeURIComponent(productoId)}/image`,
    {
      metodo: 'POST',
      cuerpo: crearFormularioImagen(archivo),
    },
  )

  return validarRespuestaImagen(resultado)
}

export async function eliminarImagenProductoAdmin(
  productoId: string,
): Promise<void> {
  await enviarSolicitudProtegida(
    `/api/v1/admin/products/${encodeURIComponent(productoId)}/image`,
    { metodo: 'DELETE' },
  )
}

export async function cargarImagenPrincipalVarianteAdmin(
  varianteId: string,
  archivo: File,
): Promise<string> {
  const resultado = await enviarSolicitudProtegida(
    `/api/v1/admin/variants/${encodeURIComponent(varianteId)}/image`,
    {
      metodo: 'POST',
      cuerpo: crearFormularioImagen(archivo),
    },
  )

  return validarRespuestaImagen(resultado)
}

export async function eliminarImagenPrincipalVarianteAdmin(
  varianteId: string,
): Promise<void> {
  await enviarSolicitudProtegida(
    `/api/v1/admin/variants/${encodeURIComponent(varianteId)}/image`,
    { metodo: 'DELETE' },
  )
}

export async function obtenerImagenesVarianteAdmin(
  varianteId: string,
): Promise<ImagenVarianteAdmin[]> {
  const resultado = await obtenerDatos(
    `/api/v1/admin/variants/${encodeURIComponent(varianteId)}/images`,
  )

  return validarImagenes(resultado)
}

export async function cargarImagenAdicionalVarianteAdmin(
  varianteId: string,
  archivo: File,
  posicion: number,
): Promise<string> {
  if (!Number.isInteger(posicion) || posicion < 1 || posicion > 3) {
    throw new Error('La posición de la imagen debe ser de 1 a 3.')
  }

  const formulario = crearFormularioImagen(archivo)
  formulario.append('posicion', String(posicion))

  const resultado = await enviarSolicitudProtegida(
    `/api/v1/admin/variants/${encodeURIComponent(varianteId)}/images`,
    {
      metodo: 'POST',
      cuerpo: formulario,
    },
  )

  return validarRespuestaImagen(resultado)
}

export async function eliminarImagenAdicionalVarianteAdmin(
  varianteId: string,
  imagenId: string,
): Promise<void> {
  await enviarSolicitudProtegida(
    `/api/v1/admin/variants/${encodeURIComponent(varianteId)}/images/${encodeURIComponent(imagenId)}`,
    { metodo: 'DELETE' },
  )
}
