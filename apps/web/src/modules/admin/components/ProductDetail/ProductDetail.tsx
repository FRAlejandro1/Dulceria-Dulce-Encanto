import { useEffect, useRef, useState } from 'react'
import type {
  ActualizarProductoAdmin,
  ActualizarVarianteAdmin,
  AjustarStockAdmin,
  VarianteAdmin,
} from '../../types/inventory.types'
import type { PropiedadesDetalleProducto } from '../../types/admin.types'
import './ProductDetail.css'

import { debeFinalizarArrastre } from './ProductDetail.utils'
type DatosProducto = {
  descripcion: string
  imagenUrl: string
}

type DatosVariante = {
  nombre: string
  precio: string
  imagenUrl: string
}

type DatosStock = {
  stockFisico: number
  cantidad: string
}

const TAMANO_MAXIMO_IMAGEN = 5 * 1024 * 1024

const FORMATOS_IMAGEN_PERMITIDOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
]

function crearDatosVariantes(
  variantes: VarianteAdmin[],
): Record<string, DatosVariante> {
  return Object.fromEntries(
    variantes.map((variante) => [
      variante.id,
      {
        nombre: variante.nombre,
        precio: variante.precio,
        imagenUrl: variante.imagenUrl ?? '',
      },
    ]),
  )
}

function crearDatosStock(
  variantes: VarianteAdmin[],
): Record<string, DatosStock> {
  return Object.fromEntries(
    variantes.map((variante) => [
      variante.id,
      {
        stockFisico: variante.stockFisico,
        cantidad: '',
      },
    ]),
  )
}

