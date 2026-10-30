import type { UsuarioAutenticado } from '../../auth/types/auth.types'

interface AppHeaderProps {
  cantidadCarrito: number
  cantidadFavoritos: number
  cantidadNotificacionesPendientes: number
  temaOscuro: boolean
  usuario: UsuarioAutenticado | null
  vistaAdministracion: boolean
  verFavoritos: boolean
  panel: 'ninguno' | 'notificaciones' | 'perfil'
  onVolverAlInicio: () => void
  onNavegarAProductos: (restablecerCategoria: boolean) => void
  onAlternarFavoritos: () => void
  onAbrirCarrito: () => void
  onAlternarTema: () => void
  onAlternarPanel: (panel: 'notificaciones' | 'perfil') => void
  onAbrirAutenticacion: () => void
  onVolverATienda: () => void
  vistaAdmin: 'inventario' | 'pedidos'
  onCambiarVistaAdmin: (vista: 'inventario' | 'pedidos') => void
}

export default function AppHeader({
  cantidadCarrito,
  cantidadFavoritos,
  cantidadNotificacionesPendientes,
  temaOscuro,
  usuario,
  vistaAdministracion,
  verFavoritos,
  panel,
  onVolverAlInicio,
  onNavegarAProductos,
  onAlternarFavoritos,
  onAbrirCarrito,
  onAlternarTema,
  onAlternarPanel,
  onAbrirAutenticacion,
  onVolverATienda,
  vistaAdmin,
  onCambiarVistaAdmin,
}: AppHeaderProps) {
  return (
    <header className="topbar">
      <a
        className="brand"
        href="/#inicio"
        aria-label="Dulce Encanto, inicio"
        onClick={(evento) => {
          evento.preventDefault()

          if (vistaAdministracion) {
            onVolverATienda()
          } else {
            onVolverAlInicio()
          }
        }}
      >
        <span className="brand__mark">DE</span>
        <span className="brand__copy">
          <strong className="brand__name">Dulce Encanto</strong>
          <small className="brand__tagline">Momentos que endulzan</small>
        </span>
      </a>

      {vistaAdministracion && usuario?.rol === 'ADMIN' ? (
        <nav className="main-nav admin-header-nav" aria-label="Navegación administrativa">
          <button
            type="button"
            className={vistaAdmin === 'inventario' ? 'main-nav__item main-nav__item--active' : 'main-nav__item'}
            aria-current={vistaAdmin === 'inventario' ? 'page' : undefined}
            onClick={() => onCambiarVistaAdmin('inventario')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
            </svg>
            Inventario
          </button>
          <button
            type="button"
            className={vistaAdmin === 'pedidos' ? 'main-nav__item main-nav__item--active' : 'main-nav__item'}
            aria-current={vistaAdmin === 'pedidos' ? 'page' : undefined}
            onClick={() => onCambiarVistaAdmin('pedidos')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 3h10l3 3v15H4V3zM8 10h8M8 14h8M8 18h5M16 3v4h4" />
            </svg>
            Pedidos
          </button>
        </nav>
      ) : (
        <nav className="main-nav" aria-label="Navegación principal">
          <a
            className="main-nav__item"
            href="/#inicio"
            onClick={(evento) => {
              evento.preventDefault()
              onVolverAlInicio()
            }}
          >
            Inicio
          </a>

          <a
            className="main-nav__item"
            href="#productos"
            onClick={(evento) => {
              evento.preventDefault()
              onNavegarAProductos(true)
            }}
          >
            Ofertas
          </a>

          <a
            className="main-nav__item"
            href="#productos"
            onClick={(evento) => {
              evento.preventDefault()
              onNavegarAProductos(false)
            }}
          >
            Productos
          </a>

          <button
            type="button"
            className={
              verFavoritos
                ? 'main-nav__item main-nav__item--active'
                : 'main-nav__item'
            }
            onClick={onAlternarFavoritos}
            aria-pressed={verFavoritos}
          >
            Favoritos <span className="nav-count">{cantidadFavoritos}</span>
          </button>
        </nav>
      )}

      <div className="header-actions">
        {!vistaAdministracion && (
          <>
            <button
              type="button"
              className="icon-button"
              aria-label={
                cantidadNotificacionesPendientes > 0
                  ? `Notificaciones, ${cantidadNotificacionesPendientes} sin leer`
                  : 'Notificaciones'
              }
              aria-expanded={panel === 'notificaciones'}
              onClick={() => onAlternarPanel('notificaciones')}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
              </svg>

              {cantidadNotificacionesPendientes > 0 && (
                <span className="icon-button__badge">
                  {cantidadNotificacionesPendientes}
                </span>
              )}
            </button>

            <button
              type="button"
              className="icon-button cart-button"
              aria-label={`Carrito, ${cantidadCarrito} productos`}
              aria-pressed={false}
              onClick={onAbrirCarrito}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6M10 21h.01M18 21h.01" />
              </svg>

              {cantidadCarrito > 0 && (
                <span className="icon-button__badge">{cantidadCarrito}</span>
              )}
            </button>
          </>
        )}

        <button
          type="button"
          className="icon-button theme-button"
          aria-label={temaOscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
          onClick={onAlternarTema}
        >
          {temaOscuro ? '☀' : '☾'}
        </button>

        <button
          type="button"
          className="profile-button"
          onClick={onAbrirAutenticacion}
          aria-label="Abrir perfil"
        >
          <span className="profile-button__avatar">
            {usuario?.nombre.charAt(0).toLocaleUpperCase('es') ?? 'U'}
          </span>
          <span className="profile-button__label">
            {usuario?.nombre ?? 'Mi cuenta'}
          </span>
          <span aria-hidden="true">⌄</span>
        </button>
      </div>
    </header>
  )
}
