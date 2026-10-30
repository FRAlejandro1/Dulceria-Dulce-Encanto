import type { Producto, Variante } from '../../../types/catalogo.types'
import './ProductCard.css'

interface ProductCardProps {
  producto: Producto
  variante: Variante
  favorito: boolean
  cantidadEnCarrito: number
  onCambiarVariante: (productoId: string, varianteId: string) => void
  onAlternarFavorito: (productoId: string) => void
  onAgregar: (producto: Producto) => void
}

const IMAGEN_POR_DEFECTO =
  'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=85'

function ProductCard({
  producto,
  variante,
  favorito,
  cantidadEnCarrito,
  onCambiarVariante,
  onAlternarFavorito,
  onAgregar,
}: ProductCardProps) {
  const agotado = variante.stockDisponible <= 0

  const stockRestante = Math.max(
    0,
    variante.stockDisponible - cantidadEnCarrito,
  )

  const stockCompleto = stockRestante === 0
  const noDisponible = agotado || stockCompleto

  const imagenProducto =
    variante.imagenUrl || producto.imagenUrl || IMAGEN_POR_DEFECTO

  const precioNumerico = Number(variante.precio)
  const precioSeguro =
    Number.isFinite(precioNumerico) && precioNumerico >= 0
      ? precioNumerico
      : 0

  return (
    <article className="product-card">
      <div className="product-card__media">
        <img
          className="product-card__image"
          src={imagenProducto}
          alt={producto.nombre}
          loading="lazy"
          onError={(evento) => {
            const imagen = evento.currentTarget

            if (imagen.src !== IMAGEN_POR_DEFECTO) {
              imagen.src = IMAGEN_POR_DEFECTO
            }
          }}
        />

        <span className="product-card__tag">Hecho artesanalmente</span>

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
          onClick={() => onAlternarFavorito(producto.id)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
          </svg>
        </button>
      </div>

      <div className="product-card__body">
        <p className="product-card__category">
          {producto.categoria.nombre || 'Dulces artesanales'}
        </p>

        <h2 className="product-card__name">{producto.nombre}</h2>

        <p className="product-card__description">
          {producto.descripcion || 'Un dulce preparado para disfrutar.'}
        </p>

        {producto.variantes.length > 1 && (
          <label className="product-card__variant-label">
            Presentación
            <select
              className="product-card__variant"
              aria-label={`Presentación de ${producto.nombre}`}
              value={variante.id}
              onChange={(evento) =>
                onCambiarVariante(producto.id, evento.target.value)
              }
            >
              {producto.variantes.map((opcion) => (
                <option key={opcion.id} value={opcion.id}>
                  {opcion.nombre}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="product-card__meta">
          <span className="product-card__price">
            ${precioSeguro.toFixed(2)}
          </span>

          <p
            className={
              agotado
                ? 'product-card__stock product-card__stock--empty'
                : 'product-card__stock'
            }
            aria-live="polite"
          >
            {agotado
              ? 'Agotado'
              : stockCompleto
                ? 'Todo el stock está en tu carrito'
                : `${stockRestante} disponibles para agregar`}
          </p>
        </div>

        <button
          type="button"
          className="product-card__add"
          aria-label={`Agregar ${producto.nombre} al carrito`}
          disabled={noDisponible}
          onClick={() => onAgregar(producto)}
        >
          {agotado
            ? 'Agotado'
            : stockCompleto
              ? 'Stock completo'
              : 'Añadir al carrito'}
          {!noDisponible && <span aria-hidden="true">＋</span>}
        </button>
      </div>
    </article>
  )
}

export default ProductCard
