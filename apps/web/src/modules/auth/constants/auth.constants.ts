
export const RUTAS_AUTENTICACION = {
  csrf: '/api/v1/auth/csrf',
  login: '/api/v1/auth/login',
  logout: '/api/v1/auth/logout',
  registro: '/api/v1/users',
} as const

export const MENSAJES_AUTENTICACION = {
  errorGenerico: 'No se pudo completar la solicitud. Inténtalo de nuevo.',
  errorConexion: 'No se pudo conectar con el servidor.',
  registroCorrecto: 'Tu cuenta se creó correctamente. Ahora puedes iniciar sesión.',
  loginCorrecto: 'Has iniciado sesión correctamente.',
  logoutCorrecto: 'Has cerrado sesión correctamente.',
  correoInvalido: 'Introduce un correo electrónico válido.',
  nombreObligatorio: 'El nombre es obligatorio.',
  nombreLongitud: 'El nombre debe tener entre 2 y 120 caracteres.',
  contrasenaLogin: 'La contraseña es obligatoria.',
  contrasenaRegistro:
    'La contraseña debe tener entre 12 y 128 caracteres.',
} as const