function ProductDetail({
  producto,
  onGuardarProducto,
  onGuardarVariante,
  onAjustarStock,
  cargarImagenProducto,
  cargarImagenVariante,
}: PropiedadesDetalleProducto) {
  const [datosProducto, setDatosProducto] = useState<DatosProducto>({
    descripcion: '',
    imagenUrl: '',
  })

  const [datosVariantes, setDatosVariantes] = useState<
    Record<string, DatosVariante>
  >({})

  const [datosStock, setDatosStock] = useState<
    Record<string, DatosStock>
  >({})

  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [varianteSeleccionadaId, setVarianteSeleccionadaId] = useState('')
  const [urlAbierta, setUrlAbierta] = useState(false)
  const [arrastrandoImagen, setArrastrandoImagen] = useState(false)
  const [imagenLocal, setImagenLocal] = useState<Record<string, string>>({})
  const [archivosImagen, setArchivosImagen] = useState<Record<string, File>>({})
  const [errorImagen, setErrorImagen] = useState('')

  const inputArchivoRef = useRef<HTMLInputElement>(null)


  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reinicia el formulario al cambiar el producto seleccionado.
    setMensaje('')
    setError('')
    setErrorImagen('')
    setUrlAbierta(false)
    setArrastrandoImagen(false)
    setImagenLocal({})
    setArchivosImagen({})
    setVarianteSeleccionadaId('')

    if (!producto) {
      setDatosProducto({ descripcion: '', imagenUrl: '' })
      setDatosVariantes({})
      setDatosStock({})
      return
    }

    setDatosProducto({
      descripcion: producto.descripcion ?? '',
      imagenUrl: producto.imagenUrl ?? '',
    })

    setDatosVariantes(crearDatosVariantes(producto.variantes))
    setDatosStock(crearDatosStock(producto.variantes))
  }, [producto])

  if (!producto) {
    return (
      <section
        className="admin-product-detail"
        aria-label="Detalle del producto"
      >
        <div className="admin-product-detail__empty">
          <span aria-hidden="true">DE</span>
          <h2>Selecciona un producto</h2>
          <p>
            Elige un producto de la lista para consultar sus detalles.
          </p>
        </div>
      </section>
    )
  }

  const productoActual = producto

  const varianteSeleccionada: VarianteAdmin | undefined =
    productoActual.variantes.find(
      (variante) => variante.id === varianteSeleccionadaId,
    )

  const datosVarianteSeleccionada = varianteSeleccionada
    ? datosVariantes[varianteSeleccionada.id]
    : undefined

  const stockTotal = productoActual.variantes.reduce(
    (total, variante) => total + variante.stockDisponible,
    0,
  )

  const productoModificado =
    datosProducto.descripcion !== (productoActual.descripcion ?? '')
    || datosProducto.imagenUrl !== (productoActual.imagenUrl ?? '')

  const varianteModificada = productoActual.variantes.some((variante) => {
    const datos = datosVariantes[variante.id]

    return Boolean(
      datos
      && (
        datos.nombre !== variante.nombre
        || datos.precio !== variante.precio
        || datos.imagenUrl !== (variante.imagenUrl ?? '')
      ),
    )
  })

  const stockModificado = productoActual.variantes.some((variante) => {
    const datos = datosStock[variante.id]

    return Boolean(datos && datos.cantidad.trim() !== '')
  })

  const hayImagenLocal = Object.keys(imagenLocal).length > 0
  const hayArchivosPendientes = Object.keys(archivosImagen).length > 0

  const hayCambios =
    productoModificado
    || varianteModificada
    || stockModificado
    || hayImagenLocal
    || hayArchivosPendientes

  const claveImagen = varianteSeleccionada?.id ?? productoActual.id

  const urlImagenActual = varianteSeleccionada
    ? datosVarianteSeleccionada?.imagenUrl ?? ''
    : datosProducto.imagenUrl

  const imagenVisible =
    imagenLocal[claveImagen] || urlImagenActual.trim()

  function cambiarVariante(
    varianteId: string,
    campo: keyof DatosVariante,
    valor: string,
  ): void {
    setDatosVariantes((actuales) => ({
      ...actuales,
      [varianteId]: {
        ...actuales[varianteId],
        [campo]: valor,
      },
    }))

    if (campo === 'imagenUrl') {
      setImagenLocal((actuales) => {
        if (!actuales[varianteId]) return actuales

        const siguientes = { ...actuales }
        delete siguientes[varianteId]
        return siguientes
      })

      setArchivosImagen((actuales) => {
        if (!actuales[varianteId]) return actuales

        const siguientes = { ...actuales }
        delete siguientes[varianteId]
        return siguientes
      })
    }

    setMensaje('')
    setError('')
    setErrorImagen('')
  }

  function cambiarImagenUrl(valor: string): void {
    if (varianteSeleccionada) {
      cambiarVariante(varianteSeleccionada.id, 'imagenUrl', valor)
      return
    }

    setDatosProducto((actual) => ({
      ...actual,
      imagenUrl: valor,
    }))

    setImagenLocal((actuales) => {
      if (!actuales[productoActual.id]) return actuales

      const siguientes = { ...actuales }
      delete siguientes[productoActual.id]
      return siguientes
    })

    setArchivosImagen((actuales) => {
      if (!actuales[productoActual.id]) return actuales

      const siguientes = { ...actuales }
      delete siguientes[productoActual.id]
      return siguientes
    })

    setMensaje('')
    setError('')
    setErrorImagen('')
  }

  function procesarArchivoImagen(archivo?: File): void {
    if (!archivo) return

    if (!FORMATOS_IMAGEN_PERMITIDOS.includes(archivo.type)) {
      setErrorImagen('Formato no válido. Usa JPG, PNG o WebP.')
      return
    }

    if (archivo.size > TAMANO_MAXIMO_IMAGEN) {
      setErrorImagen('La imagen no puede superar los 5 MB.')
      return
    }

    const lector = new FileReader()

    lector.onload = () => {
      if (typeof lector.result !== 'string') {
        setErrorImagen('No se pudo previsualizar la imagen.')
        return
      }

      setImagenLocal((actuales) => ({
        ...actuales,
        [claveImagen]: lector.result as string,
      }))

      setArchivosImagen((actuales) => ({
        ...actuales,
        [claveImagen]: archivo,
      }))

      setErrorImagen('')
      setMensaje('Vista previa lista. Pulsa Guardar cambios para subirla.')
      setError('')
    }

    lector.onerror = () => {
      setErrorImagen('No se pudo leer el archivo seleccionado.')
    }

    lector.readAsDataURL(archivo)
  }

  function cancelarCambios(): void {
    setDatosProducto({
      descripcion: productoActual.descripcion ?? '',
      imagenUrl: productoActual.imagenUrl ?? '',
    })

    setDatosVariantes(crearDatosVariantes(productoActual.variantes))
    setDatosStock(crearDatosStock(productoActual.variantes))
    setImagenLocal({})
    setArchivosImagen({})
    setUrlAbierta(false)
    setErrorImagen('')
    setMensaje('')
    setError('')
  }

  function validarUrlImagen(valor: string): boolean {
    if (!valor.trim()) return true

    try {
      const url = new URL(valor.trim())
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  async function guardarCambios(): Promise<void> {
    setMensaje('')
    setError('')

    const hayCambiosPersistibles =
      productoModificado || varianteModificada || stockModificado

    if (!hayCambiosPersistibles && !hayArchivosPendientes) return

    const imagenUrlActual = productoActual.imagenUrl ?? ''
    const imagenUrlModificada = datosProducto.imagenUrl !== imagenUrlActual

    if (
      imagenUrlModificada &&
      !validarUrlImagen(datosProducto.imagenUrl)
    ) {
      setError('La URL de imagen del producto no es válida.')
      return
    }

    for (const variante of productoActual.variantes) {
      const datos = datosVariantes[variante.id]
      const stock = datosStock[variante.id]

      if (!datos || !stock) continue

      if (!datos.nombre.trim()) {
        setError(`El nombre de la variante ${variante.nombre} es obligatorio.`)
        return
      }

      if (
        datos.precio.trim() === ''
        || !Number.isFinite(Number(datos.precio))
        || Number(datos.precio) < 0
      ) {
        setError(`El precio de ${datos.nombre} no es válido.`)
        return
      }

      if (!validarUrlImagen(datos.imagenUrl)) {
        setError(`La URL de imagen de ${datos.nombre} no es válida.`)
        return
      }

      if (stock.cantidad.trim() !== '') {
        const cantidad = Number(stock.cantidad)

        if (!Number.isSafeInteger(cantidad)) {
          setError(`El ajuste de stock de ${datos.nombre} debe ser entero.`)
          return
        }

        if (
          cantidad !== 0
          && variante.stockFisico + cantidad < variante.stockReservado
        ) {
          setError(
            `El stock de ${datos.nombre} no puede quedar por debajo de las unidades reservadas.`,
          )
          return
        }
      }
    }

    setGuardando(true)

    try {
      if (productoModificado) {
        const cambios: ActualizarProductoAdmin = {}

        if (datosProducto.descripcion !== (productoActual.descripcion ?? '')) {
          cambios.descripcion = datosProducto.descripcion.trim()
        }

        if (datosProducto.imagenUrl !== (productoActual.imagenUrl ?? '')) {
          cambios.imagenUrl = datosProducto.imagenUrl.trim()
        }

        if (Object.keys(cambios).length > 0) {
          await onGuardarProducto(productoActual.id, cambios)
        }
      }

      for (const variante of productoActual.variantes) {
        const datos = datosVariantes[variante.id]
        const stock = datosStock[variante.id]

        if (!datos || !stock) continue

        const cambiosVariante: ActualizarVarianteAdmin = {}

        if (datos.nombre !== variante.nombre) {
          cambiosVariante.nombre = datos.nombre.trim()
        }

        if (datos.precio !== variante.precio) {
          cambiosVariante.precio = datos.precio
        }

        if (datos.imagenUrl !== (variante.imagenUrl ?? '')) {
          cambiosVariante.imagenUrl = datos.imagenUrl.trim()
        }

        if (Object.keys(cambiosVariante).length > 0) {
          await onGuardarVariante(variante.id, cambiosVariante)
        }

        const cantidad = Number(stock.cantidad)

        if (
          stock.cantidad.trim() !== ''
          && Number.isSafeInteger(cantidad)
          && cantidad !== 0
        ) {
          const cambiosStock: AjustarStockAdmin = {
            cantidad,
            motivo: 'Ajuste manual desde el panel administrativo',
          }

          await onAjustarStock(variante.id, cambiosStock)
        }
      }

      for (const [clave, archivoImagen] of Object.entries(archivosImagen)) {
        if (clave === productoActual.id) {
          const imagenUrl = await cargarImagenProducto(
            productoActual.id,
            archivoImagen,
          )

          setDatosProducto((actuales) => ({
            ...actuales,
            imagenUrl,
          }))

          setImagenLocal((actuales) => {
            const siguientes = { ...actuales }
            delete siguientes[clave]
            return siguientes
          })
        } else if (
          productoActual.variantes.some((variante) => variante.id === clave)
        ) {
          const imagenUrl = await cargarImagenVariante(
            clave,
            archivoImagen,
          )

          setDatosVariantes((actuales) => ({
            ...actuales,
            [clave]: {
              ...actuales[clave],
              imagenUrl,
            },
          }))

          setImagenLocal((actuales) => {
            const siguientes = { ...actuales }
            delete siguientes[clave]
            return siguientes
          })
        }
      }

      setArchivosImagen({})
      setMensaje('Los cambios se guardaron correctamente.')
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudieron guardar todos los cambios.',
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section
      className="admin-product-detail"
      aria-label={`Detalle de ${productoActual.nombre}`}
    >
      <div className="admin-product-detail__heading">
        <div>
          <p className="admin-panel__eyebrow">DETALLE DEL PRODUCTO</p>
          <h2>{productoActual.nombre}</h2>
          <p className="admin-product-detail__category">
            {productoActual.categoria.nombre}
          </p>
        </div>

        <span className="admin-product-detail__badge">
          {productoActual.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      {mensaje && (
        <p className="admin-product-detail__notice" role="status">
          {mensaje}
        </p>
      )}

      {error && (
        <p className="admin-product-detail__notice" role="alert">
          {error}
        </p>
      )}

      <div
        className={`admin-product-detail__image-frame ${arrastrandoImagen ? 'is-dragging' : ''}`}
        onDragOver={(evento) => {
          evento.preventDefault()
          setArrastrandoImagen(true)
        }}
        onDragLeave={(evento) => {
          if (
            debeFinalizarArrastre(
              evento.currentTarget,
              evento.relatedTarget,
            )
          ) {
            setArrastrandoImagen(false)
          }
        }}
        onDrop={(evento) => {
          evento.preventDefault()
          setArrastrandoImagen(false)
          procesarArchivoImagen(evento.dataTransfer.files[0])
        }}
      >
        {imagenVisible ? (
          <img
            className="admin-product-detail__image"
            src={imagenVisible}
            alt={
              varianteSeleccionada
                ? datosVarianteSeleccionada?.nombre ?? varianteSeleccionada.nombre
                : productoActual.nombre
            }
          />
        ) : (
          <div className="admin-product-detail__image-placeholder">
            <span>DE</span>
            <small>Arrastra una foto aquí</small>
          </div>
        )}

        <div className="admin-product-detail__image-tools">
          <button
            type="button"
            className="admin-product-detail__image-tool"
            onClick={() => setUrlAbierta((abierta) => !abierta)}
            aria-expanded={urlAbierta}
            aria-controls="admin-product-image-url"
          >
            URL
          </button>

          <button
            type="button"
            className="admin-product-detail__image-tool"
            onClick={() => inputArchivoRef.current?.click()}
            aria-label="Subir imagen desde el equipo"
          >
            <span aria-hidden="true">▧</span>
            Subir foto
          </button>
        </div>

        {urlAbierta && (
          <div
            className="admin-product-detail__image-url"
            id="admin-product-image-url"
          >
            <input
              type="url"
              value={urlImagenActual}
              placeholder="https://..."
              aria-label={
                varianteSeleccionada
                  ? 'URL de la imagen de la variante'
                  : 'URL de la imagen del producto'
              }
              onChange={(evento) => cambiarImagenUrl(evento.target.value)}
            />

            <button
              type="button"
              onClick={() => setUrlAbierta(false)}
            >
              Listo
            </button>
          </div>
        )}

        <input
          ref={inputArchivoRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          hidden
          onChange={(evento) => {
            procesarArchivoImagen(evento.target.files?.[0])
            evento.target.value = ''
          }}
        />

        {errorImagen && (
          <p className="admin-product-detail__image-error" role="alert">
            {errorImagen}
          </p>
        )}
      </div>

      <div className="admin-product-detail__quick-stats">
        <div>
          <span>Variantes</span>
          <strong>{productoActual.variantes.length}</strong>
        </div>

        <div>
          <span>Existencias disponibles</span>
          <strong>{stockTotal}</strong>
        </div>
      </div>

      <div className="admin-product-detail__editor-row">
        <div className="admin-product-detail__section">
          <h3>Descripción</h3>

          {!datosProducto.descripcion.trim() && (
            <p>Sin descripción registrada.</p>
          )}

          <textarea
            className="admin-edit-input"
            value={datosProducto.descripcion}
            onChange={(evento) => {
              setDatosProducto((actual) => ({
                ...actual,
                descripcion: evento.target.value,
              }))
              setMensaje('')
              setError('')
            }}
            rows={4}
            aria-label="Descripción del producto"
            placeholder="Descripción del producto"
          />
        </div>

        {varianteSeleccionada && datosVarianteSeleccionada && (
          <div className="admin-product-detail__section">
            <h3>Variante seleccionada</h3>

            <label className="admin-edit-field">
              <span>Nombre</span>
              <input
                className="admin-edit-input"
                value={datosVarianteSeleccionada.nombre}
                onChange={(evento) =>
                  cambiarVariante(
                    varianteSeleccionada.id,
                    'nombre',
                    evento.target.value,
                  )
                }
                aria-label="Nombre de la variante seleccionada"
              />
            </label>

            <label className="admin-edit-field">
              <span>Precio</span>
              <input
                className="admin-edit-input"
                type="number"
                min="0"
                step="0.01"
                value={datosVarianteSeleccionada.precio}
                onChange={(evento) =>
                  cambiarVariante(
                    varianteSeleccionada.id,
                    'precio',
                    evento.target.value,
                  )
                }
                aria-label="Precio de la variante seleccionada"
              />
            </label>
          </div>
        )}
      </div>

      <div className="admin-product-detail__section">
        <div className="admin-product-detail__section-heading">
          <h3>Variantes y existencias</h3>
          <span>{productoActual.variantes.length} registradas</span>
        </div>

        {productoActual.variantes.length === 0 ? (
          <p className="admin-product-detail__empty-variants">
            Este producto no tiene variantes registradas.
          </p>
        ) : (
          <div className="admin-variant-list">
            {productoActual.variantes.map((variante) => {
              const datos = datosVariantes[variante.id]
              const stock = datosStock[variante.id]
              const seleccionada = variante.id === varianteSeleccionadaId

              if (!datos || !stock) return null

              return (
                <article
                  className="admin-variant"
                  key={variante.id}
                  aria-current={seleccionada ? 'true' : undefined}
                >
                  <div className="admin-variant__info">
                    <button
                      type="button"
                      className="admin-variant__select"
                      onClick={() => {
                        setVarianteSeleccionadaId(variante.id)
                        setUrlAbierta(false)
                        setErrorImagen('')
                        setMensaje('')
                        setError('')
                      }}
                      aria-pressed={seleccionada}
                    >
                      <strong>{datos.nombre}</strong>
                    </button>

                    <span>SKU: {variante.sku}</span>
                    <span>${Number(datos.precio).toFixed(2)}</span>
                    <span>{variante.stockDisponible} disponibles</span>
                  </div>

                  <div className="admin-variant__numbers">
                    <label>
                      <span>Ajuste de stock</span>
                      <input
                        type="number"
                        step="1"
                        value={stock.cantidad}
                        placeholder={`Actual: ${stock.stockFisico}`}
                        onChange={(evento) => {
                          setDatosStock((actuales) => ({
                            ...actuales,
                            [variante.id]: {
                              ...actuales[variante.id],
                              cantidad: evento.target.value,
                            },
                          }))
                          setMensaje('')
                          setError('')
                        }}
                        aria-label={`Ajuste de stock de ${datos.nombre}`}
                      />
                    </label>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      <div className="admin-product-detail__actions">
        <button
          type="button"
          onClick={() => void guardarCambios()}
          disabled={!hayCambios || guardando}
        >
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>

        <button
          type="button"
          onClick={cancelarCambios}
          disabled={!hayCambios || guardando}
        >
          Cancelar cambios
        </button>

        <button type="button" disabled>
          Crear producto
        </button>
      </div>
    </section>
  )
}

export default ProductDetail
