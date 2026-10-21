
import type {
  DatosInicioSesion,
  DatosRegistro,
} from '../types/auth.types'

export interface ResultadoValidacion<T> {
  datos?: T
  errores: Partial<Record<keyof T, string>>
}

export function validarInicioSesion(
  entrada: DatosInicioSesion,
): ResultadoValidacion<DatosInicioSesion> {
  const errores: ResultadoValidacion<DatosInicioSesion>['errores'] = {}
  const correo = entrada.correo.trim().toLowerCase()

  if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    errores.correo = 'Introduce un correo electrónico válido.'
  } else if (correo.length > 254) {
    errores.correo = 'El correo no puede superar 254 caracteres.'
  }

  if (entrada.contrasena.length === 0) {
    errores.contrasena = 'La contraseña es obligatoria.'
  } else if (entrada.contrasena.length > 128) {
    errores.contrasena = 'La contraseña no puede superar 128 caracteres.'
  }

  if (Object.keys(errores).length > 0) {
    return { errores }
  }

  return {
    datos: { correo, contrasena: entrada.contrasena },
    errores,
  }
}

export function validarRegistro(
  entrada: DatosRegistro,
): ResultadoValidacion<DatosRegistro> {
  const errores: ResultadoValidacion<DatosRegistro>['errores'] = {}
  const nombre = entrada.nombre.trim()
  const correo = entrada.correo.trim().toLowerCase()

  if (nombre.length < 2 || nombre.length > 120) {
    errores.nombre = 'El nombre debe tener entre 2 y 120 caracteres.'
  }

  if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    errores.correo = 'Introduce un correo electrónico válido.'
  } else if (correo.length > 254) {
    errores.correo = 'El correo no puede superar 254 caracteres.'
  }

  if (entrada.contrasena.length < 12 || entrada.contrasena.length > 128) {
    errores.contrasena =
      'La contraseña debe tener entre 12 y 128 caracteres.'
  }

  if (Object.keys(errores).length > 0) {
    return { errores }
  }

  return {
    datos: { nombre, correo, contrasena: entrada.contrasena },
    errores,
  }
}
