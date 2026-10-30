import {
  comprobarRespuesta,
  enviarSolicitudProtegida,
} from '../../../services/http.service'
import type { RespuestaFavoritos } from '../types/favorites.types'

const RUTA_FAVORITOS = '/api/v1/favorites'

function esRespuestaFavoritos(
  valor: unknown,
): valor is RespuestaFavoritos {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    'favoritos' in valor &&
    Array.isArray(valor.favoritos) &&
    valor.favoritos.every((id) => typeof id === 'string')
  )
}

export async function obtenerFavoritos(): Promise<string[]> {
  const respuesta = await fetch(RUTA_FAVORITOS, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })

  const datos = await comprobarRespuesta(respuesta)

  if (!esRespuestaFavoritos(datos)) {
    throw new Error('La respuesta de favoritos no tiene un formato válido.')
  }

  return datos.favoritos
}

export async function agregarFavorito(
  productoId: string,
): Promise<void> {
  await enviarSolicitudProtegida(
    `${RUTA_FAVORITOS}/${encodeURIComponent(productoId)}`,
    { metodo: 'POST' },
  )
}

export async function eliminarFavorito(
  productoId: string,
): Promise<void> {
  await enviarSolicitudProtegida(
    `${RUTA_FAVORITOS}/${encodeURIComponent(productoId)}`,
    { metodo: 'DELETE' },
  )
}
