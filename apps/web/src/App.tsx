
import { lazy, Suspense, useState } from 'react'
import './App.css'
import type { Producto, Variante } from './types/catalogo.types'
import type { UsuarioAutenticado } from './modules/auth/types/auth.types'
import { useCatalog } from './modules/catalog/hooks/useCatalog'
import { useCatalogFilters } from './modules/catalog/hooks/useCatalogFilters'
import { useCatalogNavigation } from './modules/catalog/hooks/useCatalogNavigation'
import ProductCard from './modules/catalog/components/ProductCard'
import { useCart } from './modules/cart/hooks/useCart'
import CartPanel from './modules/cart/components/CartPanel'

const Auth = lazy(() => import('./modules/auth/Auth'))
const AdminPanel = lazy(
  () => import('./modules/admin/components/AdminPanel'),
)

function App() {
  const {
    productos,
    estadoCarga,
    reintentarCarga,
  } = useCatalog()

  const [variantesSeleccionadas, setVariantesSeleccionadas] = useState<
    Record<string, string>
  >({})
  const [vistaCarrito, setVistaCarrito] = useState(false)
  const [vistaAdministracion, setVistaAdministracion] = useState(false)
  const [temaOscuro, setTemaOscuro] = useState(false)
  const [panel, setPanel] = useState<
    'ninguno' | 'notificaciones' | 'perfil'
  >('ninguno')
  const [aviso, setAviso] = useState('')

  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null)
  const [authAbierta, setAuthAbierta] = useState(false)

  const {
    busqueda,
    setBusqueda,
    categoria,
    setCategoria,
    orden,
    setOrden,
    favoritos,
    verFavoritos,
    setVerFavoritos,
    categorias,
    productosVisibles,
    alternarFavorito,
    restablecerFiltros: restablecerFiltrosCatalogo,
  } = useCatalogFilters(productos)

  const {
    restablecerFiltros,
    navegarAProductos,
    volverAlInicio,
    abrirCarrito,
    cerrarCarrito,
    alternarFavoritos,
  } = useCatalogNavigation({
    vistaCarrito,
    setVistaCarrito,
    setPanel,
    setVerFavoritos,
    setCategoria,
    restablecerFiltrosCatalogo,
  })

  const {
    carrito,
    cantidadCarrito,
    agregarVariante,
    cambiarCantidad,
    eliminarVariante,
  } = useCart(productos)

  function abrirAutenticacion() {
    setPanel('ninguno')
    setAuthAbierta(true)
  }

  function cerrarAutenticacion() {
    setAuthAbierta(false)
  }

  function manejarAutenticacion(
    usuarioAutenticado: UsuarioAutenticado,
  ) {
    setUsuario(usuarioAutenticado)
    setAuthAbierta(false)
    setPanel('ninguno')
    setVistaCarrito(false)

    const esAdministrador = usuarioAutenticado.rol === 'ADMIN'
    setVistaAdministracion(esAdministrador)

    setAviso(
      esAdministrador
        ? `Sesión administrativa iniciada como ${usuarioAutenticado.nombre}.`
        : `Sesión iniciada como ${usuarioAutenticado.nombre}.`,
    )
  }

  function manejarCierreSesion() {
    setUsuario(null)
    setVistaAdministracion(false)
    setVistaCarrito(false)
    setPanel('ninguno')
    setAuthAbierta(false)
    setAviso(
      'Has cerrado sesión. Tus favoritos y carrito siguen siendo temporales.',
    )
  }

  function volverATienda() {
    setVistaAdministracion(false)
    setVistaCarrito(false)
    setPanel('ninguno')
    volverAlInicio()
  }

  function abrirAdministracion() {
    if (usuario?.rol !== 'ADMIN') {
      setAviso('No tienes permisos para acceder a la administración.')
      return
    }

    setVistaAdministracion(true)
    setVistaCarrito(false)
    setPanel('ninguno')
    setAuthAbierta(false)
  }

  function obtenerVarianteSeleccionada(
    producto: Producto,
  ): Variante | undefined {
    const idSeleccionado = variantesSeleccionadas[producto.id]

    return (
      producto.variantes.find((variante) => variante.id === idSeleccionado) ??
      producto.variantes[0]
    )
  }

  function agregarAlCarrito(producto: Producto) {
    const variante = obtenerVarianteSeleccionada(producto)

    if (!variante) {
      setAviso('Este producto no tiene variantes disponibles.')
      return
    }

    const error = agregarVariante(variante)

    if (error) {
      setAviso(error)
      return
    }

    setAviso(`${producto.nombre} se añadió al carrito.`)
  }

  function manejarCambioCantidad(varianteId: string, cantidad: number) {
    const error = cambiarCantidad(varianteId, cantidad)

    if (error) {
      setAviso(error)
    }
  }

  function finalizarPedidoNoDisponible() {
    setAviso('La finalización de pedidos todavía no está disponible.')
  }

  return (
    <main
      id="inicio"
      className={temaOscuro ? 'app app--dark' : 'app'}
    >
      <header className="topbar">
        <a
          className="brand"
          href="#inicio"
          aria-label="Dulce Encanto, inicio"
          onClick={(evento) => {
            evento.preventDefault()

            if (vistaAdministracion) {
              volverATienda()
            } else {
              volverAlInicio()
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
          <nav className="main-nav" aria-label="Navegación administrativa">
            <button
              type="button"
              className="main-nav__item"
              onClick={volverATienda}
            >
              Volver a la tienda
            </button>
          </nav>
        ) : (
          <nav className="main-nav" aria-label="Navegación principal">
            <a
              className="main-nav__item"
              href="#inicio"
              onClick={(evento) => {
                evento.preventDefault()
                volverAlInicio()
              }}
            >
              Inicio
            </a>

            <a
              className="main-nav__item"
              href="#productos"
              onClick={(evento) => {
                evento.preventDefault()
                navegarAProductos(true)
              }}
            >
              Ofertas
            </a>

            <a
              className="main-nav__item"
              href="#productos"
              onClick={(evento) => {
                evento.preventDefault()
                navegarAProductos(false)
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
              onClick={alternarFavoritos}
              aria-pressed={verFavoritos}
            >
              Favoritos <span className="nav-count">{favoritos.length}</span>
            </button>
          </nav>
        )}

        <div className="header-actions">
          {!vistaAdministracion && (
            <button
              type="button"
              className="icon-button"
              aria-label="Notificaciones"
              onClick={() =>
                setPanel((actual) =>
                  actual === 'notificaciones' ? 'ninguno' : 'notificaciones',
                )
              }
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
              </svg>
              <span className="notification-dot" />
            </button>
          )}

          {!vistaAdministracion && (
            <button
              type="button"
              className="icon-button cart-button"
              aria-label={`Carrito, ${cantidadCarrito} productos`}
              aria-pressed={vistaCarrito}
              onClick={abrirCarrito}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6M10 21h.01M18 21h.01" />
              </svg>
              {cantidadCarrito > 0 && (
                <span className="icon-button__badge">{cantidadCarrito}</span>
              )}
            </button>
          )}

          <button
            type="button"
            className="icon-button theme-button"
            aria-label={
              temaOscuro ? 'Activar modo claro' : 'Activar modo oscuro'
            }
            onClick={() => setTemaOscuro((actual) => !actual)}
          >
            {temaOscuro ? '☀' : '☾'}
          </button>

          <button
            type="button"
            className="profile-button"
            onClick={abrirAutenticacion}
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

      {!vistaAdministracion && panel !== 'ninguno' && (
        <section className="floating-panel" aria-live="polite">
          <button
            type="button"
            className="toast__close floating-panel__close"
            onClick={() => setPanel('ninguno')}
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
                  onClick={abrirAdministracion}
                >
                  Abrir administración
                </button>
              )}

              <button
                type="button"
                className="floating-panel__action"
                onClick={abrirAutenticacion}
              >
                {usuario ? 'Ver mi cuenta' : 'Iniciar sesión'}
              </button>
            </>
          )}
        </section>
      )}

      {authAbierta && (
        <Suspense
          fallback={
            <div className="toast" role="status">
              Cargando acceso…
            </div>
          }
        >
          <Auth
            open={authAbierta}
            usuario={usuario}
            onClose={cerrarAutenticacion}
            onAuthenticated={manejarAutenticacion}
            onLogout={manejarCierreSesion}
          />
        </Suspense>
      )}

      {vistaAdministracion && usuario?.rol === 'ADMIN' ? (
        <Suspense
          fallback={
            <div className="catalog-status" role="status">
              Cargando administración…
            </div>
          }
        >
          <AdminPanel
            productos={productos}
            alVolverATienda={volverATienda}
          />
        </Suspense>
      ) : vistaCarrito ? (
        <CartPanel
          productos={productos}
          carrito={carrito}
          onCerrar={cerrarCarrito}
          onCambiarCantidad={manejarCambioCantidad}
          onEliminar={eliminarVariante}
          onFinalizarPedido={finalizarPedidoNoDisponible}
        />
      ) : (
        <section className="catalog" id="productos">
          <div className="catalog__intro">
            <div>
              <p className="eyebrow">HECHO CON AMOR, PARA COMPARTIR</p>
              <h1 className="catalog__title">
                {verFavoritos ? 'Mis favoritos' : 'Nuestros productos'}
              </h1>
              <p className="catalog__description">
                {verFavoritos
                  ? 'Tus dulces preferidos, siempre a mano.'
                  : 'Pequeños detalles que convierten cualquier día en algo especial.'}
              </p>
            </div>

            <span className="catalog-decoration" aria-hidden="true">
              ♡
            </span>
          </div>

          <section
            className="catalog-toolbar"
            aria-label="Buscar y filtrar productos"
          >
            <div className="search-box">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="10.8" cy="10.8" r="6.8" />
                <path d="m16 16 5 5" />
              </svg>

              <input
                aria-label="Buscar productos"
                placeholder="¿Qué se te antoja hoy?"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
              />
            </div>

            <label className="sort-control">
              Ordenar por
              <select
                className="sort-select"
                aria-label="Ordenar productos"
                value={orden}
                onChange={(evento) => setOrden(evento.target.value)}
              >
                <option value="destacados">Destacados</option>
                <option value="precio-menor">Precio: menor a mayor</option>
                <option value="precio-mayor">Precio: mayor a menor</option>
              </select>
            </label>
          </section>

          <div className="category-list" aria-label="Categorías">
            {categorias.map((nombre) => (
              <button
                type="button"
                key={nombre}
                className={
                  categoria === nombre
                    ? 'category-chip category-chip--active'
                    : 'category-chip'
                }
                onClick={() => setCategoria(nombre)}
                aria-pressed={categoria === nombre}
              >
                {nombre}
              </button>
            ))}
          </div>

          {estadoCarga === 'cargando' && (
            <div className="catalog-status" role="status">
              Cargando productos…
            </div>
          )}

          {estadoCarga === 'error' && (
            <div className="empty-state" role="alert">
              <h2>No pudimos cargar el catálogo</h2>
              <p>
                Comprueba tu conexión con el servidor e inténtalo de nuevo.
              </p>
              <button
                type="button"
                className="empty-state__reset"
                onClick={reintentarCarga}
              >
                Reintentar
              </button>
            </div>
          )}

          {estadoCarga === 'correcto' && productosVisibles.length > 0 && (
            <section
              className="product-grid"
              aria-label="Catálogo de productos"
            >
              {productosVisibles.map((producto) => {
                const variante = obtenerVarianteSeleccionada(producto)

                if (!variante) return null

                return (
                  <ProductCard
                    key={producto.id}
                    producto={producto}
                    variante={variante}
                    favorito={favoritos.includes(producto.id)}
                    cantidadEnCarrito={carrito[variante.id] ?? 0}
                    onCambiarVariante={(productoId, varianteId) =>
                      setVariantesSeleccionadas((actual) => ({
                        ...actual,
                        [productoId]: varianteId,
                      }))
                    }
                    onAlternarFavorito={alternarFavorito}
                    onAgregar={agregarAlCarrito}
                  />
                )
              })}
            </section>
          )}

          {estadoCarga === 'correcto' && productosVisibles.length === 0 && (
            <div className="empty-state">
              <span className="empty-state__icon" aria-hidden="true">
                ♡
              </span>

              <h2>
                {verFavoritos && favoritos.length === 0
                  ? 'Aún no tienes favoritos'
                  : 'No encontramos productos'}
              </h2>

              <p>
                {verFavoritos && favoritos.length === 0
                  ? 'Guarda productos con el corazón para encontrarlos aquí.'
                  : 'Prueba con otra búsqueda o categoría.'}
              </p>

              <button
                type="button"
                className="empty-state__reset"
                onClick={restablecerFiltros}
              >
                Ver todos los productos
              </button>
            </div>
          )}

          <p className="demo-notice">
            Los productos, precios y existencias se consultan desde el catálogo
            de la tienda. Las imágenes se asignan en el frontend porque la API
            actual no incluye ese campo. Los favoritos y el carrito son
            temporales y no se guardan en el servidor.
          </p>
        </section>
      )}

      {aviso && (
        <div className="toast" role="status">
          <span className="toast__message">{aviso}</span>
          <button
            type="button"
            className="toast__close"
            onClick={() => setAviso('')}
            aria-label="Cerrar aviso"
          >
            ×
          </button>
        </div>
      )}

      {!vistaAdministracion && (
        <footer className="footer">
          <span className="brand__mark footer__mark">DE</span>
          <p>© Dulce Encanto · Hecho para compartir momentos dulces.</p>
          <a
            href="#inicio"
            onClick={(evento) => {
              evento.preventDefault()
              volverAlInicio()
            }}
          >
            Volver arriba ↑
          </a>
        </footer>
      )}
    </main>
  )
}

export default App
