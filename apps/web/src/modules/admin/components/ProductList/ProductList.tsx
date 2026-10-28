import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import type { CrearProductoAdmin } from '../../types/inventory.types'
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
  categoriasDisponibles,
  onCrearProducto,
  onCargarImagenProducto,
}: PropiedadesListaProductos) {
  const [productoExpandidoId, setProductoExpandidoId] =
    useState(productoSeleccionadoId)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [enviandoProducto, setEnviandoProducto] = useState(false)
  const [errorCreacion, setErrorCreacion] = useState('')
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [descripcionNueva, setDescripcionNueva] = useState('')
  const [categoriaNueva, setCategoriaNueva] = useState('')
  const [nombreVarianteNueva, setNombreVarianteNueva] = useState('')
  const [skuNuevo, setSkuNuevo] = useState('')
  const [precioNuevo, setPrecioNuevo] = useState('')

  const selectorImagenRef = useRef<HTMLInputElement>(null)
  const vistaPreviaLocalRef = useRef<string | null>(null)

  const [imagenNueva, setImagenNueva] = useState<File | null>(null)
  const [productoCreadoId, setProductoCreadoId] = useState<string | null>(null)
  const [urlImagenNueva, setUrlImagenNueva] = useState('')
  const [urlImagenAbierta, setUrlImagenAbierta] = useState(false)
  const [arrastrandoImagen, setArrastrandoImagen] = useState(false)
  const [vistaPreviaImagen, setVistaPreviaImagen] = useState('')
  const [urlAplicada, setUrlAplicada] = useState('')

  const categoriasSeguras = useMemo(
    () => categoriasDisponibles ?? [],
    [categoriasDisponibles],
  )
  const categoriaActivaSeleccionada = categoriasSeguras.some(
    (categoria) =>
      categoria.id === categoriaNueva && categoria.activa,
  )
    ? categoriaNueva
    : (categoriasSeguras.find((categoria) => categoria.activa)?.id ?? '')
  const hayCategoriasActivas = categoriasSeguras.some(
    (categoria) => categoria.activa,
  )

  function liberarVistaPreviaLocal() {
    if (vistaPreviaLocalRef.current) {
      URL.revokeObjectURL(vistaPreviaLocalRef.current)
      vistaPreviaLocalRef.current = null
    }
  }

  function seleccionarArchivo(archivo: File | null) {
    setErrorCreacion('')

    if (!archivo) return

    if (!archivo.type.startsWith('image/')) {
      setErrorCreacion('Selecciona un archivo de imagen válido.')
      return
    }

    liberarVistaPreviaLocal()

    const vistaPrevia = URL.createObjectURL(archivo)
    vistaPreviaLocalRef.current = vistaPrevia

    setImagenNueva(archivo)
    setVistaPreviaImagen(vistaPrevia)
    setUrlImagenNueva('')
    setUrlAplicada('')
  }

  function aplicarUrlImagen() {
    const url = urlImagenNueva.trim()

    if (!url) {
      setErrorCreacion('Introduce la URL de la imagen.')
      return
    }

    try {
      const urlValidada = new URL(url)

      if (
        urlValidada.protocol !== 'https:' &&
        urlValidada.protocol !== 'http:'
      ) {
        setErrorCreacion('La URL debe comenzar con HTTP o HTTPS.')
        return
      }

      liberarVistaPreviaLocal()
      setImagenNueva(null)
      setVistaPreviaImagen(urlValidada.href)
      setUrlAplicada(urlValidada.href)
      setUrlImagenAbierta(false)
      setErrorCreacion('')
    } catch {
      setErrorCreacion('Introduce una URL de imagen válida.')
    }
  }

  function manejarArrastre(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault()
    setArrastrandoImagen(true)
  }

  function manejarSalidaArrastre(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault()

    if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) {
      setArrastrandoImagen(false)
    }
  }

  function manejarSoltarImagen(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault()
    setArrastrandoImagen(false)
    seleccionarArchivo(evento.dataTransfer.files?.[0] ?? null)
  }

  function limpiarFormulario() {
    liberarVistaPreviaLocal()
    setNombreNuevo('')
    setDescripcionNueva('')
    setCategoriaNueva('')
    setNombreVarianteNueva('')
    setSkuNuevo('')
    setPrecioNuevo('')
    setImagenNueva(null)
    setProductoCreadoId(null)
    setUrlImagenNueva('')
    setUrlImagenAbierta(false)
    setArrastrandoImagen(false)
    setVistaPreviaImagen('')
    setUrlAplicada('')

    if (selectorImagenRef.current) {
      selectorImagenRef.current.value = ''
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sincroniza la expansión con la selección externa.
    setProductoExpandidoId(productoSeleccionadoId)
  }, [productoSeleccionadoId])

  async function manejarCreacion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErrorCreacion('')

    if (imagenNueva && !imagenNueva.type.startsWith('image/')) {
      setErrorCreacion('Selecciona un archivo de imagen válido.')
      return
    }

    if (urlAplicada && !imagenNueva) {
      setErrorCreacion(
        'La URL solo sirve para la vista previa. Selecciona una imagen para subirla.',
      )
      return
    }

    setEnviandoProducto(true)

    try {
      if (productoCreadoId) {
        if (imagenNueva) {
          await onCargarImagenProducto(productoCreadoId, imagenNueva)
        } else {
          setErrorCreacion('Selecciona una imagen para completar la carga.')
          return
        }

        limpiarFormulario()
        setMostrarFormulario(false)
        return
      }

      const nombre = nombreNuevo.trim()
      const nombreVariante = nombreVarianteNueva.trim()
      const sku = skuNuevo.trim()
      const precio = Number(precioNuevo)

      if (!nombre || !nombreVariante || !sku || !categoriaActivaSeleccionada) {
        setErrorCreacion('Completa los campos obligatorios.')
        return
      }

      if (!precioNuevo.trim() || !Number.isFinite(precio) || precio <= 0) {
        setErrorCreacion('Introduce un precio mayor que cero.')
        return
      }

      const datos: CrearProductoAdmin = {
        nombre,
        descripcion: descripcionNueva.trim(),
        categoriaId: categoriaActivaSeleccionada,
        variantes: [
          {
            nombre: nombreVariante,
            sku,
            precio: precio.toFixed(2),
          },
        ],
      }

      const productoId = await onCrearProducto(datos)
      setProductoCreadoId(productoId)

      if (imagenNueva) {
        await onCargarImagenProducto(productoId, imagenNueva)
      }

      limpiarFormulario()
      setMostrarFormulario(false)
    } catch (error: unknown) {
      setErrorCreacion(
        error instanceof Error
          ? error.message
          : productoCreadoId
            ? 'No se pudo subir la imagen. Puedes intentarlo de nuevo.'
            : 'No se pudo crear el producto. Inténtalo de nuevo.',
      )
    } finally {
      setEnviandoProducto(false)
    }
  }

  const productosOrdenados = [...productos].sort((a, b) => {
    if (a.id === productoSeleccionadoId) return -1
    if (b.id === productoSeleccionadoId) return 1
    return 0
  })

  function manejarSeleccion(productoId: string) {
    const yaExpandido = productoExpandidoId === productoId

    onSeleccionarProducto(productoId)
    setProductoExpandidoId(yaExpandido ? '' : productoId)
  }

  return (
    <section
      className="admin-inventory__list"
      aria-label="Lista de productos"
    >
      <div className="admin-inventory__list-heading">
        <div>
          <p className="admin-section__eyebrow">CATÁLOGO</p>
          <h2>Productos</h2>
          <p className="admin-section__description">
            Selecciona un producto para consultar sus variantes.
          </p>
        </div>

        <span className="admin-product-list__count">
          {productos.length}
        </span>

        <button
          className="admin-create-product-button"
          type="button"
          onClick={() => {
            if (productoCreadoId) return

            setMostrarFormulario((mostrar) => !mostrar)
            setErrorCreacion('')
          }}
          aria-expanded={mostrarFormulario}
        >
          {mostrarFormulario
            ? productoCreadoId
              ? 'Producto creado · completar imagen'
              : 'Cancelar creación'
            : '+ Crear producto'}
        </button>
      </div>

      {mostrarFormulario && (
        <form
          className="admin-create-product-form"
          onSubmit={manejarCreacion}
        >
          <h3>Nuevo producto</h3>

          <label>
            Nombre del producto *
            <input
              name="nombre"
              value={nombreNuevo}
              onChange={(evento) => setNombreNuevo(evento.target.value)}
              maxLength={120}
              required
              disabled={Boolean(productoCreadoId)}
            />
          </label>

          <label>
            Descripción
            <textarea
              name="descripcion"
              value={descripcionNueva}
              onChange={(evento) => setDescripcionNueva(evento.target.value)}
              rows={3}
              disabled={Boolean(productoCreadoId)}
            />
          </label>

          <label>
            Categoría *
            <select
              name="categoriaId"
              value={categoriaActivaSeleccionada}
              onChange={(evento) => setCategoriaNueva(evento.target.value)}
              required
              disabled={Boolean(productoCreadoId)}
            >
              <option value="">Selecciona una categoría</option>
              {categoriasSeguras
                .filter((categoria) => categoria.activa)
                .map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
            </select>
          </label>

          <h4>Primera variante</h4>

          <label>
            Nombre de la variante *
            <input
              name="nombreVariante"
              value={nombreVarianteNueva}
              onChange={(evento) => setNombreVarianteNueva(evento.target.value)}
              maxLength={120}
              required
              disabled={Boolean(productoCreadoId)}
            />
          </label>

          <label>
            SKU *
            <input
              name="sku"
              value={skuNuevo}
              onChange={(evento) => setSkuNuevo(evento.target.value)}
              maxLength={100}
              required
              disabled={Boolean(productoCreadoId)}
            />
          </label>

          <label>
            Precio *
            <input
              name="precio"
              type="number"
              min="0.01"
              step="0.01"
              value={precioNuevo}
              onChange={(evento) => setPrecioNuevo(evento.target.value)}
              required
              disabled={Boolean(productoCreadoId)}
            />
          </label>

          <div
            className={`admin-create-product-form__image admin-product-detail__image-frame ${arrastrandoImagen ? 'is-dragging' : ''
              }`}
            onDragOver={manejarArrastre}
            onDragLeave={manejarSalidaArrastre}
            onDrop={manejarSoltarImagen}
          >
            <input
              ref={selectorImagenRef}
              type="file"
              accept="image/*"
              hidden
              aria-label="Seleccionar imagen del producto"
              onChange={(evento) => {
                seleccionarArchivo(evento.target.files?.[0] ?? null)
                evento.target.value = ''
              }}
            />

            {vistaPreviaImagen ? (
              <img
                className="admin-create-product-form__image-preview"
                src={vistaPreviaImagen}
                alt="Vista previa de la imagen del producto"
                onError={() => {
                  setErrorCreacion('No se pudo mostrar la imagen seleccionada.')
                }}
              />
            ) : (
              <div className="admin-create-product-form__image-placeholder">
                <span aria-hidden="true">ï¼‹</span>
                <strong>Imagen del producto</strong>
                <span>Arrastra una imagen aquí o selecciona un archivo</span>
              </div>
            )}

            <div className="admin-product-detail__image-tools">
              <button
                className="admin-product-detail__image-tool"
                type="button"
                onClick={() => setUrlImagenAbierta((abierta) => !abierta)}
                aria-expanded={urlImagenAbierta}
                disabled={enviandoProducto}
              >
                URL
              </button>

              <button
                className="admin-product-detail__image-tool"
                type="button"
                onClick={() => selectorImagenRef.current?.click()}
                disabled={enviandoProducto}
              >
                {imagenNueva ? 'Cambiar foto' : 'Subir foto'}
              </button>
            </div>

            {urlImagenAbierta && (
              <div className="admin-product-detail__image-url">
                <label className="admin-sr-only" htmlFor="nueva-imagen-url">
                  URL de la imagen
                </label>
                <input
                  id="nueva-imagen-url"
                  type="url"
                  value={urlImagenNueva}
                  onChange={(evento) => setUrlImagenNueva(evento.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  disabled={enviandoProducto}
                />
                <button type="button" onClick={aplicarUrlImagen}>
                  Aplicar
                </button>
              </div>
            )}

            {imagenNueva && (
              <p className="admin-create-product-form__image-name" aria-live="polite">
                Archivo: {imagenNueva.name}
              </p>
            )}

            {urlAplicada && !imagenNueva && (
              <p className="admin-create-product-form__image-name" aria-live="polite">
                URL aplicada para vista previa. Para guardar la imagen, selecciona el archivo.
              </p>
            )}
          </div>

          {errorCreacion && (
            <p className="admin-create-product-form__error" role="alert">
              {errorCreacion}
            </p>
          )}

          <div className="admin-create-product-form__actions">
            <button
              type="button"
              onClick={() => {
                if (productoCreadoId) return

                limpiarFormulario()
                setMostrarFormulario(false)
                setErrorCreacion('')
              }}
              disabled={enviandoProducto || Boolean(productoCreadoId)}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={enviandoProducto || !hayCategoriasActivas}
            >
              {enviandoProducto
                ? productoCreadoId
                  ? 'Subiendo imagen...'
                  : 'Guardando...'
                : productoCreadoId
                  ? 'Reintentar imagen'
                  : 'Guardar producto'}
            </button>
          </div>
        </form>
      )}

      <label className="admin-inventory__search">
        <span className="admin-sr-only">Buscar productos</span>
        <input
          type="search"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(evento) => onCambiarBusqueda(evento.target.value)}
        />
      </label>

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
        {productosOrdenados.map((producto) => {
          const stockDisponible = producto.variantes.reduce(
            (total, variante) => total + variante.stockDisponible,
            0,
          )

          const seleccionado = producto.id === productoSeleccionadoId
          const expandido = producto.id === productoExpandidoId
          const idVariantes = `variantes-${producto.id}`

          return (
            <article
              className={
                seleccionado
                  ? 'admin-product-card admin-product-card--selected'
                  : 'admin-product-card'
              }
              key={producto.id}
            >
              <button
                type="button"
                className="admin-product"
                aria-pressed={seleccionado}
                aria-expanded={expandido}
                aria-controls={idVariantes}
                onClick={() => manejarSeleccion(producto.id)}
              >
                {producto.imagenUrl ? (
                  <img
                    className="admin-product__image"
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
                  <span className="admin-product__category">
                    {producto.categoria.nombre}
                  </span>
                  <span className="admin-product__description">
                    {producto.descripcion || 'Sin descripción registrada.'}
                  </span>
                  <small>
                    {producto.variantes.length}{' '}
                    {producto.variantes.length === 1
                      ? 'variante'
                      : 'variantes'}{' '}
                    · {stockDisponible} disponibles
                  </small>
                </span>

                <span
                  className={
                    expandido
                      ? 'admin-product__chevron admin-product__chevron--open'
                      : 'admin-product__chevron'
                  }
                  aria-hidden="true"
                >
                  âŒ„
                </span>
              </button>

              {expandido && (
                <div
                  className="admin-product__variants"
                  id={idVariantes}
                >
                  <h3>Variantes del producto</h3>

                  {producto.variantes.length > 0 ? (
                    producto.variantes.map((variante) => (
                      <div
                        className="admin-product-variant"
                        key={variante.id}
                      >
                        <div className="admin-product-variant__info">
                          <strong>{variante.nombre}</strong>
                          <span>SKU: {variante.sku}</span>
                        </div>

                        <div className="admin-product-variant__stock">
                          <strong>
                            ${Number(variante.precio).toFixed(2)}
                          </strong>
                          <span>
                            {variante.stockDisponible} disponibles
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="admin-product__no-variants">
                      Este producto no tiene variantes registradas.
                    </p>
                  )}
                </div>
              )}
            </article>
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
