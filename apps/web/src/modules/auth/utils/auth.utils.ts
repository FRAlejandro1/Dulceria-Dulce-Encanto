
import { MENSAJES_AUTENTICACION } from '../constants/auth.constants'

export function esObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null
}

export function obtenerMensajeError(error: unknown): string {
  if (error instanceof TypeError) {
    return MENSAJES_AUTENTICACION.errorConexion
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return MENSAJES_AUTENTICACION.errorGenerico
}
