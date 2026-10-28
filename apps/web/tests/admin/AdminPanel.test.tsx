
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ProductoAdmin,
  VarianteAdmin,
} from '../../src/modules/admin/types/inventory.types'
import {
  obtenerCategoriasAdmin,
  obtenerProductosAdmin,
  actualizarProductoAdmin,
  actualizarVarianteAdmin,
  ajustarStockAdmin,
  crearProductoAdmin,
  crearVarianteAdmin,
  cargarImagenProductoAdmin,
  eliminarImagenProductoAdmin,
  cargarImagenPrincipalVarianteAdmin,
  eliminarImagenPrincipalVarianteAdmin,
  obtenerImagenesVarianteAdmin,
  cargarImagenAdicionalVarianteAdmin,
  eliminarImagenAdicionalVarianteAdmin,
} from '../../src/modules/admin/services/admin.service'
import AdminPanel from '../../src/modules/admin/components/AdminPanel'
import InventorySummary from '../../src/modules/admin/components/InventorySummary/InventorySummary'
import ProductDetail from '../../src/modules/admin/components/ProductDetail/ProductDetail'
import ProductList from '../../src/modules/admin/components/ProductList/ProductList'

vi.mock('../../src/modules/admin/services/admin.service', () => ({
  obtenerProductosAdmin: vi.fn(),
  obtenerCategoriasAdmin: vi.fn(),
  actualizarProductoAdmin: vi.fn(),
  actualizarVarianteAdmin: vi.fn(),
  ajustarStockAdmin: vi.fn(),
  crearProductoAdmin: vi.fn(),
  crearVarianteAdmin: vi.fn(),
  cargarImagenProductoAdmin: vi.fn(),
  eliminarImagenProductoAdmin: vi.fn(),
  cargarImagenPrincipalVarianteAdmin: vi.fn(),
  eliminarImagenPrincipalVarianteAdmin: vi.fn(),
  obtenerImagenesVarianteAdmin: vi.fn(),
  cargarImagenAdicionalVarianteAdmin: vi.fn(),
  eliminarImagenAdicionalVarianteAdmin: vi.fn(),
}))

function crearVariante(
  id: string,
  precio: string,
  stockDisponible: number,
): VarianteAdmin {
  return {
    id,
    nombre: 'Unidad',
    sku: `SKU-${id}`,
    precio,
    imagenUrl: null,
    activa: true,
    stockDisponible,
    stockFisico: stockDisponible,
    stockReservado: 0,
  }
}

function crearProducto(
  id: string,
  nombre: string,
  categoria: string,
  opciones: {
    descripcion?: string | null
    imagenUrl?: string | null
    variantes?: VarianteAdmin[]
  } = {},
): ProductoAdmin {
  return {
    id,
    nombre,
    descripcion: opciones.descripcion ?? null,
    imagenUrl: opciones.imagenUrl ?? null,
    activo: true,
    categoriaId: categoria.toLowerCase(),
    categoria: {
      nombre: categoria,
      slug: categoria.toLowerCase(),
      activa: true,
    },
    variantes: opciones.variantes ?? [],
  }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.clearAllMocks()

  vi.mocked(obtenerProductosAdmin).mockResolvedValue([])
  vi.mocked(obtenerCategoriasAdmin).mockResolvedValue([])
  vi.mocked(actualizarProductoAdmin).mockResolvedValue(undefined)
  vi.mocked(actualizarVarianteAdmin).mockResolvedValue(undefined)

  vi.mocked(ajustarStockAdmin).mockResolvedValue({
    mensaje: 'Stock actualizado',
    inventario: {
      varianteId: 'ch-1',
      stockFisicoAnterior: 5,
      stockFisico: 6,
      stockReservado: 0,
      stockDisponible: 6,
      diferencia: 1,
    },
  })

  vi.mocked(crearProductoAdmin).mockResolvedValue('producto-nuevo')
  vi.mocked(crearVarianteAdmin).mockResolvedValue(undefined)
  vi.mocked(cargarImagenProductoAdmin).mockResolvedValue('/nueva-imagen.png')
  vi.mocked(eliminarImagenProductoAdmin).mockResolvedValue(undefined)
  vi.mocked(cargarImagenPrincipalVarianteAdmin).mockResolvedValue(
    '/variante.png',
  )
  vi.mocked(eliminarImagenPrincipalVarianteAdmin).mockResolvedValue(undefined)
  vi.mocked(obtenerImagenesVarianteAdmin).mockResolvedValue([])
  vi.mocked(cargarImagenAdicionalVarianteAdmin).mockResolvedValue(
    '/adicional.png',
  )
  vi.mocked(eliminarImagenAdicionalVarianteAdmin).mockResolvedValue(undefined)
})

