import { useCallback, useEffect, useState } from 'react'
import type {
  ActualizarProductoAdmin,
  ActualizarVarianteAdmin,
  AjustarStockAdmin,
  CategoriaAdmin,
  CrearProductoAdmin,
  ProductoAdmin,
} from '../types/inventory.types'
import {
  actualizarProductoAdmin,
  actualizarVarianteAdmin,
  ajustarStockAdmin,
  obtenerProductosAdmin,
  obtenerCategoriasAdmin,
  crearProductoAdmin,
  crearVarianteAdmin,
  cargarImagenProductoAdmin,
  eliminarImagenProductoAdmin,
  cargarImagenPrincipalVarianteAdmin,
  eliminarImagenPrincipalVarianteAdmin,
  obtenerImagenesVarianteAdmin,
  cargarImagenAdicionalVarianteAdmin,
  eliminarImagenAdicionalVarianteAdmin,
} from '../services/admin.service'
import InventorySummary from './InventorySummary/InventorySummary'
import ProductDetail from './ProductDetail/ProductDetail'
import ProductList from './ProductList/ProductList'
import { useInventory } from '../hooks/useInventory'
import type {
  CategoriaEditableAdmin,
  PropiedadesPanelAdmin,
} from '../types/admin.types'
import './AdminPanel.css'

