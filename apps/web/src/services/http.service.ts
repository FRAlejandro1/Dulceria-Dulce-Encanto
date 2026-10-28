const RUTA_CSRF = '/api/v1/auth/csrf'

type MetodoProtegido = 'POST' | 'PATCH' | 'DELETE'

type OpcionesSolicitudProtegida = {
  metodo: MetodoProtegido
  cuerpo?: unknown
}

function esObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null
}

export async function leerRespuestaJson(
  respuesta: Response,
): Promise<unknown> {
  try {
    return await respuesta.json()
  } catch {
    throw new Error('El servidor devolvió una respuesta inválida.')
  }
}

export async function comprobarRespuesta(
  respuesta: Response,
): Promise<unknown> {
  if (respuesta.status === 204) {
    return undefined
  }

  const datos = await leerRespuestaJson(respuesta)

  if (!respuesta.ok) {
    if (esObjeto(datos) && typeof datos.error === 'string') {
      throw new Error(datos.error)
    }

    throw new Error('No se pudo procesar la solicitud.')
  }

  return datos
}

async function obtenerTokenCsrf(): Promise<string> {
  const respuesta = await fetch(RUTA_CSRF, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })

  const datos = await comprobarRespuesta(respuesta)

  if (
    !esObjeto(datos) ||
    typeof datos.csrfToken !== 'string' ||
    datos.csrfToken.length === 0
  ) {
    throw new Error('No se pudo obtener el token de seguridad.')
  }

  return datos.csrfToken
}

export async function enviarSolicitudProtegida(
  ruta: string,
  opciones: OpcionesSolicitudProtegida,
): Promise<unknown> {
  const csrfToken = await obtenerTokenCsrf()
  const encabezados: Record<string, string> = {
    Accept: 'application/json',
    'X-CSRF-Token': csrfToken,
  }

  const opcionesFetch: RequestInit = {
    method: opciones.metodo,
    credentials: 'include',
    headers: encabezados,
  }

  if (opciones.cuerpo !== undefined) {
    if (opciones.cuerpo instanceof FormData) {
      opcionesFetch.body = opciones.cuerpo
    } else {
      encabezados['Content-Type'] = 'application/json'
      opcionesFetch.body = JSON.stringify(opciones.cuerpo)
    }
  }

  const respuesta = await fetch(ruta, opcionesFetch)

  return comprobarRespuesta(respuesta)
}
