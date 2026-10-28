
import { useState, type FormEvent } from 'react'

import AuthMessage from './AuthMessage'
import { validarRegistro } from '../schemas/auth.schemas'
import type { DatosRegistro } from '../types/auth.types'

interface RegisterFormProps {
  procesando: boolean
  error: string
  mensajeExito: string
  onSubmit: (datos: DatosRegistro) => Promise<boolean>
  onSwitchLogin: () => void
}

export default function RegisterForm({
  procesando,
  error,
  mensajeExito,
  onSubmit,
  onSwitchLogin,
}: RegisterFormProps) {
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [errores, setErrores] = useState<
    Partial<Record<keyof DatosRegistro, string>>
  >({})

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    const resultado = validarRegistro({ nombre, correo, contrasena })
    setErrores(resultado.errores)

    if (!resultado.datos) return

    const correcto = await onSubmit(resultado.datos)

    if (correcto) {
      setNombre('')
      setCorreo('')
      setContrasena('')
      setErrores({})
    }
  }

  return (
    <form className="auth-form" onSubmit={manejarEnvio} noValidate>
      <div className="auth-form__field">
        <label htmlFor="auth-registro-nombre">Nombre completo</label>
        <input
          id="auth-registro-nombre"
          name="nombre"
          type="text"
          autoComplete="name"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
          aria-invalid={Boolean(errores.nombre)}
          aria-describedby={errores.nombre ? 'auth-registro-nombre-error' : undefined}
          required
        />
        {errores.nombre && (
          <span className="auth-form__error" id="auth-registro-nombre-error">
            {errores.nombre}
          </span>
        )}
      </div>

      <div className="auth-form__field">
        <label htmlFor="auth-registro-correo">Correo electrónico</label>
        <input
          id="auth-registro-correo"
          name="correo"
          type="email"
          autoComplete="email"
          value={correo}
          onChange={(evento) => setCorreo(evento.target.value)}
          aria-invalid={Boolean(errores.correo)}
          aria-describedby={errores.correo ? 'auth-registro-correo-error' : undefined}
          required
        />
        {errores.correo && (
          <span className="auth-form__error" id="auth-registro-correo-error">
            {errores.correo}
          </span>
        )}
      </div>

      <div className="auth-form__field">
        <label htmlFor="auth-registro-contrasena">Contraseña</label>
        <input
          id="auth-registro-contrasena"
          name="contrasena"
          type="password"
          autoComplete="new-password"
          value={contrasena}
          onChange={(evento) => setContrasena(evento.target.value)}
          aria-invalid={Boolean(errores.contrasena)}
          aria-describedby={
            errores.contrasena ? 'auth-registro-contrasena-error' : undefined
          }
          required
        />
        <small className="auth-form__hint">
          Usa entre 12 y 128 caracteres.
        </small>
        {errores.contrasena && (
          <span className="auth-form__error" id="auth-registro-contrasena-error">
            {errores.contrasena}
          </span>
        )}
      </div>

      <AuthMessage mensaje={error} tipo="error" />
      <AuthMessage mensaje={mensajeExito} tipo="exito" />

      <button className="auth-submit" type="submit" disabled={procesando}>
        {procesando ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>

      <p className="auth-form__switch">
        ¿Ya tienes una cuenta?{' '}
        <button type="button" onClick={onSwitchLogin} disabled={procesando}>
          Iniciar sesión
        </button>
      </p>
    </form>
  )
}
