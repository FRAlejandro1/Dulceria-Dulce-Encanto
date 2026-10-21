import { RUTAS_AUTENTICACION } from '../constants/auth.constants'
import type {
  DatosInicioSesion,
  DatosRegistro,
  RespuestaInicioSesion,
  RespuestaRegistro,
  ResultadoCsrf,
  UsuarioAutenticado,
} from '../types/auth.types'
import { esObjeto } from '../utils/auth.utils'

async function leerJson(respuesta: Response): Promise<unknown> {
  try {
    return await respuesta.json()
  } catch {
    throw new Error('El servidor devolvió una respuesta inválida.')
  }
}

async function comprobarRespuesta(
  respuesta: Response,
): Promise<unknown> {
  if (respuesta.status === 204) {
    return undefined
  }

  const datos = await leerJson(respuesta)

  if (!respuesta.ok) {
    if (esObjeto(datos) && typeof datos.error === 'string') {
      throw new Error(datos.error)
    }

    throw new Error('No se pudo procesar la solicitud.')
  }

  return datos
}

function validarRespuestaCsrf(datos: unknown): asserts datos is ResultadoCsrf {
  if (
    !esObjeto(datos)
    || typeof datos.csrfToken !== 'string'
    || datos.csrfToken.length === 0
  ) {
    throw new Error('No se pudo obtener el token de seguridad.')
  }
}

async function obtenerTokenCsrf(): Promise<string> {
  const respuesta = await fetch(RUTAS_AUTENTICACION.csrf, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })

  const datos = await comprobarRespuesta(respuesta)

  validarRespuestaCsrf(datos)

  return datos.csrfToken
}

async function enviarSolicitudProtegida(
  ruta: string,
  metodo: 'POST',
  cuerpo?: unknown,
): Promise<unknown> {
  const csrfToken = await obtenerTokenCsrf()
  const encabezados: Record<string, string> = {
    Accept: 'application/json',
    'X-CSRF-Token': csrfToken,
  }

  if (cuerpo !== undefined) {
    encabezados['Content-Type'] = 'application/json'
  }

  const respuesta = await fetch(ruta, {
    method: metodo,
    credentials: 'include',
    headers: encabezados,
    ...(cuerpo === undefined
      ? {}
      : { body: JSON.stringify(cuerpo) }),
  })

  return comprobarRespuesta(respuesta)
}

function validarRespuestaUsuario(
  datos: unknown,
): asserts datos is { usuario: UsuarioAutenticado } {
  if (
    !esObjeto(datos)
    || !esObjeto(datos.usuario)
    || typeof datos.usuario.id !== 'string'
    || typeof datos.usuario.nombre !== 'string'
    || typeof datos.usuario.correo !== 'string'
    || (
      datos.usuario.rol !== 'CLIENTE'
      && datos.usuario.rol !== 'ADMIN'
    )
  ) {
    throw new Error('El servidor devolvió datos de usuario inválidos.')
  }
}

function validarRespuestaInicioSesion(
  datos: unknown,
): asserts datos is RespuestaInicioSesion {
  validarRespuestaUsuario(datos)

  if (
    !('expiraEn' in datos)
    || typeof datos.expiraEn !== 'string'
  ) {
    throw new Error('El servidor devolvió una sesión inválida.')
  }
}

export async function iniciarSesion(
  entrada: DatosInicioSesion,
): Promise<RespuestaInicioSesion> {
  const datos = await enviarSolicitudProtegida(
    RUTAS_AUTENTICACION.login,
    'POST',
    entrada,
  )

  validarRespuestaInicioSesion(datos)

  return {
    usuario: datos.usuario,
    expiraEn: datos.expiraEn,
  }
}

export async function registrarUsuario(
  entrada: DatosRegistro,
): Promise<RespuestaRegistro> {
  const respuesta = await fetch(RUTAS_AUTENTICACION.registro, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entrada),
  })

  const datos = await comprobarRespuesta(respuesta)

  validarRespuestaUsuario(datos)

  return {
    usuario: datos.usuario,
  }
}

export async function cerrarSesion(): Promise<void> {
  await enviarSolicitudProtegida(
    RUTAS_AUTENTICACION.logout,
    'POST',
  )
}