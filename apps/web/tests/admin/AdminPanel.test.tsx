import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Producto, Variante } from '../../src/types/catalogo.types'
import AdminPanel from '../../src/modules/admin/components/AdminPanel'
import InventorySummary from '../../src/modules/admin/components/InventorySummary/InventorySummary'
import ProductDetail from '../../src/modules/admin/components/ProductDetail/ProductDetail'
import ProductList from '../../src/modules/admin/components/ProductList/ProductList'

function crearVariante(
  id: string,
  precio: string,
  stockDisponible: number,
): Variante {
  return {
    id,
    nombre: 'Unidad',
    sku: `SKU-${id}`,
    precio,
    imagenUrl: null,
    stockDisponible,
  }
}

function crearProducto(
  id: string,
  nombre: string,
  categoria: string,
  opciones: {
    descripcion?: string | null
    imagenUrl?: string | null
    variantes?: Variante[]
  } = {},
): Producto {
  return {
    id,
    nombre,
    descripcion: opciones.descripcion ?? null,
    imagenUrl: opciones.imagenUrl ?? null,
    categoria: { nombre: categoria, slug: categoria.toLowerCase() },
    variantes: opciones.variantes ?? [],
  }
}

afterEach(() => cleanup())

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
  it('muestra el estado vacío cuando no hay producto seleccionado', () => {
    render(<ProductDetail producto={undefined} />)

    expect(screen.getByText('Selecciona un producto')).toBeTruthy()
    expect(
      screen.getByText('Elige un producto de la lista para consultar sus detalles.'),
    ).toBeTruthy()
  })

  it('muestra los detalles, la imagen y las variantes del producto', () => {
    render(<ProductDetail producto={chocolate} />)

    expect(screen.getByRole('heading', { name: 'Chocolate' })).toBeTruthy()
    expect(screen.getByText('Dulces')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Chocolate' }).getAttribute('src'))
      .toBe('/chocolate.png')
    expect(screen.getByText('Chocolate oscuro')).toBeTruthy()
    expect(screen.getByText('SKU: SKU-ch-1')).toBeTruthy()
    expect(screen.getByText('$5.00')).toBeTruthy()
    expect(screen.getByText('5 disponibles')).toBeTruthy()
    expect(screen.getByText('$2.50')).toBeTruthy()
    expect(screen.getByText('3 disponibles')).toBeTruthy()
    expect(screen.getByText('Solo consulta')).toBeTruthy()
  })

  it('muestra los textos alternativos sin imagen, descripción ni variantes', () => {
    const producto = crearProducto('3', 'Galleta', 'Dulces')

    render(<ProductDetail producto={producto} />)

    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText('Sin descripción registrada.')).toBeTruthy()
    expect(
      screen.getByText('Este producto no tiene variantes registradas.'),
    ).toBeTruthy()
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
  }

  it('muestra productos, stock, categorías e imagen alternativa', () => {
    render(<ProductList {...propiedades} />)

    expect(screen.getByRole('region', { name: 'Lista de productos' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Chocolate/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Caramelo/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Chocolate/ }).getAttribute('aria-pressed'))
      .toBe('true')
    expect(screen.getByRole('presentation').getAttribute('src'))
      .toBe('/chocolate.png')
    expect(screen.getByText('DE')).toBeTruthy()
    expect(screen.getByText(/2 variantes/)).toBeTruthy()
    expect(screen.getByText(/8 disponibles/)).toBeTruthy()
  })

  it('notifica la búsqueda, el cambio de categoría y la selección', () => {
    render(<ProductList {...propiedades} />)

    fireEvent.change(within(screen.getByRole('region', { name: 'Lista de productos' })).getByPlaceholderText('Buscar producto...'), {
      target: { value: 'menta' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confites' }))
    fireEvent.click(screen.getByRole('button', { name: /Caramelo/ }))

    expect(propiedades.onCambiarBusqueda).toHaveBeenCalledWith('menta')
    expect(propiedades.onCambiarCategoria).toHaveBeenCalledWith('Confites')
    expect(propiedades.onSeleccionarProducto).toHaveBeenCalledWith('2')
  })

  it('muestra el mensaje cuando la lista está vacía', () => {
    render(<ProductList {...propiedades} productos={[]} />)

    expect(
      screen.getByRole('status').textContent,
    ).toBe('No se encontraron productos con esos filtros.')
  })
})

describe('AdminPanel', () => {
  it('integra métricas, filtros, selección de producto y regreso a la tienda', () => {
    const alVolverATienda = vi.fn()

    render(
      <AdminPanel
        productos={productos}
        alVolverATienda={alVolverATienda}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Inventario' })).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('15')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Chocolate' })).toBeTruthy()

    fireEvent.change(within(screen.getByRole('region', { name: 'Lista de productos' })).getByPlaceholderText('Buscar producto...'), {
      target: { value: 'menta' },
    })

    expect(screen.getByRole('button', { name: /Caramelo/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Chocolate/ })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Caramelo' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Volver a la tienda' }))
    expect(alVolverATienda).toHaveBeenCalledOnce()
  })

  it('muestra el estado vacío si no hay productos', () => {
    render(<AdminPanel productos={[]} alVolverATienda={vi.fn()} />)

    expect(screen.getByText('No se encontraron productos con esos filtros.'))
      .toBeTruthy()
    expect(screen.getByText('Selecciona un producto')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Resumen del inventario' })).getAllByText('0')).toHaveLength(3)
  })
})
