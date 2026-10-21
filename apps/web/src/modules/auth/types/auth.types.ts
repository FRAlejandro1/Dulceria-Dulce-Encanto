
export type RolUsuario = 'CLIENTE' | 'ADMIN'

export interface UsuarioAutenticado {
  id: string
  nombre: string
  correo: string
  rol: RolUsuario
}

export interface DatosInicioSesion {
  correo: string
  contrasena: string
}

export interface DatosRegistro {
  nombre: string
  correo: string
  contrasena: string
}

export interface RespuestaInicioSesion {
  usuario: UsuarioAutenticado
  expiraEn: string
}

export interface RespuestaRegistro {
  usuario: UsuarioAutenticado
}

export type ModoAutenticacion = 'login' | 'registro'

export interface ResultadoCsrf {
  csrfToken: string
}
