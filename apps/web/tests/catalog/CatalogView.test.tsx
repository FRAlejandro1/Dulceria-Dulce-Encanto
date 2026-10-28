import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CatalogView from '../../src/modules/catalog/components/CatalogView'
import type { Producto, Variante } from '../../src/types/catalogo.types'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const variante: Variante = {
  id: 'variante-prueba',
  nombre: 'Unidad',
  sku: 'PRU-001',
  precio: '1.00',
  imagenUrl: null,
  stockDisponible: 5,
}

const producto: Producto = {
  id: 'producto-prueba',
  nombre: 'Producto de prueba',
  descripcion: 'Descripción de prueba.',
  imagenUrl: null,
  categoria: { nombre: 'Pruebas', slug: 'pruebas' },
  variantes: [variante],
}

function renderizarCatalogo(
  opciones: {
    productos?: Producto[]
    obtenerVariante?: (producto: Producto) => Variante | undefined
  } = {},
) {
  const restablecerFiltros = vi.fn()

  render(
    <CatalogView
      estadoCarga="correcto"
      busqueda=""
      setBusqueda={vi.fn()}
      categoria="Todas"
      setCategoria={vi.fn()}
      orden="nombre"
      setOrden={vi.fn()}
      favoritos={[]}
      verFavoritos={false}
      categorias={['Todas', 'Pruebas']}
      productosVisibles={opciones.productos ?? [producto]}
      carrito={{}}
      variantesSeleccionadas={{}}
      reintentarCarga={vi.fn()}
      restablecerFiltros={restablecerFiltros}
      alternarFavorito={vi.fn()}
      obtenerVarianteSeleccionada={
        opciones.obtenerVariante ?? (() => variante)
      }
      onCambiarVariante={vi.fn()}
      onAgregarAlCarrito={vi.fn()}
    />,
  )

  return { restablecerFiltros }
}

describe('CatalogView', () => {
  it('omite el producto cuando no tiene una variante seleccionada', () => {
    renderizarCatalogo({
      obtenerVariante: () => undefined,
    })

    expect(
      screen.queryByRole('heading', { name: 'Producto de prueba' }),
    ).toBeNull()
    expect(
      screen.getByRole('region', { name: 'Catálogo de productos' }),
    ).toBeTruthy()
  })

  it('muestra la tarjeta cuando existe una variante seleccionada', () => {
    renderizarCatalogo()

    expect(
      screen.getByRole('heading', { name: 'Producto de prueba' }),
    ).toBeTruthy()
  })

  it('muestra el estado vacío y permite restablecer los filtros', () => {
    const { restablecerFiltros } = renderizarCatalogo({
      productos: [],
    })

    expect(
      screen.getByRole('heading', { name: 'No encontramos productos' }),
    ).toBeTruthy()

    screen.getByRole('button', { name: 'Ver todos los productos' }).click()

    expect(restablecerFiltros).toHaveBeenCalledOnce()
  })
})
