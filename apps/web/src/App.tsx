import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import './App.css'
import type {
  EstadoCarga,
  Producto,
  RespuestaCatalogo,
  Variante,
} from './types/catalogo.types'
import type { UsuarioAutenticado } from './modules/auth/types/auth.types'
import { useCart } from './modules/cart/hooks/useCart'
import CartPanel from './modules/cart/components/CartPanel'

const Auth = lazy(() => import('./modules/auth/Auth'))

const IMAGEN_POR_DEFECTO =
  'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=700&q=85'

function obtenerPrecio(variante: Variante): number {
  const precio = Number(variante.precio)
  return Number.isFinite(precio) && precio >= 0 ? precio : 0
}

function obtenerPrecioMinimo(producto: Producto): number {
  if (producto.variantes.length === 0) return Number.POSITIVE_INFINITY

  return Math.min(...producto.variantes.map(obtenerPrecio))
}

function desplazarAProductos(): void {
  const elemento = document.getElementById('productos')

  if (typeof elemento?.scrollIntoView === 'function') {
    elemento.scrollIntoView({
      behavior: 'auto',
      block: 'start',
    })
  }
}

function desplazarAlInicio(): void {
  if (typeof window.scrollTo === 'function') {
    window.scrollTo({
      top: 0,
      behavior: 'auto',
    })
  }
}

