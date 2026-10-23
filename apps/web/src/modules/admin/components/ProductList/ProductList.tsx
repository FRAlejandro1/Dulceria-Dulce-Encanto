
import type { PropiedadesListaProductos } from '../../types/admin.types'
import './ProductList.css'

function ProductList({
  productos,
  productoSeleccionadoId,
  busqueda,
  categoriaSeleccionada,
  categorias,
  onCambiarBusqueda,
  onCambiarCategoria,
  onSeleccionarProducto,
}: PropiedadesListaProductos) {
  return (
    <section className="admin-inventory__list" aria-label="Lista de productos">
      <div className="admin-inventory__list-heading">
        <h2>Productos</h2>

        <label className="admin-inventory__search">
          <span className="admin-sr-only">Buscar productos</span>
          <input
            type="search"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(evento) => onCambiarBusqueda(evento.target.value)}
          />
        </label>
      </div>

      <div
        className="admin-inventory__categories"
        aria-label="Filtrar por categoría"
      >
        {categorias.map((categoria) => (
          <button
            key={categoria}
            type="button"
            className={
              categoriaSeleccionada === categoria
                ? 'admin-category admin-category--active'
                : 'admin-category'
            }
            aria-pressed={categoriaSeleccionada === categoria}
            onClick={() => onCambiarCategoria(categoria)}
          >
            {categoria}
          </button>
        ))}
      </div>

      <div className="admin-product-list">
        {productos.map((producto) => {
          const stockDisponible = producto.variantes.reduce(
            (total, variante) => total + variante.stockDisponible,
            0,
          )
          const seleccionado = producto.id === productoSeleccionadoId

          return (
            <button
              key={producto.id}
              type="button"
              className={
                seleccionado
                  ? 'admin-product admin-product--selected'
                  : 'admin-product'
              }
              aria-pressed={seleccionado}
              onClick={() => onSeleccionarProducto(producto.id)}
            >
              {producto.imagenUrl ? (
                <img
                  src={producto.imagenUrl}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <span
                  className="admin-product__placeholder"
                  aria-hidden="true"
                >
                  DE
                </span>
              )}

              <span className="admin-product__copy">
                <strong>{producto.nombre}</strong>
                <span>{producto.categoria.nombre}</span>
                <small>
                  {producto.variantes.length} variantes · {stockDisponible}{' '}
                  disponibles
                </small>
              </span>
            </button>
          )
        })}

        {productos.length === 0 && (
          <p className="admin-inventory__empty" role="status">
            No se encontraron productos con esos filtros.
          </p>
        )}
      </div>
    </section>
  )
}

export default ProductList
