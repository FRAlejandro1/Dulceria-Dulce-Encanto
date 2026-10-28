
import type { Producto, Variante } from '../../../types/catalogo.types'
import ProductCard from './ProductCard'

type EstadoCarga = 'cargando' | 'error' | 'correcto'

interface CatalogViewProps {
  estadoCarga: EstadoCarga
  busqueda: string
  setBusqueda: (valor: string) => void
  categoria: string
  setCategoria: (valor: string) => void
  orden: string
  setOrden: (valor: string) => void
  favoritos: string[]
  verFavoritos: boolean
  categorias: string[]
  productosVisibles: Producto[]
  carrito: Record<string, number>
  variantesSeleccionadas: Record<string, string>
  reintentarCarga: () => void
  restablecerFiltros: () => void
  alternarFavorito: (productoId: string) => void
  obtenerVarianteSeleccionada: (
    producto: Producto,
  ) => Variante | undefined
  onCambiarVariante: (
    productoId: string,
    varianteId: string,
  ) => void
  onAgregarAlCarrito: (producto: Producto) => void
}

export default function CatalogView({
  estadoCarga,
  busqueda,
  setBusqueda,
  categoria,
  setCategoria,
  orden,
  setOrden,
  favoritos,
  verFavoritos,
  categorias,
  productosVisibles,
  carrito,
  restablecerFiltros,
  reintentarCarga,
  alternarFavorito,
  obtenerVarianteSeleccionada,
  onCambiarVariante,
  onAgregarAlCarrito,
}: CatalogViewProps) {
  return (
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
        aria-label="Buscar y ordenar productos"
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

        <div className="sort-control">
          <label htmlFor="catalog-sort">Ordenar por</label>

          <select
            id="catalog-sort"
            className="sort-select"
            aria-label="Ordenar productos"
            value={orden}
            onChange={(evento) => setOrden(evento.target.value)}
          >
            <option value="destacados">Destacados</option>
            <option value="precio-menor">Precio: menor a mayor</option>
            <option value="precio-mayor">Precio: mayor a menor</option>
          </select>
        </div>
      </section>

      <div className="category-list" aria-label="Categorías de productos">
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

            if (!variante) {
              return null
            }

            return (
              <ProductCard
                key={producto.id}
                producto={producto}
                variante={variante}
                favorito={favoritos.includes(producto.id)}
                cantidadEnCarrito={carrito[variante.id] ?? 0}
                onCambiarVariante={onCambiarVariante}
                onAlternarFavorito={alternarFavorito}
                onAgregar={onAgregarAlCarrito}
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
  )
}
