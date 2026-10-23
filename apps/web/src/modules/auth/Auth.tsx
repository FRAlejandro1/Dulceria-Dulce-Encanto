import { useEffect, useRef, useState } from 'react'

import { MENSAJES_AUTENTICACION } from './constants/auth.constants'
import { useAuth } from './hooks/useAuth'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import AuthMessage from './components/AuthMessage'
import type { ModoAutenticacion, UsuarioAutenticado } from './types/auth.types'
import './Auth.css'

interface AuthProps {
  open: boolean
  usuario: UsuarioAutenticado | null
  onClose: () => void
  onAuthenticated: (usuario: UsuarioAutenticado) => void
  onLogout: () => void
}

export default function Auth({
  open,
  usuario,
  onClose,
  onAuthenticated,
  onLogout,
}: AuthProps) {
  const [modo, setModo] = useState<ModoAutenticacion>('login')
  const [mensajeExito, setMensajeExito] = useState('')
  const [mensajeCuenta, setMensajeCuenta] = useState('')

  const {
    usuario: usuarioSesion,
    procesando,
    error,
    iniciarSesion,
    registrarUsuario,
    cerrarSesion,
    limpiarError,
  } = useAuth()

  const notificarAutenticacion = useRef(onAuthenticated)

  useEffect(() => {
    notificarAutenticacion.current = onAuthenticated
  }, [onAuthenticated])

  useEffect(() => {
    if (usuarioSesion) {
      notificarAutenticacion.current(usuarioSesion)
    }
  }, [usuarioSesion])

  useEffect(() => {
    if (!open) return

    function manejarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !procesando) {
        onClose()
      }
    }

    window.addEventListener('keydown', manejarTecla)

    return () => {
      window.removeEventListener('keydown', manejarTecla)
    }
  }, [open, procesando, onClose])

  if (!open) return null

  function cambiarModo(nuevoModo: ModoAutenticacion) {
    limpiarError()
    setMensajeExito('')
    setMensajeCuenta('')
    setModo(nuevoModo)
  }

  async function manejarRegistro(
    datos: Parameters<typeof registrarUsuario>[0],
  ) {
    const correcto = await registrarUsuario(datos)

    if (correcto) {
      setModo('login')
      setMensajeExito(MENSAJES_AUTENTICACION.registroCorrecto)
      limpiarError()
    }

    return correcto
  }

  async function manejarCierreSesion() {
    const correcto = await cerrarSesion()

    if (correcto) {
      setMensajeCuenta(MENSAJES_AUTENTICACION.logoutCorrecto)
      onLogout()
    }
  }

  const usuarioActual = usuario ?? usuarioSesion

  return (
    <div className="auth-overlay">
      <button
        className="auth-overlay__backdrop"
        type="button"
        aria-label="Cerrar el diálogo"
        onClick={() => {
          if (!procesando) onClose()
        }}
        disabled={procesando}
        tabIndex={-1}
      />

      <section
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        aria-describedby="auth-description"
      >
        <button
          className="auth-dialog__close"
          type="button"
          aria-label="Cerrar autenticación"
          onClick={() => {
            if (!procesando) onClose()
          }}
          disabled={procesando}
        >
          ×
        </button>

        <div className="auth-brand">
          <span className="auth-brand__mark" aria-hidden="true">
            DE
          </span>
          <span>
            <strong>Dulce Encanto</strong>
            <small>Momentos que endulzan</small>
          </span>
        </div>

        {usuarioActual ? (
          <div className="auth-account">
            <h2 id="auth-title">Mi cuenta</h2>
            <p id="auth-description">Has iniciado sesión.</p>
            <p className="auth-account__name">{usuarioActual.nombre}</p>
            <p className="auth-account__email">{usuarioActual.correo}</p>

            <AuthMessage mensaje={mensajeCuenta} tipo="exito" />

            {error && <AuthMessage mensaje={error} tipo="error" />}

            <button
              className="auth-submit"
              type="button"
              onClick={() => void manejarCierreSesion()}
              disabled={procesando}
            >
              {procesando ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </button>
          </div>
        ) : (
          <>
            <h2 id="auth-title">
              {modo === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
            </h2>

            <p id="auth-description" className="auth-dialog__description">
              {modo === 'login'
                ? 'Inicia sesión para continuar.'
                : 'Regístrate para acceder a tu cuenta.'}
            </p>

            <div className="auth-tabs" aria-label="Tipo de acceso">
              <button
                type="button"
                className={
                  modo === 'login'
                    ? 'auth-tabs__item auth-tabs__item--active'
                    : 'auth-tabs__item'
                }
                aria-pressed={modo === 'login'}
                onClick={() => cambiarModo('login')}
                disabled={procesando}
              >
                Iniciar sesión
              </button>

              <button
                type="button"
                className={
                  modo === 'registro'
                    ? 'auth-tabs__item auth-tabs__item--active'
                    : 'auth-tabs__item'
                }
                aria-pressed={modo === 'registro'}
                onClick={() => cambiarModo('registro')}
                disabled={procesando}
              >
                Crear cuenta
              </button>
            </div>

            {modo === 'login' ? (
              <>
                <AuthMessage mensaje={mensajeExito} tipo="exito" />

                <LoginForm
                  procesando={procesando}
                  error={error}
                  onSubmit={iniciarSesion}
                  onSwitchRegister={() => cambiarModo('registro')}
                />
              </>
            ) : (
              <RegisterForm
                procesando={procesando}
                error={error}
                mensajeExito=""
                onSubmit={manejarRegistro}
                onSwitchLogin={() => cambiarModo('login')}
              />
            )}
          </>
        )}
      </section>
    </div>
  )
}