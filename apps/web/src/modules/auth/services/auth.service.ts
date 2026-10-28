import {
  comprobarRespuesta,
  enviarSolicitudProtegida,
} from '../../../services/http.service'
import { RUTAS_AUTENTICACION } from '../constants/auth.constants'
import type {
  DatosInicioSesion,
  DatosRegistro,
  RespuestaInicioSesion,
  RespuestaRegistro,
  UsuarioAutenticado,
} from '../types/auth.types'
import { esObjeto } from '../utils/auth.utils'

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
    {
      metodo: 'POST',
      cuerpo: entrada,
    },
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
    {
      metodo: 'POST',
    },
  )
}