const chocolate = crearProducto('1', 'Chocolate', 'Dulces', {
  descripcion: 'Chocolate oscuro',
  imagenUrl: '/chocolate.png',
  variantes: [
    crearVariante('ch-1', '5.00', 5),
    crearVariante('ch-2', '2.50', 3),
  ],
})

const caramelo = crearProducto('2', 'Caramelo', 'Confites', {
  descripcion: 'Caramelo de menta',
  variantes: [crearVariante('ca-1', '1.25', 7)],
})

const productos = [chocolate, caramelo]

const categoriasDisponibles = [
  { id: 'dulces', nombre: 'Dulces', slug: 'dulces', activa: true },
  { id: 'confites', nombre: 'Confites', slug: 'confites', activa: true },
]

const propiedadesDetalle = {
  producto: undefined,
  categorias: categoriasDisponibles.map(({ id, nombre }) => ({
    id,
    nombre,
  })),
  onGuardarProducto: vi.fn().mockResolvedValue(undefined),
  onGuardarVariante: vi.fn().mockResolvedValue(undefined),
  onAjustarStock: vi.fn().mockResolvedValue({
    mensaje: 'Stock actualizado',
    inventario: {
      varianteId: 'ch-1',
      stockFisicoAnterior: 5,
      stockFisico: 6,
      stockReservado: 0,
      stockDisponible: 6,
      diferencia: 1,
    },
  }),
  onCrearVariante: vi.fn().mockResolvedValue(undefined),
  cargarImagenProducto: vi.fn().mockResolvedValue('/imagen.png'),
  eliminarImagenProducto: vi.fn().mockResolvedValue(undefined),
  cargarImagenVariante: vi.fn().mockResolvedValue('/variante.png'),
  eliminarImagenVariante: vi.fn().mockResolvedValue(undefined),
  obtenerImagenesVariante: vi.fn().mockResolvedValue([]),
  cargarImagenAdicionalVariante: vi.fn().mockResolvedValue('/adicional.png'),
  eliminarImagenAdicionalVariante: vi.fn().mockResolvedValue(undefined),
}

describe('InventorySummary', () => {
  it('muestra las cantidades del inventario', () => {
    render(
      <InventorySummary
        cantidadProductos={2}
        cantidadVariantes={3}
        existenciasDisponibles={15}
      />,
    )

    expect(screen.getByLabelText('Resumen del inventario')).toBeTruthy()
    expect(screen.getByText('Productos')).toBeTruthy()
    expect(screen.getByText('Variantes')).toBeTruthy()
    expect(screen.getByText('Unidades disponibles')).toBeTruthy()
    expect(screen.getByText('15')).toBeTruthy()
  })
})

