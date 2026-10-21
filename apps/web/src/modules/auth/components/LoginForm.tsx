
import { useState, type FormEvent } from 'react'

import AuthMessage from './AuthMessage'
import { validarInicioSesion } from '../schemas/auth.schemas'
import type { DatosInicioSesion } from '../types/auth.types'

interface LoginFormProps {
  procesando: boolean
  error: string
  onSubmit: (datos: DatosInicioSesion) => Promise<boolean>
  onSwitchRegister: () => void
}

export default function LoginForm({
  procesando,
  error,
  onSubmit,
  onSwitchRegister,
}: LoginFormProps) {
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [errores, setErrores] = useState<
    Partial<Record<keyof DatosInicioSesion, string>>
  >({})

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    const resultado = validarInicioSesion({ correo, contrasena })
    setErrores(resultado.errores)

    if (!resultado.datos) return

    await onSubmit(resultado.datos)
  }

  return (
    <form className="auth-form" onSubmit={manejarEnvio} noValidate>
      <div className="auth-form__field">
        <label htmlFor="auth-login-correo">Correo electrónico</label>
        <input
          id="auth-login-correo"
          name="correo"
          type="email"
          autoComplete="email"
          value={correo}
          onChange={(evento) => setCorreo(evento.target.value)}
          aria-invalid={Boolean(errores.correo)}
          aria-describedby={errores.correo ? 'auth-login-correo-error' : undefined}
          required
        />
        {errores.correo && (
          <span className="auth-form__error" id="auth-login-correo-error">
            {errores.correo}
          </span>
        )}
      </div>

      <div className="auth-form__field">
        <label htmlFor="auth-login-contrasena">Contraseña</label>
        <input
          id="auth-login-contrasena"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          value={contrasena}
          onChange={(evento) => setContrasena(evento.target.value)}
          aria-invalid={Boolean(errores.contrasena)}
          aria-describedby={
            errores.contrasena ? 'auth-login-contrasena-error' : undefined
          }
          required
        />
        {errores.contrasena && (
          <span className="auth-form__error" id="auth-login-contrasena-error">
            {errores.contrasena}
          </span>
        )}
      </div>

      <AuthMessage mensaje={error} tipo="error" />

      <button className="auth-submit" type="submit" disabled={procesando}>
        {procesando ? 'Iniciando sesión…' : 'Iniciar sesión'}
      </button>

      <p className="auth-form__switch">
        ¿Todavía no tienes una cuenta?{' '}
        <button type="button" onClick={onSwitchRegister} disabled={procesando}>
          Crear cuenta
        </button>
      </p>
    </form>
  )
}
