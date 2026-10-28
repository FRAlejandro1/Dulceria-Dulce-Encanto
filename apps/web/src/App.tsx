import { lazy, Suspense, useCallback, useState } from 'react'
import './App.css'
import type { Producto } from './types/catalogo.types'
import { useCatalog } from './modules/catalog/hooks/useCatalog'
import { useCatalogFilters } from './modules/catalog/hooks/useCatalogFilters'
import { useCatalogNavigation } from './modules/catalog/hooks/useCatalogNavigation'
import { useCart } from './modules/cart/hooks/useCart'
import CartPanel from './modules/cart/components/CartPanel'
import CatalogView from './modules/catalog/components/CatalogView'
import AppHeader from './modules/app/components/AppHeader'
import FloatingPanel from './modules/app/components/FloatingPanel'
import AppFooter from './modules/app/components/AppFooter'
import { useAppSession } from './modules/app/hooks/useAppSession'
import { useProductActions } from './modules/app/hooks/useProductActions'
import { useFavorites } from './modules/favorites/hooks/useFavorites'
import Toast from './modules/notifications/Toast'

const Auth = lazy(() => import('./modules/auth/Auth'))
const AdminPanel = lazy(
  () => import('./modules/admin/components/AdminPanel'),
)

function App() {
  const { productos, estadoCarga, reintentarCarga } = useCatalog()

  const [variantesSeleccionadas, setVariantesSeleccionadas] = useState<
    Record<string, string>
  >({})
  const [vistaCarrito, setVistaCarrito] = useState(false)
  const [temaOscuro, setTemaOscuro] = useState(false)
  const [panel, setPanel] = useState<
    'ninguno' | 'notificaciones' | 'perfil'
  >('ninguno')
  const [aviso, setAviso] = useState('')

  const {
    usuario,
    authAbierta,
    vistaAdministracion,
    abrirAutenticacion,
    cerrarAutenticacion,
    manejarAutenticacion,
    manejarCierreSesion,
    abrirAdministracion,
    volverATienda: restablecerVistaAdministrativa,
  } = useAppSession({
    setAviso,
    setVistaCarrito,
    setPanel,
  })

  const { favoritos, alternarFavorito } = useFavorites(
    usuario,
    setAviso,
  )

  const {
    busqueda,
    setBusqueda,
    categoria,
    setCategoria,
    orden,
    setOrden,
    verFavoritos,
    setVerFavoritos,
    categorias,
    productosVisibles,
    restablecerFiltros: restablecerFiltrosCatalogo,
  } = useCatalogFilters(productos, {
    favoritos,
    alternarFavorito,
  })

  const {
    restablecerFiltros,
    navegarAProductos,
    volverAlInicio,
    abrirCarrito,
    cerrarCarrito,
    alternarFavoritos,
  } = useCatalogNavigation({
    vistaCarrito,
    setVistaCarrito,
    setPanel,
    setVerFavoritos,
    setCategoria,
    restablecerFiltrosCatalogo,
  })

  const {
    carrito,
    lineas,
    cantidadCarrito,
    subtotalCarrito,
    agregarVariante,
    cambiarCantidad,
    eliminarVariante,
  } = useCart(productos)

  const {
    obtenerVarianteSeleccionada,
    agregarAlCarrito,
    manejarCambioCantidad,
    manejarCambioVariante,
  } = useProductActions({
    variantesSeleccionadas,
    setVariantesSeleccionadas,
    agregarVariante,
    cambiarCantidad,
    setAviso,
  })

  const manejarAperturaCarrito = useCallback(() => {
    setPanel('ninguno')
    abrirCarrito()
  }, [abrirCarrito])

  const manejarAlternarPanel = useCallback(
    (nuevoPanel: 'notificaciones' | 'perfil') => {
      setPanel((actual) =>
        actual === nuevoPanel ? 'ninguno' : nuevoPanel,
      )
    },
    [],
  )

  const volverATienda = useCallback(() => {
    restablecerVistaAdministrativa()
    volverAlInicio()
  }, [restablecerVistaAdministrativa, volverAlInicio])

  const finalizarPedidoNoDisponible = useCallback(() => {
    setAviso('La finalización de pedidos todavía no está disponible.')
  }, [])

  const manejarAgregarAlCarrito = useCallback(
    (producto: Producto) => {
      agregarAlCarrito(producto)
    },
    [agregarAlCarrito],
  )

  return (
    <main
      id="inicio"
      className={temaOscuro ? 'app app--dark' : 'app'}
    >
      <AppHeader
        cantidadCarrito={cantidadCarrito}
        cantidadFavoritos={favoritos.length}
        temaOscuro={temaOscuro}
        usuario={usuario}
        vistaAdministracion={vistaAdministracion}
        verFavoritos={verFavoritos}
        panel={panel}
        onVolverAlInicio={volverAlInicio}
        onNavegarAProductos={navegarAProductos}
        onAlternarFavoritos={alternarFavoritos}
        onAbrirCarrito={manejarAperturaCarrito}
        onAlternarTema={() =>
          setTemaOscuro((actual) => !actual)
        }
        onAlternarPanel={manejarAlternarPanel}
        onAbrirAutenticacion={abrirAutenticacion}
        onVolverATienda={volverATienda}
      />

      {!vistaAdministracion && (
        <FloatingPanel
          panel={panel}
          usuario={usuario}
          onCerrar={() => setPanel('ninguno')}
          onAbrirAutenticacion={abrirAutenticacion}
          onAbrirAdministracion={abrirAdministracion}
        />
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

      {vistaAdministracion && usuario?.rol === 'ADMIN' ? (
        <Suspense
          fallback={
            <div className="catalog-status" role="status">
              Cargando administración…
            </div>
          }
        >
          <AdminPanel alVolverATienda={volverATienda} />
        </Suspense>
      ) : vistaCarrito ? (
        <CartPanel
          productos={productos}
          carrito={carrito}
          lineas={lineas}
          cantidadCarrito={cantidadCarrito}
          subtotalCarrito={subtotalCarrito}
          onCerrar={cerrarCarrito}
          onCambiarCantidad={manejarCambioCantidad}
          onEliminar={eliminarVariante}
          onFinalizarPedido={finalizarPedidoNoDisponible}
        />
      ) : (
        <CatalogView
          estadoCarga={estadoCarga}
          busqueda={busqueda}
          setBusqueda={setBusqueda}
          categoria={categoria}
          setCategoria={setCategoria}
          orden={orden}
          setOrden={setOrden}
          favoritos={favoritos}
          verFavoritos={verFavoritos}
          categorias={categorias}
          productosVisibles={productosVisibles}
          carrito={carrito}
          variantesSeleccionadas={variantesSeleccionadas}
          reintentarCarga={reintentarCarga}
          restablecerFiltros={restablecerFiltros}
          alternarFavorito={alternarFavorito}
          obtenerVarianteSeleccionada={obtenerVarianteSeleccionada}
          onCambiarVariante={manejarCambioVariante}
          onAgregarAlCarrito={manejarAgregarAlCarrito}
        />
      )}

      <Toast
        mensaje={aviso}
        onCerrar={() => setAviso('')}
      />

      {!vistaAdministracion && (
        <AppFooter onVolverAlInicio={volverAlInicio} />
      )}
    </main>
  )
}

export default App
