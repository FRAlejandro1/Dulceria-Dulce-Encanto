import { lazy, Suspense } from 'react'
import { useAdminOrders } from '../../hooks/useAdminOrders'
import OrdersDashboard from './OrdersDashboard/OrdersDashboard'
import CustomerOrders from './CustomerOrders/CustomerOrders'
import './OrdersAdmin.css'

const OrderDetail = lazy(() => import('./OrderDetail/OrderDetail'))

function OrdersAdmin() {
  const pedidos = useAdminOrders()

  return (
    <section className="admin-orders" aria-label="GestiÃ³n de pedidos">
      <OrdersDashboard
        datos={pedidos.dashboard}
        cargando={pedidos.cargandoDashboard}
        error={pedidos.errorDashboard}
        ventas={pedidos.ventasPeriodo}
        periodo={pedidos.periodoVentas}
        estadoDashboard={pedidos.estadoDashboard}
        onEstadoDashboardChange={pedidos.cambiarEstadoDashboard}
        anio={pedidos.anioVentas}
        mes={pedidos.mesVentas}
        fechaDesde={pedidos.fechaDesdeVentas}
        fechaHasta={pedidos.fechaHastaVentas}
        cargandoVentas={pedidos.cargandoVentas}
        errorVentas={pedidos.errorVentas}
        onPeriodoChange={pedidos.cambiarPeriodoVentas}
        onAnioChange={pedidos.cambiarAnioVentas}
        onMesChange={pedidos.cambiarMesVentas}
        onFechaDesdeChange={pedidos.cambiarFechaDesdeVentas}
        onFechaHastaChange={pedidos.cambiarFechaHastaVentas}
      />

      <CustomerOrders
        clientes={pedidos.respuesta?.clientes ?? []}
        totalClientes={pedidos.respuesta?.totalClientes ?? 0}
        pagina={pedidos.pagina}
        limite={pedidos.respuesta?.limite ?? 8}
        estado={pedidos.estado}
        desde={pedidos.desde}
        hasta={pedidos.hasta}
        busqueda={pedidos.busqueda}
        cargando={pedidos.cargandoClientes}
        error={pedidos.error}
        onEstadoChange={pedidos.cambiarEstadoFiltro}
        onDesdeChange={pedidos.cambiarDesde}
        onHastaChange={pedidos.cambiarHasta}
        onBusquedaChange={pedidos.cambiarBusqueda}
        onPaginaChange={pedidos.cambiarPagina}
        onDetalle={(id) => void pedidos.abrirDetalle(id)}
        onActualizar={() => {
          void pedidos.cargarClientes()
          void pedidos.cargarDashboard()
          void pedidos.cargarVentasPeriodo()
        }}
      />

      {(pedidos.cargandoDetalle || pedidos.pedidoSeleccionado || pedidos.errorDetalle) && (
        <Suspense fallback={<p className="admin-orders__status" role="status">Cargando detalle...</p>}>
          <OrderDetail
            pedido={pedidos.pedidoSeleccionado}
            cargando={pedidos.cargandoDetalle}
            actualizando={pedidos.actualizando}
            error={pedidos.errorDetalle}
            onCerrar={pedidos.cerrarDetalle}
            onCambiarEstado={(id, estado) => void pedidos.cambiarEstado(id, estado)}
          />
        </Suspense>
      )}
    </section>
  )
}

export default OrdersAdmin
