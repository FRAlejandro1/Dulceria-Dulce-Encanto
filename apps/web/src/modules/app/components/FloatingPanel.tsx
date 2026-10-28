import type { UsuarioAutenticado } from '../../auth/types/auth.types'

interface FloatingPanelProps {
  panel: 'ninguno' | 'notificaciones' | 'perfil'
  usuario: UsuarioAutenticado | null
  onCerrar: () => void
  onAbrirAutenticacion: () => void
  onAbrirAdministracion: () => void
}

export default function FloatingPanel({
  panel,
  usuario,
  onCerrar,
  onAbrirAutenticacion,
  onAbrirAdministracion,
}: FloatingPanelProps) {
  if (panel === 'ninguno') {
    return null
  }

  return (
    <section className="floating-panel" aria-live="polite">
      <button
        type="button"
        className="toast__close floating-panel__close"
        onClick={onCerrar}
        aria-label="Cerrar panel"
      >
        ×
      </button>

      <h2 className="floating-panel__title">
        {panel === 'notificaciones' ? 'Notificaciones' : 'Mi cuenta'}
      </h2>

      {panel === 'notificaciones' ? (
        <p>No tienes notificaciones nuevas.</p>
      ) : (
        <>
          <p>
            {usuario
              ? `Has iniciado sesión como ${usuario.nombre}.`
              : 'Inicia sesión para acceder a tu cuenta. Tus favoritos y carrito se gestionan temporalmente en este navegador.'}
          </p>

          {usuario?.rol === 'ADMIN' && (
            <button
              type="button"
              className="floating-panel__action"
              onClick={onAbrirAdministracion}
            >
              Abrir administración
            </button>
          )}

          <button
            type="button"
            className="floating-panel__action"
            onClick={onAbrirAutenticacion}
          >
            {usuario ? 'Ver mi cuenta' : 'Iniciar sesión'}
          </button>
        </>
      )}
    </section>
  )
}