describe('ProductDetail', () => {
  it('muestra el estado vacÃ­o cuando no hay producto seleccionado', () => {
    render(<ProductDetail {...propiedadesDetalle} />)

    expect(screen.getByText('Selecciona un producto')).toBeTruthy()
    expect(
      screen.getByText(
        'Elige un producto de la lista para consultar sus detalles.',
      ),
    ).toBeTruthy()
  })

  it('muestra los detalles, la imagen y las variantes del producto', () => {
    render(<ProductDetail {...propiedadesDetalle} producto={chocolate} />)

    expect(screen.getByRole('heading', { name: 'Chocolate' })).toBeTruthy()
    expect(screen.getByText('Dulces')).toBeTruthy()
    expect(
      screen.getByRole('img', { name: 'Chocolate' }).getAttribute('src'),
    ).toBe('/chocolate.png')
    expect(screen.getByText('Chocolate oscuro')).toBeTruthy()
    expect(screen.getByText('SKU: SKU-ch-1')).toBeTruthy()
    expect(screen.getByText('$5.00')).toBeTruthy()
    expect(screen.getByText('5 disponibles')).toBeTruthy()
    expect(screen.getByText('$2.50')).toBeTruthy()
    expect(screen.getByText('3 disponibles')).toBeTruthy()
  })

  it('muestra textos alternativos sin imagen, descripción ni variantes', () => {
    const producto = crearProducto('3', 'Galleta', 'Dulces')

    render(<ProductDetail {...propiedadesDetalle} producto={producto} />)

    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText('Sin descripción registrada.')).toBeTruthy()
    expect(
      screen.getByText('Este producto no tiene variantes registradas.'),
    ).toBeTruthy()
  })

  it('rechaza archivos que no sean imágenes permitidas', () => {
    render(<ProductDetail {...propiedadesDetalle} producto={chocolate} />)

    const archivo = new File(['contenido'], 'documento.pdf', {
      type: 'application/pdf',
    })

    fireEvent.change(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      { target: { files: [archivo] } },
    )

    expect(screen.getByRole('alert').textContent).toContain(
      'Formato no válido. Usa JPG, PNG o WebP.',
    )
  })

  it('rechaza una imagen que supera los 5 MB', () => {
    render(<ProductDetail {...propiedadesDetalle} producto={chocolate} />)

    const archivo = new File(
      [new Uint8Array(5 * 1024 * 1024 + 1)],
      'imagen.png',
      { type: 'image/png' },
    )

    fireEvent.change(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      { target: { files: [archivo] } },
    )

    expect(screen.getByRole('alert').textContent).toContain(
      'La imagen no puede superar los 5 MB.',
    )
  })

  it('permite cancelar los cambios realizados en la descripción', () => {
    render(<ProductDetail {...propiedadesDetalle} producto={chocolate} />)

    const descripcion = screen.getByPlaceholderText(
      'Descripción del producto',
    ) as HTMLTextAreaElement

    fireEvent.change(descripcion, {
      target: { value: 'Descripción modificada' },
    })

    expect(descripcion.value).toBe('Descripción modificada')

    fireEvent.click(
      screen.getByRole('button', { name: 'Cancelar cambios' }),
    )

    expect(descripcion.value).toBe('Chocolate oscuro')
  })

  it('rechaza una URL de imagen que no use HTTP o HTTPS', () => {
    render(<ProductDetail {...propiedadesDetalle} producto={chocolate} />)

    fireEvent.click(screen.getByRole('button', { name: 'URL' }))

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'URL de la imagen del producto',
      }),
      { target: { value: 'javascript:alert(1)' } },
    )

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(screen.getByRole('alert').textContent).toContain(
      'La URL de imagen del producto no es válida.',
    )
    expect(propiedadesDetalle.onGuardarProducto).not.toHaveBeenCalled()
  })

  it('rechaza un precio negativo y no guarda los cambios', async () => {
    render(<ProductDetail {...propiedadesDetalle} producto={chocolate} />)

    const textoSku = screen.getByText('SKU: SKU-ch-1')
    const articulo = textoSku.closest('article')

    if (!articulo) {
      throw new Error('No se encontró la variante ch-1')
    }

    fireEvent.click(
      within(articulo).getByRole('button', { name: 'Unidad' }),
    )

    fireEvent.change(
      screen.getByRole('spinbutton', {
        name: 'Precio de la variante seleccionada',
      }),
      { target: { value: '-1' } },
    )

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('no es válido.')
    expect(propiedadesDetalle.onGuardarProducto).not.toHaveBeenCalled()
    expect(propiedadesDetalle.onGuardarVariante).not.toHaveBeenCalled()
  })

  it('rechaza un ajuste de stock que no sea entero', async () => {
    render(<ProductDetail {...propiedadesDetalle} producto={chocolate} />)

    const textoSku = screen.getByText('SKU: SKU-ch-1')
    const articulo = textoSku.closest('article')

    if (!articulo) {
      throw new Error('No se encontró la variante ch-1')
    }

    fireEvent.click(
      within(articulo).getByRole('button', { name: 'Unidad' }),
    )

    fireEvent.change(
      within(articulo).getByRole('spinbutton', {
        name: 'Ajuste de stock de Unidad',
      }),
      { target: { value: '1.5' } },
    )

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('entero')
    })

    expect(propiedadesDetalle.onAjustarStock).not.toHaveBeenCalled()
  })
})