function App() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [estadoCarga, setEstadoCarga] = useState<EstadoCarga>('cargando')
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todos')
  const [orden, setOrden] = useState('destacados')
  const [favoritos, setFavoritos] = useState<string[]>([])
  const [verFavoritos, setVerFavoritos] = useState(false)
  const [variantesSeleccionadas, setVariantesSeleccionadas] = useState<
    Record<string, string>
  >({})
  const [vistaCarrito, setVistaCarrito] = useState(false)
  const [temaOscuro, setTemaOscuro] = useState(false)
  const [panel, setPanel] = useState<
    'ninguno' | 'notificaciones' | 'perfil'
  >('ninguno')
  const [aviso, setAviso] = useState('')

  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null)
  const [authAbierta, setAuthAbierta] = useState(false)

  const destinoPendiente = useRef(false)

  const {
    carrito,
    cantidadCarrito,
    agregarVariante,
    cambiarCantidad,
    eliminarVariante,
  } = useCart(productos)

  useEffect(() => {
    const controlador = new AbortController()

    async function cargarCatalogo() {
      setEstadoCarga('cargando')

      try {
        const respuesta = await fetch('/api/v1/catalog/products', {
          signal: controlador.signal,
          headers: { Accept: 'application/json' },
        })

        if (!respuesta.ok) {
          throw new Error('No se pudo cargar el catálogo.')
        }

        const datos: unknown = await respuesta.json()

        if (
          typeof datos !== 'object' ||
          datos === null ||
          !('productos' in datos) ||
          !Array.isArray((datos as RespuestaCatalogo).productos)
        ) {
          throw new Error(
            'La respuesta del catálogo no tiene el formato esperado.',
          )
        }

        const catalogo = (datos as RespuestaCatalogo).productos.filter(
          (producto): producto is Producto =>
            typeof producto.id === 'string' &&
            typeof producto.nombre === 'string' &&
            typeof producto.categoria?.nombre === 'string' &&
            typeof producto.categoria?.slug === 'string' &&
            Array.isArray(producto.variantes),
        )

        setProductos(catalogo)
        setEstadoCarga('correcto')
      } catch {
        if (!controlador.signal.aborted) {
          setEstadoCarga('error')
        }
      }
    }

    void cargarCatalogo()

    return () => controlador.abort()
  }, [])

  useEffect(() => {
    if (vistaCarrito || !destinoPendiente.current) {
      return
    }

    desplazarAProductos()
    destinoPendiente.current = false
  }, [vistaCarrito])

  const categorias = useMemo(
    () => [
      'Todos',
      ...Array.from(
        new Set(productos.map((producto) => producto.categoria.nombre)),
      ).sort((a, b) => a.localeCompare(b, 'es')),
    ],
    [productos],
  )

  const productosVisibles = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase('es')

    const lista = productos.filter((producto) => {
      const coincideTexto =
        `${producto.nombre} ${producto.descripcion ?? ''}`
          .toLocaleLowerCase('es')
          .includes(texto)

      const coincideCategoria =
        categoria === 'Todos' || producto.categoria.nombre === categoria

      const coincideFavorito =
        !verFavoritos || favoritos.includes(producto.id)

      return (
        coincideTexto &&
        coincideCategoria &&
        coincideFavorito &&
        producto.variantes.length > 0
      )
    })

    if (orden === 'precio-menor') {
      return [...lista].sort(
        (a, b) => obtenerPrecioMinimo(a) - obtenerPrecioMinimo(b),
      )
    }

    if (orden === 'precio-mayor') {
      return [...lista].sort(
        (a, b) => obtenerPrecioMinimo(b) - obtenerPrecioMinimo(a),
      )
    }

    return lista
  }, [busqueda, categoria, favoritos, orden, productos, verFavoritos])

  function abrirAutenticacion() {
    setPanel('ninguno')
    setAuthAbierta(true)
  }

  function cerrarAutenticacion() {
    setAuthAbierta(false)
  }

  function manejarAutenticacion(usuarioAutenticado: UsuarioAutenticado) {
    setUsuario(usuarioAutenticado)
    setAuthAbierta(false)
    setAviso(`Sesión iniciada como ${usuarioAutenticado.nombre}.`)
  }

  function manejarCierreSesion() {
    setUsuario(null)
    setAviso(
      'Has cerrado sesión. Tus favoritos y carrito siguen siendo temporales.',
    )
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

  function alternarFavorito(id: string) {
    setFavoritos((actuales) =>
      actuales.includes(id)
        ? actuales.filter((favorito) => favorito !== id)
        : [...actuales, id],
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

  function restablecerFiltros() {
    destinoPendiente.current = false
    setBusqueda('')
    setCategoria('Todos')
    setVerFavoritos(false)
    setVistaCarrito(false)
  }

  function navegarAProductos(restablecerCategoria: boolean) {
    setPanel('ninguno')
    setVerFavoritos(false)

    if (restablecerCategoria) {
      setCategoria('Todos')
    }

    if (vistaCarrito) {
      destinoPendiente.current = true
      setVistaCarrito(false)
      return
    }

    destinoPendiente.current = false
    desplazarAProductos()
  }

  function volverAlInicio() {
    restablecerFiltros()
    desplazarAlInicio()
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
            volverAlInicio()
          }}
        >
          <span className="brand__mark">DE</span>
          <span className="brand__copy">
            <strong className="brand__name">Dulce Encanto</strong>
            <small className="brand__tagline">Momentos que endulzan</small>
          </span>
        </a>

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
            onClick={() => {
              destinoPendiente.current = false
              setVistaCarrito(false)
              setVerFavoritos((actual) => !actual)
            }}
            aria-pressed={verFavoritos}
          >
            Favoritos <span className="nav-count">{favoritos.length}</span>
          </button>
        </nav>

        <div className="header-actions">
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

          <button
            type="button"
            className="icon-button cart-button"
            aria-label={`Carrito, ${cantidadCarrito} productos`}
            aria-pressed={vistaCarrito}
            onClick={() => {
              setPanel('ninguno')
              destinoPendiente.current = false
              setVistaCarrito(true)
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6M10 21h.01M18 21h.01" />
            </svg>
            {cantidadCarrito > 0 && (
              <span className="icon-button__badge">{cantidadCarrito}</span>
            )}
          </button>

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

      {panel !== 'ninguno' && (
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

      {vistaCarrito ? (
        <CartPanel
          productos={productos}
          carrito={carrito}
          onCerrar={() => {
            destinoPendiente.current = false
            setVistaCarrito(false)
          }}
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
                onClick={() => window.location.reload()}
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

                const precio = obtenerPrecio(variante)
                const favorito = favoritos.includes(producto.id)
                const stock = variante.stockDisponible
                const cantidadEnCarrito = carrito[variante.id] ?? 0
                const sinStock = stock <= 0
                const limiteAlcanzado = cantidadEnCarrito >= stock

                return (
                  <article className="product-card" key={producto.id}>
                    <div className="product-card__visual">
                      <img
                        className="product-card__image"
                        src={producto.imagenUrl ?? IMAGEN_POR_DEFECTO}
                        alt={producto.nombre}
                        loading="lazy"
                      />

                      <button
                        type="button"
                        className={
                          favorito
                            ? 'product-card__favorite product-card__favorite--active'
                            : 'product-card__favorite'
                        }
                        aria-label={
                          favorito
                            ? `Quitar ${producto.nombre} de favoritos`
                            : `Añadir ${producto.nombre} a favoritos`
                        }
                        aria-pressed={favorito}
                        onClick={() => alternarFavorito(producto.id)}
                      >
                        {favorito ? '♥' : '♡'}
                      </button>
                    </div>

                    <div className="product-card__body">
                      <p className="product-card__category">
                        {producto.categoria.nombre}
                      </p>

                      <h2 className="product-card__name">{producto.nombre}</h2>

                      <p className="product-card__description">
                        {producto.descripcion ||
                          'Un dulce preparado para disfrutar.'}
                      </p>

                      {producto.variantes.length > 1 && (
                        <label className="variant-control">
                          Presentación
                          <select
                            aria-label={`Presentación de ${producto.nombre}`}
                            value={variante.id}
                            onChange={(evento) =>
                              setVariantesSeleccionadas((actual) => ({
                                ...actual,
                                [producto.id]: evento.target.value,
                              }))
                            }
                          >
                            {producto.variantes.map((opcion) => (
                              <option key={opcion.id} value={opcion.id}>
                                {opcion.nombre} — $
                                {obtenerPrecio(opcion).toFixed(2)}
                                {' · Stock: '}
                                {opcion.stockDisponible}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}

                      <p className="product-card__stock">
                        {stock > 0 ? `${stock} disponibles` : 'Agotado'}
                      </p>

                      <div className="product-card__bottom">
                        <strong className="product-card__price">
                          ${precio.toFixed(2)}
                        </strong>

                        <button
                          type="button"
                          className="product-card__add"
                          onClick={() => agregarAlCarrito(producto)}
                          disabled={sinStock || limiteAlcanzado}
                          aria-label={`Agregar ${producto.nombre} al carrito`}
                        >
                          <span aria-hidden="true">＋</span>
                          <span>
                            {sinStock
                              ? 'Agotado'
                              : limiteAlcanzado
                                ? 'Stock completo'
                                : 'Agregar'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </article>
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
    </main>
  )
}

export default App