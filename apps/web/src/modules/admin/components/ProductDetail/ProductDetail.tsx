
import type { PropiedadesDetalleProducto } from '../../types/admin.types'
import './ProductDetail.css'

function ProductDetail({ producto }: PropiedadesDetalleProducto) {
  if (!producto) {
    return (
      <section
        className="admin-product-detail"
        aria-label="Detalle del producto"
      >
        <div className="admin-product-detail__empty">
          <h2>Selecciona un producto</h2>
          <p>Elige un producto de la lista para consultar sus detalles.</p>
        </div>
      </section>
    )
  }

  return (
    <section
      className="admin-product-detail"
      aria-label="Detalle del producto"
    >
      <div className="admin-product-detail__heading">
        <div>
          <p className="admin-panel__eyebrow">{producto.categoria.nombre}</p>
          <h2>{producto.nombre}</h2>
        </div>

        <span className="admin-product-detail__badge">Solo consulta</span>
      </div>

      {producto.imagenUrl && (
        <img
          className="admin-product-detail__image"
          src={producto.imagenUrl}
          alt={producto.nombre}
        />
      )}

      <div className="admin-product-detail__section">
        <h3>Descripción</h3>
        <p>{producto.descripcion || 'Sin descripción registrada.'}</p>
      </div>

      <div className="admin-product-detail__section">
        <h3>Variantes y existencias disponibles</h3>

        {producto.variantes.length > 0 ? (
          <div className="admin-variant-list">
            {producto.variantes.map((variante) => (
              <article className="admin-variant" key={variante.id}>
                <div>
                  <strong>{variante.nombre}</strong>
                  <span>SKU: {variante.sku}</span>
                </div>

                <div className="admin-variant__numbers">
                  <strong>${Number(variante.precio).toFixed(2)}</strong>
                  <span>{variante.stockDisponible} disponibles</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-product-detail__empty-variants">
            Este producto no tiene variantes registradas.
          </p>
        )}
      </div>

      <p className="admin-product-detail__notice">
        La edición de productos y los ajustes de stock estarán disponibles
        cuando conectemos las operaciones administrativas de la API.
      </p>
    </section>
  )
}

export default ProductDetail
