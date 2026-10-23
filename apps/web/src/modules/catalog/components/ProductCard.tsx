import type { ChangeEvent } from 'react'
import type { Producto, Variante } from '../../../types/catalogo.types'
import { obtenerPrecio } from '../utils/product.utils'

const IMAGEN_POR_DEFECTO =
  'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=700&q=85'

interface ProductCardProps {
  producto: Producto
  variante: Variante
  favorito: boolean
  cantidadEnCarrito: number
  onCambiarVariante: (productoId: string, varianteId: string) => void
  onAlternarFavorito: (productoId: string) => void
  onAgregar: (producto: Producto) => void
}

export default function ProductCard({
  producto,
  variante,
  favorito,
  cantidadEnCarrito,
  onCambiarVariante,
  onAlternarFavorito,
  onAgregar,
}: ProductCardProps) {
  const precio = obtenerPrecio(variante)
  const stock = variante.stockDisponible
  const sinStock = stock <= 0
  const limiteAlcanzado = cantidadEnCarrito >= stock

  function manejarCambioVariante(evento: ChangeEvent<HTMLSelectElement>) {
    onCambiarVariante(producto.id, evento.target.value)
  }

  return (
    <article className="product-card">
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
          onClick={() => onAlternarFavorito(producto.id)}
        >
          {favorito ? '♥' : '♡'}
        </button>
      </div>

      <div className="product-card__body">
        <p className="product-card__category">{producto.categoria.nombre}</p>
        <h2 className="product-card__name">{producto.nombre}</h2>

        <p className="product-card__description">
          {producto.descripcion || 'Un dulce preparado para disfrutar.'}
        </p>

        {producto.variantes.length > 1 && (
          <label className="variant-control">
            Presentación
            <select
              aria-label={`Presentación de ${producto.nombre}`}
              value={variante.id}
              onChange={manejarCambioVariante}
            >
              {producto.variantes.map((opcion) => (
                <option key={opcion.id} value={opcion.id}>
                  {opcion.nombre} — ${obtenerPrecio(opcion).toFixed(2)}
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
          <strong className="product-card__price">${precio.toFixed(2)}</strong>

          <button
            type="button"
            className="product-card__add"
            onClick={() => onAgregar(producto)}
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
}