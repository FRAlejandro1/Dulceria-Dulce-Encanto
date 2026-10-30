import type { UsuarioAutenticado } from '../../auth/types/auth.types'
import type { NotificacionPedido } from '../../orders/services/order-notifications.service'

interface FloatingPanelProps {
  panel: 'ninguno' | 'notificaciones' | 'perfil'
  usuario: UsuarioAutenticado | null
  notificaciones: NotificacionPedido[]
  pendientes: number
  cargandoNotificaciones: boolean
  errorNotificaciones: string
  onCerrar: () => void
  onAbrirAutenticacion: () => void
  onAbrirAdministracion: () => void
  onMarcarNotificacionLeida: (id: string) => void
  onReintentarNotificaciones: () => void
}

function formatearFecha(fecha: string): string {
  const valor = new Date(fecha)

  if (Number.isNaN(valor.getTime())) return fecha

  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(valor)
}

export default function FloatingPanel({
  panel,
  usuario,
  notificaciones,
  pendientes,
  cargandoNotificaciones,
  errorNotificaciones,
  onCerrar,
  onAbrirAutenticacion,
  onAbrirAdministracion,
  onMarcarNotificacionLeida,
  onReintentarNotificaciones,
}: FloatingPanelProps) {
  if (panel === 'ninguno') return null

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
        {panel === 'notificaciones' && pendientes > 0
          ? ` (${pendientes})`
          : ''}
      </h2>

      {panel === 'notificaciones' ? (
        !usuario ? (
          <>
            <p>Inicia sesión para consultar tus notificaciones.</p>
            <button
              type="button"
              className="floating-panel__action"
              onClick={onAbrirAutenticacion}
            >
              Iniciar sesión
            </button>
          </>
        ) : (
          <>
            {cargandoNotificaciones && (
              <p role="status">Cargando notificaciones…</p>
            )}

            {errorNotificaciones && (
              <div>
                <p role="alert">{errorNotificaciones}</p>
                <button
                  type="button"
                  className="floating-panel__action"
                  onClick={onReintentarNotificaciones}
                >
                  Reintentar
                </button>
              </div>
            )}

            {!cargandoNotificaciones &&
              !errorNotificaciones &&
              notificaciones.length === 0 && (
                <p>No tienes notificaciones nuevas.</p>
              )}

            <div className="floating-panel__notifications">
              {notificaciones.map((notificacion) => (
                <article
                  className="floating-panel__notification"
                  key={notificacion.id}
                >
                  <h3>{notificacion.titulo}</h3>
                  <p>{notificacion.mensaje}</p>
                  <small>{formatearFecha(notificacion.creadaEn)}</small>

                  {notificacion.leidaEn === null && (
                    <button
                      type="button"
                      className="floating-panel__action"
                      onClick={() =>
                        onMarcarNotificacionLeida(notificacion.id)
                      }
                    >
                      Marcar como leída
                    </button>
                  )}
                </article>
              ))}
            </div>
          </>
        )
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
