import { useMemo, useState } from 'react'
import './App.css'

type Producto = {
  id: number
  nombre: string
  descripcion: string
  precio: number
  categoria: string
  imagen: string
  etiqueta?: string
}

const productos: Producto[] = [
  { id: 1, nombre: 'Alfajores artesanales', descripcion: 'Galletas suaves rellenas de dulce de leche.', precio: 3.5, categoria: 'Tradicionales', imagen: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=700&q=85', etiqueta: 'Más vendido' },
  { id: 2, nombre: 'Galletas con chispas', descripcion: 'Galletas horneadas con chispas de chocolate.', precio: 2.75, categoria: 'Galletas', imagen: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=700&q=85' },
  { id: 3, nombre: 'Torta de chocolate', descripcion: 'Bizcocho de chocolate con cobertura cremosa.', precio: 18, categoria: 'Tortas', imagen: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=700&q=85', etiqueta: 'Favorito' },
  { id: 4, nombre: 'Cupcakes de vainilla', descripcion: 'Porción individual con crema suave.', precio: 2.25, categoria: 'Cremosos', imagen: 'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=700&q=85' },
  { id: 5, nombre: 'Galletas de mantequilla', descripcion: 'Receta clásica, textura delicada y crujiente.', precio: 3, categoria: 'Galletas', imagen: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=700&q=85' },
  { id: 6, nombre: 'Bocaditos dulces', descripcion: 'Pequeños bocados para compartir.', precio: 4.5, categoria: 'Bocaditos', imagen: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?auto=format&fit=crop&w=700&q=85' },
]

const categorias = ['Todos', 'Tradicionales', 'Galletas', 'Tortas', 'Cremosos', 'Bocaditos']

function App() {
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todos')
  const [orden, setOrden] = useState('destacados')
  const [favoritos, setFavoritos] = useState<number[]>([])
  const [verFavoritos, setVerFavoritos] = useState(false)
  const [carrito, setCarrito] = useState<Record<number, number>>({})
  const [temaOscuro, setTemaOscuro] = useState(false)
  const [panel, setPanel] = useState<'ninguno' | 'notificaciones' | 'perfil'>('ninguno')
  const [aviso, setAviso] = useState('')

  const productosVisibles = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase('es')
    const lista = productos.filter((producto) => {
      const coincideTexto = `${producto.nombre} ${producto.descripcion}`.toLocaleLowerCase('es').includes(texto)
      const coincideCategoria = categoria === 'Todos' || producto.categoria === categoria
      const coincideFavorito = !verFavoritos || favoritos.includes(producto.id)
      return coincideTexto && coincideCategoria && coincideFavorito
    })
    if (orden === 'precio-menor') return [...lista].sort((a, b) => a.precio - b.precio)
    if (orden === 'precio-mayor') return [...lista].sort((a, b) => b.precio - a.precio)
    return lista
  }, [busqueda, categoria, favoritos, orden, verFavoritos])

  const cantidadCarrito = Object.values(carrito).reduce((total, cantidad) => total + cantidad, 0)

  function alternarFavorito(id: number) {
    setFavoritos((actuales) => actuales.includes(id) ? actuales.filter((favorito) => favorito !== id) : [...actuales, id])
  }

  function agregarAlCarrito(producto: Producto) {
    setCarrito((actual) => ({ ...actual, [producto.id]: (actual[producto.id] ?? 0) + 1 }))
    setAviso(`${producto.nombre} se añadió al carrito`)
  }

  return (
    <main className={temaOscuro ? 'app app--dark' : 'app'}>
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Dulce Encanto, inicio">
          <span className="brand__mark">DE</span>
          <span className="brand__copy"><strong>Dulce Encanto</strong><small>Momentos que endulzan</small></span>
        </a>
        <nav className="main-nav" aria-label="Navegación principal">
          <a href="#inicio" onClick={() => { setVerFavoritos(false); setCategoria('Todos') }}>Inicio</a>
          <a href="#productos" onClick={() => { setVerFavoritos(false); setCategoria('Todos') }}>Ofertas</a>
          <a href="#productos" onClick={() => setVerFavoritos(false)}>Productos</a>
          <button className={verFavoritos ? 'nav-link nav-link--active' : 'nav-link'} onClick={() => setVerFavoritos(!verFavoritos)}>Favoritos <span>{favoritos.length}</span></button>
        </nav>
        <div className="header-actions">
          <button className="icon-button" aria-label="Notificaciones" onClick={() => setPanel(panel === 'notificaciones' ? 'ninguno' : 'notificaciones')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg><span className="notification-dot" /></button>
          <button className="icon-button cart-button" aria-label={`Carrito, ${cantidadCarrito} productos`} onClick={() => setAviso(cantidadCarrito ? `Tienes ${cantidadCarrito} producto(s) en el carrito.` : 'Tu carrito está vacío.')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6M10 21h.01M18 21h.01" /></svg>{cantidadCarrito > 0 && <span className="cart-count">{cantidadCarrito}</span>}</button>
          <button className="icon-button theme-button" aria-label={temaOscuro ? 'Activar modo claro' : 'Activar modo oscuro'} onClick={() => setTemaOscuro(!temaOscuro)}>{temaOscuro ? '☀' : '☾'}</button>
          <button className="profile-button" onClick={() => setPanel(panel === 'perfil' ? 'ninguno' : 'perfil')} aria-label="Abrir perfil"><span className="profile-button__avatar">U</span><span className="profile-button__label">Mi cuenta</span><span aria-hidden="true">⌄</span></button>
        </div>
      </header>

      {panel !== 'ninguno' && <section className="floating-panel" aria-live="polite"><button className="toast__close" onClick={() => setPanel('ninguno')} aria-label="Cerrar panel">×</button>{panel === 'notificaciones' ? <><strong>Notificaciones</strong><p>No tienes notificaciones nuevas.</p></> : <><strong>Mi cuenta</strong><p>Inicia sesión para acceder a tu perfil y guardar tus favoritos.</p><button className="floating-panel__action" onClick={() => setAviso('El inicio de sesión se conectará con la API en la siguiente fase.')}>Iniciar sesión</button></>}</section>}

      <section className="catalog" id="inicio">
        <div className="catalog__intro">
          <div><span className="eyebrow">HECHO CON AMOR, PARA COMPARTIR</span><h1 className="catalog__title">{verFavoritos ? 'Mis favoritos' : 'Nuestros productos'}</h1><p className="catalog__description">{verFavoritos ? 'Tus dulces preferidos, siempre a mano.' : 'Pequeños detalles que convierten cualquier día en algo especial.'}</p></div>
          <span className="catalog-decoration" aria-hidden="true">♡</span>
        </div>

        <section className="catalog-tools" aria-label="Buscar y filtrar productos">
          <div className="search-box"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg><input aria-label="Buscar productos" placeholder="¿Qué se te antoja hoy?" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} /><kbd>⌕</kbd></div>
          <label className="sort-control">Ordenar por <select className="sort-select" aria-label="Ordenar productos" value={orden} onChange={(evento) => setOrden(evento.target.value)}><option value="destacados">Destacados</option><option value="precio-menor">Precio: menor a mayor</option><option value="precio-mayor">Precio: mayor a menor</option></select></label>
        </section>

        <div className="category-list" aria-label="Categorías">
          {categorias.map((nombre) => <button key={nombre} className={categoria === nombre ? 'category-chip category-chip--active' : 'category-chip'} onClick={() => setCategoria(nombre)} aria-pressed={categoria === nombre}>{nombre}</button>)}
        </div>

        <section className="product-grid" id="productos" aria-label="Catálogo de productos">
          {productosVisibles.map((producto) => <article className="product-card" key={producto.id}>
            <div className="product-card__visual"><img className="product-card__image" src={producto.imagen} alt={producto.nombre} loading="lazy" />{producto.etiqueta && <span className="product-card__tag">{producto.etiqueta}</span>}<button className={favoritos.includes(producto.id) ? 'favorite-button favorite-button--active' : 'favorite-button'} aria-label={favoritos.includes(producto.id) ? `Quitar ${producto.nombre} de favoritos` : `Añadir ${producto.nombre} a favoritos`} aria-pressed={favoritos.includes(producto.id)} onClick={() => alternarFavorito(producto.id)}>{favoritos.includes(producto.id) ? '♥' : '♡'}</button></div>
            <div className="product-card__body"><span className="product-card__category">{producto.categoria}</span><h2>{producto.nombre}</h2><p>{producto.descripcion}</p><div className="product-card__bottom"><strong className="product-card__price">${producto.precio.toFixed(2)}</strong><button className="product-card__add" onClick={() => agregarAlCarrito(producto)} aria-label={`Agregar ${producto.nombre} al carrito`}>＋ <span>Agregar</span></button></div></div>
          </article>)}
        </section>
        {productosVisibles.length === 0 && <div className="empty-state"><span aria-hidden="true">♡</span><h2>{verFavoritos ? 'Aún no tienes favoritos' : 'No encontramos productos'}</h2><p className="catalog__description">{verFavoritos ? 'Guarda productos con el corazón para encontrarlos aquí.' : 'Prueba con otra búsqueda o categoría.'}</p><button className="floating-panel__action" onClick={() => { setBusqueda(''); setCategoria('Todos'); setVerFavoritos(false) }}>Ver todos los productos</button></div>}
        <p className="demo-notice">Catálogo de demostración. Los productos, precios e imágenes se sustituirán por los datos reales de la tienda.</p>
      </section>
      {aviso && <div className="toast" role="status">{aviso}<button onClick={() => setAviso('')} aria-label="Cerrar aviso">×</button></div>}
      <footer className="footer"><span className="brand__mark">DE</span><p>© Dulce Encanto · Hecho para compartir momentos dulces.</p><a href="#inicio">Volver arriba ↑</a></footer>
    </main>
  )
}

export default App