describe('ProductList', () => {
  const propiedades = {
    productos,
    productoSeleccionadoId: '1',
    busqueda: '',
    categoriaSeleccionada: 'Todas',
    categorias: ['Todas', 'Dulces', 'Confites'],
    onCambiarBusqueda: vi.fn(),
    onCambiarCategoria: vi.fn(),
    onSeleccionarProducto: vi.fn(),
    categoriasDisponibles,
    onCrearProducto: vi.fn().mockResolvedValue('producto-nuevo'),
    onCargarImagenProducto: vi.fn().mockResolvedValue('/imagen.png'),
  }

  it('muestra productos, stock, categorÃ­as e imagen alternativa', () => {
    render(<ProductList {...propiedades} />)

    expect(
      screen.getByRole('region', { name: 'Lista de productos' }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: /Chocolate/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Caramelo/ })).toBeTruthy()
    expect(
      screen
        .getByRole('button', { name: /Chocolate/ })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    expect(screen.getByRole('presentation').getAttribute('src')).toBe(
      '/chocolate.png',
    )
    expect(screen.getByText('DE')).toBeTruthy()
    expect(screen.getByText(/2 variantes/)).toBeTruthy()
    expect(screen.getByText(/8 disponibles/)).toBeTruthy()
  })

  it('notifica la búsqueda, el cambio de categorÃ­a y la selección', () => {
    render(<ProductList {...propiedades} />)

    fireEvent.change(
      within(screen.getByRole('region', { name: 'Lista de productos' }))
        .getByPlaceholderText('Buscar producto...'),
      { target: { value: 'menta' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Confites' }))
    fireEvent.click(screen.getByRole('button', { name: /Caramelo/ }))

    expect(propiedades.onCambiarBusqueda).toHaveBeenCalledWith('menta')
    expect(propiedades.onCambiarCategoria).toHaveBeenCalledWith('Confites')
    expect(propiedades.onSeleccionarProducto).toHaveBeenCalledWith('2')
  })

  it('muestra el mensaje cuando la lista está vacÃ­a', () => {
    render(<ProductList {...propiedades} productos={[]} />)

    expect(screen.getByRole('status').textContent).toBe(
      'No se encontraron productos con esos filtros.',
    )
  })
})

describe('AdminPanel', () => {
  it('carga productos administrativos e integra métricas y filtros', async () => {
    vi.mocked(obtenerProductosAdmin).mockResolvedValue(productos)

    render(<AdminPanel alVolverATienda={vi.fn()} />)

    expect(
      screen.getByText('Cargando inventario administrativo...'),
    ).toBeTruthy()

    expect(
      await screen.findByRole('heading', { name: 'Chocolate' }),
    ).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Inventario' })).toBeTruthy()

    const resumen = screen.getByLabelText('Resumen del inventario')

    expect(
      within(resumen).getByText('Productos').parentElement?.textContent,
    ).toContain('2')
    expect(
      within(resumen).getByText('Variantes').parentElement?.textContent,
    ).toContain('3')
    expect(
      within(resumen).getByText('Unidades disponibles').parentElement
        ?.textContent,
    ).toContain('15')

    fireEvent.change(
      within(screen.getByRole('region', { name: 'Lista de productos' }))
        .getByPlaceholderText('Buscar producto...'),
      { target: { value: 'menta' } },
    )

    expect(screen.getByRole('button', { name: /Caramelo/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Chocolate/ })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Caramelo' })).toBeTruthy()
    expect(obtenerProductosAdmin).toHaveBeenCalledOnce()
    expect(obtenerCategoriasAdmin).toHaveBeenCalledOnce()
  })

  it('muestra el estado vacÃ­o cuando la API no devuelve productos', async () => {
    vi.mocked(obtenerProductosAdmin).mockResolvedValue([])

    render(<AdminPanel alVolverATienda={vi.fn()} />)

    expect(
      await screen.findByText('No se encontraron productos con esos filtros.'),
    ).toBeTruthy()
    expect(screen.getByText('Selecciona un producto')).toBeTruthy()

    expect(
      within(screen.getByRole('region', { name: 'Resumen del inventario' }))
        .getAllByText('0'),
    ).toHaveLength(3)
  })

  it('muestra un error y permite reintentar si falla la carga', async () => {
    vi.mocked(obtenerProductosAdmin)
      .mockRejectedValueOnce(new Error('Error de conexión'))
      .mockResolvedValueOnce(productos)

    render(<AdminPanel alVolverATienda={vi.fn()} />)

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText(/Error de conexión/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(
      await screen.findByRole('heading', { name: 'Chocolate' }),
    ).toBeTruthy()
    expect(obtenerProductosAdmin).toHaveBeenCalledTimes(2)
  })

  it('muestra el mensaje predeterminado cuando el rechazo no es un Error', async () => {
    vi.mocked(obtenerProductosAdmin).mockRejectedValueOnce(
      'fallo desconocido',
    )

    render(<AdminPanel alVolverATienda={vi.fn()} />)

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(
      screen.getByText(/No se pudieron cargar los productos administrativos/),
    ).toBeTruthy()
  })

  it('muestra un error si falla la carga de categorÃ­as', async () => {
    vi.mocked(obtenerProductosAdmin).mockResolvedValue(productos)
    vi.mocked(obtenerCategoriasAdmin).mockRejectedValueOnce(
      new Error('Error de categorÃ­as'),
    )

    render(<AdminPanel alVolverATienda={vi.fn()} />)

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText(/Error de categorÃ­as/)).toBeTruthy()
    expect(screen.queryByLabelText('Resumen del inventario')).toBeNull()
  })


  it('guarda la descripción del producto y vuelve a cargar el inventario', async () => {
    vi.mocked(obtenerProductosAdmin).mockResolvedValue([
      crearProducto('1', 'Chocolate', 'Dulces', {
        descripcion: 'Chocolate oscuro',
        imagenUrl: '/chocolate.png',
        variantes: [
          crearVariante('ch-1', '5.00', 5),
          crearVariante('ch-2', '2.50', 3),
        ],
      }),
      crearProducto('2', 'Caramelo', 'Confites', {
        descripcion: 'Caramelo de menta',
        variantes: [crearVariante('ca-1', '1.25', 7)],
      }),
    ])

    render(<AdminPanel alVolverATienda={vi.fn()} />)

    const detalle = await screen.findByRole('region', {
      name: 'Detalle de Chocolate',
    })

    const obtenerCampoDescripcion = () =>
      within(detalle).getByRole('textbox', {
        name: 'Descripción del producto',
      }) as HTMLTextAreaElement

    fireEvent.change(obtenerCampoDescripcion(), {
      target: { value: 'Chocolate artesanal' },
    })

    await waitFor(() => {
      expect(obtenerCampoDescripcion().value).toBe(
        'Chocolate artesanal',
      )
    })

    const botonGuardar = within(detalle).getByRole('button', {
      name: 'Guardar cambios',
    })

    await waitFor(() => {
      expect(botonGuardar.hasAttribute('disabled')).toBe(false)
    })

    fireEvent.click(botonGuardar)

    await waitFor(() => {
      expect(actualizarProductoAdmin).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          descripcion: 'Chocolate artesanal',
        }),
      )
    })

    await waitFor(() => {
      expect(obtenerProductosAdmin).toHaveBeenCalledTimes(2)
    })
  })


  it('guarda los cambios de variante y ajusta el stock de la misma variante', async () => {
    vi.mocked(obtenerProductosAdmin).mockResolvedValue(productos)

    render(<AdminPanel alVolverATienda={vi.fn()} />)

    const detalle = await screen.findByRole('region', {
      name: 'Detalle de Chocolate',
    })

    const textoSku = await within(detalle).findByText('SKU: SKU-ch-1')
    const articuloVariante = textoSku.closest('article')

    expect(articuloVariante).not.toBeNull()

    if (!articuloVariante) {
      throw new Error('No se encontró el artÃ­culo de la variante ch-1')
    }

    fireEvent.click(
      within(articuloVariante).getByRole('button', { name: 'Unidad' }),
    )

    fireEvent.change(
      await within(detalle).findByRole('textbox', {
        name: 'Nombre de la variante seleccionada',
      }),
      { target: { value: 'Caja' } },
    )

    fireEvent.change(
      within(detalle).getByRole('spinbutton', {
        name: 'Precio de la variante seleccionada',
      }),
      { target: { value: '7.50' } },
    )

    fireEvent.change(
      within(articuloVariante).getByRole('spinbutton', {
        name: 'Ajuste de stock de Caja',
      }),
      { target: { value: '2' } },
    )

    const botonGuardar = within(detalle).getByRole('button', {
      name: 'Guardar cambios',
    })

    await waitFor(() => {
      expect(botonGuardar.hasAttribute('disabled')).toBe(false)
    })

    fireEvent.click(botonGuardar)

    await waitFor(() => {
      expect(actualizarVarianteAdmin).toHaveBeenCalledWith('ch-1', {
        nombre: 'Caja',
        precio: '7.50',
      })

      expect(ajustarStockAdmin).toHaveBeenCalledWith('ch-1', {
        cantidad: 2,
        motivo: 'Ajuste manual desde el panel administrativo',
      })
    })

    await waitFor(() => {
      expect(obtenerProductosAdmin).toHaveBeenCalledTimes(3)
    })
  })

  it('permite abrir y cerrar el editor de URL de imagen', async () => {
    vi.mocked(obtenerProductosAdmin).mockResolvedValue(productos)

    render(<AdminPanel alVolverATienda={vi.fn()} />)

    const detalle = await screen.findByRole('region', {
      name: 'Detalle de Chocolate',
    })

    const botonUrl = within(detalle).getByRole('button', { name: 'URL' })

    expect(botonUrl.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(botonUrl)

    expect(
      within(detalle).getByRole('textbox', {
        name: 'URL de la imagen del producto',
      }),
    ).toBeTruthy()
    expect(botonUrl.getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(botonUrl)

    expect(
      within(detalle).queryByRole('textbox', {
        name: 'URL de la imagen del producto',
      }),
    ).toBeNull()
    expect(botonUrl.getAttribute('aria-expanded')).toBe('false')
  })

  it('mantiene el panel operativo cuando no hay categorÃ­as activas', async () => {
    vi.mocked(obtenerProductosAdmin).mockResolvedValue(productos)
    vi.mocked(obtenerCategoriasAdmin).mockResolvedValue([
      {
        id: 'inactiva',
        nombre: 'Inactiva',
        slug: 'inactiva',
        activa: false,
      },
    ])

    render(<AdminPanel alVolverATienda={vi.fn()} />)

    expect(
      await screen.findByRole('heading', { name: 'Chocolate' }),
    ).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Inventario' })).toBeTruthy()
  })

  it('incluye únicamente las categorÃ­as activas para editar productos', async () => {
    vi.mocked(obtenerProductosAdmin).mockResolvedValue(productos)
    vi.mocked(obtenerCategoriasAdmin).mockResolvedValue([
      { id: 'dulces', nombre: 'Dulces', slug: 'dulces', activa: true },
      { id: 'inactiva', nombre: 'Inactiva', slug: 'inactiva', activa: false },
    ])

    render(<AdminPanel alVolverATienda={vi.fn()} />)

    expect(
      await screen.findByRole('heading', { name: 'Chocolate' }),
    ).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'Inactiva' })).toBeNull()
  })

  it('carga una imagen adicional de variante y recarga los productos', async () => {
    vi.mocked(obtenerProductosAdmin).mockResolvedValue(productos)

    render(<AdminPanel alVolverATienda={vi.fn()} />)

    const detalle = await screen.findByRole('region', {
      name: 'Detalle de Chocolate',
    })

    const textoSku = await within(detalle).findByText('SKU: SKU-ch-1')
    const articuloVariante = textoSku.closest('article')

    expect(articuloVariante).not.toBeNull()

    if (!articuloVariante) {
      throw new Error('No se encontró el artÃ­culo de la variante ch-1')
    }

    fireEvent.click(
      within(articuloVariante).getByRole('button', { name: 'Unidad' }),
    )

    expect(
      within(articuloVariante).getByRole('button', { name: 'Unidad' }),
    ).toBeTruthy()
  })


  it('crea un producto y carga su imagen', async () => {
    vi.mocked(obtenerProductosAdmin).mockResolvedValue(productos)
    vi.mocked(obtenerCategoriasAdmin).mockResolvedValue(
      categoriasDisponibles,
    )

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:torta'),
      revokeObjectURL: vi.fn(),
    })

    render(<AdminPanel alVolverATienda={vi.fn()} />)

    await screen.findByRole('heading', { name: 'Chocolate' })

    fireEvent.click(
      screen.getByRole('button', { name: '+ Crear producto' }),
    )

    const formulario = screen
      .getByRole('heading', { name: 'Nuevo producto' })
      .closest('form')

    if (!formulario) {
      throw new Error('No se encontró el formulario de creaciÃ³n')
    }

    const campoCategoria = within(formulario).getByLabelText('Categoría *')

    expect(
      within(formulario).getByRole('option', { name: 'Dulces' }),
    ).toBeTruthy()

    expect(
      within(formulario).getByRole('option', { name: 'Dulces' }),
    ).toBeTruthy()

    fireEvent.change(
      within(formulario).getByLabelText(/Nombre del producto/),
      { target: { value: 'Torta nueva' } },
    )
    fireEvent.change(
      within(formulario).getByLabelText('Descripción'),
      { target: { value: 'Torta artesanal' } },
    )
    fireEvent.change(campoCategoria, {
      target: { value: 'dulces' },
    })
    fireEvent.change(
      within(formulario).getByLabelText(/Nombre de la variante/),
      { target: { value: 'Unidad' } },
    )
    fireEvent.change(
      within(formulario).getByLabelText(/SKU/),
      { target: { value: 'TORTA-001' } },
    )
    fireEvent.change(
      within(formulario).getByLabelText(/Precio/),
      { target: { value: '8.50' } },
    )

    const archivo = new File(['imagen'], 'torta.png', {
      type: 'image/png',
    })

    fireEvent.change(
      within(formulario).getByLabelText('Seleccionar imagen del producto'),
      { target: { files: [archivo] } },
    )

    fireEvent.click(
      within(formulario).getByRole('button', {
        name: /Guardar producto/,
      }),
    )

    await waitFor(() => {
      expect(crearProductoAdmin).toHaveBeenCalledWith({
        nombre: 'Torta nueva',
        descripcion: 'Torta artesanal',
        categoriaId: 'dulces',
        variantes: [
          {
            nombre: 'Unidad',
            sku: 'TORTA-001',
            precio: '8.50',
          },
        ],
      })
    })

    await waitFor(() => {
      expect(cargarImagenProductoAdmin).toHaveBeenCalledWith(
        'producto-nuevo',
        archivo,
      )
    })

    expect(obtenerProductosAdmin).toHaveBeenCalledTimes(3)
  })
})