function AdminPanel(props: PropiedadesPanelAdmin) {
  // La navegación de vuelta a la tienda está en el logotipo global.
  void props.alVolverATienda

  const [productosAdmin, setProductosAdmin] = useState<ProductoAdmin[]>([])
  const [categoriasAdmin, setCategoriasAdmin] = useState<CategoriaAdmin[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')

  const cargarProductos = useCallback(async () => {
    setCargando(true)
    setErrorCarga('')

    try {
      const [resultado, categorias] = await Promise.all([
        obtenerProductosAdmin(),
        obtenerCategoriasAdmin(),
      ])
      setProductosAdmin(resultado)
      setCategoriasAdmin(categorias)
    } catch (error) {
      setErrorCarga(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los productos administrativos.',
      )
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    let vigente = true

    Promise.all([
      obtenerProductosAdmin(),
      obtenerCategoriasAdmin(),
    ])
      .then(([resultado, categorias]) => {
        if (!vigente) return

        setProductosAdmin(resultado)
        setCategoriasAdmin(categorias)
      })
      .catch((error: unknown) => {
        if (!vigente) return

        setErrorCarga(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los productos administrativos.',
        )
      })
      .finally(() => {
        if (vigente) {
          setCargando(false)
        }
      })

    return () => {
      vigente = false
    }
  }, [])

  const guardarCambiosProducto = useCallback(
    async (
      productoId: string,
      cambios: ActualizarProductoAdmin,
    ): Promise<void> => {
      await actualizarProductoAdmin(productoId, cambios)
      await cargarProductos()
    },
    [cargarProductos],
  )

  const guardarCambiosVariante = useCallback(
    async (
      varianteId: string,
      cambios: ActualizarVarianteAdmin,
    ): Promise<void> => {
      await actualizarVarianteAdmin(varianteId, cambios)
      await cargarProductos()
    },
    [cargarProductos],
  )

  const guardarAjusteStock = useCallback(
    async (
      varianteId: string,
      cambios: AjustarStockAdmin,
    ) => {
      const resultado = await ajustarStockAdmin(varianteId, cambios)
      await cargarProductos()
      return resultado
    },
    [cargarProductos],
  )

  const crearProducto = useCallback(
    async (datos: CrearProductoAdmin): Promise<string> => {
      const productoId = await crearProductoAdmin(datos)
      await cargarProductos()
      return productoId
    },
    [cargarProductos],
  )

  const crearVariante = useCallback(
    async (
      productoId: string,
      datos: import('../types/inventory.types').CrearVarianteAdmin,
    ) => {
      await crearVarianteAdmin(productoId, datos)
      await cargarProductos()
    },
    [cargarProductos],
  )

  const cargarImagenProducto = useCallback(
    async (productoId: string, archivo: File) => {
      const url = await cargarImagenProductoAdmin(productoId, archivo)
      await cargarProductos()
      return url
    },
    [cargarProductos],
  )

  const eliminarImagenProducto = useCallback(
    async (productoId: string) => {
      await eliminarImagenProductoAdmin(productoId)
      await cargarProductos()
    },
    [cargarProductos],
  )

  const cargarImagenVariante = useCallback(
    async (varianteId: string, archivo: File) => {
      const url = await cargarImagenPrincipalVarianteAdmin(varianteId, archivo)
      await cargarProductos()
      return url
    },
    [cargarProductos],
  )

  const eliminarImagenVariante = useCallback(
    async (varianteId: string) => {
      await eliminarImagenPrincipalVarianteAdmin(varianteId)
      await cargarProductos()
    },
    [cargarProductos],
  )

  const obtenerImagenesVariante = useCallback(
    (varianteId: string) => obtenerImagenesVarianteAdmin(varianteId),
    [],
  )

  const cargarImagenAdicionalVariante = useCallback(
    async (varianteId: string, archivo: File, posicion: number) => {
      const url = await cargarImagenAdicionalVarianteAdmin(varianteId, archivo, posicion)
      await cargarProductos()
      return url
    },
    [cargarProductos],
  )

  const eliminarImagenAdicionalVariante = useCallback(
    async (varianteId: string, imagenId: string) => {
      await eliminarImagenAdicionalVarianteAdmin(varianteId, imagenId)
      await cargarProductos()
    },
    [cargarProductos],
  )
  const categoriasEditables: CategoriaEditableAdmin[] = categoriasAdmin
    .filter((categoria) => categoria.activa)
    .map(({ id, nombre }) => ({ id, nombre }))

  const inventario = useInventory(productosAdmin)

  return (
    <main className="admin-panel">
      <h1>Inventario</h1>
      {cargando && (
        <p className="admin-panel__status" role="status">
          Cargando inventario administrativo...
        </p>
      )}

      {!cargando && errorCarga && (
        <div className="admin-panel__error" role="alert">
          <p>No se pudo actualizar el inventario: {errorCarga}</p>
          <button type="button" onClick={() => void cargarProductos()}>
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !errorCarga && (
        <>
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
              productoSeleccionadoId={
                inventario.productoSeleccionado?.id ?? ''
              }
              busqueda={inventario.busqueda}
              categoriaSeleccionada={inventario.categoriaSeleccionada}
              categorias={inventario.categorias}
              onCambiarBusqueda={inventario.cambiarBusqueda}
              onCambiarCategoria={inventario.cambiarCategoria}
              onSeleccionarProducto={inventario.seleccionarProducto}
              categoriasDisponibles={categoriasAdmin.filter(
                (categoria) => categoria.activa,
              )}
              onCrearProducto={crearProducto}
              onCargarImagenProducto={cargarImagenProducto}
            />

            <ProductDetail
              producto={inventario.productoSeleccionado}
              categorias={categoriasEditables}
              onGuardarProducto={guardarCambiosProducto}
              onGuardarVariante={guardarCambiosVariante}
              onAjustarStock={guardarAjusteStock}
              onCrearVariante={crearVariante}
              cargarImagenProducto={cargarImagenProducto}
              eliminarImagenProducto={eliminarImagenProducto}
              cargarImagenVariante={cargarImagenVariante}
              eliminarImagenVariante={eliminarImagenVariante}
              obtenerImagenesVariante={obtenerImagenesVariante}
              cargarImagenAdicionalVariante={cargarImagenAdicionalVariante}
              eliminarImagenAdicionalVariante={eliminarImagenAdicionalVariante}
            />
          </section>
        </>
      )}
    </main>
  )
}

export default AdminPanel