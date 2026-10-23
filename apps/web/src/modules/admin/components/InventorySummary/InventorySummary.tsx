import type { PropiedadesResumenInventario } from '../../types/admin.types'
import './InventorySummary.css'

function InventorySummary({
  cantidadProductos,
  cantidadVariantes,
  existenciasDisponibles,
}: PropiedadesResumenInventario) {
  return (
    <section
      className="admin-panel__metrics"
      aria-label="Resumen del inventario"
    >
      <article className="admin-metric">
        <span>Productos</span>
        <strong>{cantidadProductos}</strong>
      </article>

      <article className="admin-metric">
        <span>Variantes</span>
        <strong>{cantidadVariantes}</strong>
      </article>

      <article className="admin-metric">
        <span>Unidades disponibles</span>
        <strong>{existenciasDisponibles}</strong>
      </article>
    </section>
  )
}

export default InventorySummary
