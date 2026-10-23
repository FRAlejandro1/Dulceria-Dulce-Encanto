import InventorySummary from './InventorySummary/InventorySummary'
import ProductDetail from './ProductDetail/ProductDetail'
import ProductList from './ProductList/ProductList'
import { useInventory } from '../hooks/useInventory'
import type { PropiedadesPanelAdmin } from '../types/admin.types'
import './AdminPanel.css'

function AdminPanel({
  productos,
  alVolverATienda,
}: PropiedadesPanelAdmin) {
  const inventario = useInventory(productos)

  return (
    <main className="admin-panel">
      <header className="admin-panel__heading">
        <div>
          <p className="admin-panel__eyebrow">
            DULCE ENCANTO · ADMINISTRACIÓN
          </p>
          <h1>Inventario</h1>
          <p>
            Consulta los productos, sus variantes y las existencias disponibles.
          </p>
        </div>

        <button
          className="admin-panel__back"
          type="button"
          onClick={alVolverATienda}
        >
          Volver a la tienda
        </button>
      </header>

      <InventorySummary
        cantidadProductos={inventario.cantidadProductos}
        cantidadVariantes={inventario.cantidadVariantes}
        existenciasDisponibles={inventario.existenciasDisponibles}
      />

      <section
        className="admin-inventory"
        aria-label="Gestión del inventario"
      >
        <ProductList
          productos={inventario.productosFiltrados}
          productoSeleccionadoId={inventario.productoSeleccionado?.id ?? ''}
          busqueda={inventario.busqueda}
          categoriaSeleccionada={inventario.categoriaSeleccionada}
          categorias={inventario.categorias}
          onCambiarBusqueda={inventario.cambiarBusqueda}
          onCambiarCategoria={inventario.cambiarCategoria}
          onSeleccionarProducto={inventario.seleccionarProducto}
        />

        <ProductDetail producto={inventario.productoSeleccionado} />
      </section>
    </main>
  )
}

export default AdminPanel