import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PropiedadesDetalleProducto } from '../../src/modules/admin/types/admin.types'

const mocks = vi.hoisted(() => ({
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

vi.mock('../../src/modules/admin/services/admin.service', () => ({
  ...mocks,
}))

vi.mock('../../src/modules/admin/components/ProductDetail/ProductDetail', () => ({
  default: (props: PropiedadesDetalleProducto) => (
    <section>
      <h2>Detalle simulado</h2>
      <output aria-label="Categorías editables">
        {props.categorias.map((categoria) => categoria.nombre).join(',')}
      </output>

      <button
        type="button"
        onClick={() => {
          void props.onCrearVariante('producto-1', {
            nombre: 'Caja pequeña',
            sku: 'CAJA-001',
            precio: '5.00',
          })
        }}
      >
        Crear variante
      </button>

      <button
        type="button"
        onClick={() => {
          void props.eliminarImagenProducto('producto-1')
        }}
      >
        Eliminar imagen de producto
      </button>

      <button
        type="button"
        onClick={() => {
          void props.cargarImagenVariante(
            'variante-1',
            new File(['imagen'], 'principal.png', { type: 'image/png' }),
          )
        }}
      >
        Cargar imagen principal
      </button>

      <button
        type="button"
        onClick={() => {
          void props.eliminarImagenVariante('variante-1')
        }}
      >
        Eliminar imagen principal
      </button>

      <button
        type="button"
        onClick={() => {
          void props.cargarImagenAdicionalVariante(
            'variante-1',
            new File(['imagen'], 'adicional.png', { type: 'image/png' }),
            1,
          )
        }}
      >
        Cargar imagen adicional
      </button>

      <button
        type="button"
        onClick={() => {
          void props.eliminarImagenAdicionalVariante(
            'variante-1',
            'imagen-1',
          )
        }}
      >
        Eliminar imagen adicional
      </button>

      <button
        type="button"
        onClick={() => {
          void props.obtenerImagenesVariante('variante-1')
        }}
      >
        Consultar imágenes
      </button>
    </section>
  ),
}))

import AdminPanel from '../../src/modules/admin/components/AdminPanel'
import type { ProductoAdmin } from '../../src/modules/admin/types/inventory.types'

const producto: ProductoAdmin = {
  id: 'producto-1',
  nombre: 'Chocolate',
  descripcion: 'Chocolate oscuro',
  imagenUrl: null,
  activo: true,
  categoriaId: 'dulces',
  categoria: { nombre: 'Dulces', slug: 'dulces', activa: true },
  variantes: [],
}

const categorias = [
  { id: 'dulces', nombre: 'Dulces', slug: 'dulces', activa: true },
  { id: 'inactiva', nombre: 'Inactiva', slug: 'inactiva', activa: false },
]

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.obtenerProductosAdmin.mockResolvedValue([producto])
  mocks.obtenerCategoriasAdmin.mockResolvedValue(categorias)
  mocks.actualizarProductoAdmin.mockResolvedValue(undefined)
  mocks.actualizarVarianteAdmin.mockResolvedValue(undefined)
  mocks.ajustarStockAdmin.mockResolvedValue({
    mensaje: 'Stock actualizado',
    inventario: {
      varianteId: 'variante-1',
      stockFisicoAnterior: 1,
      stockFisico: 1,
      stockReservado: 0,
      stockDisponible: 1,
      diferencia: 0,
    },
  })
  mocks.crearProductoAdmin.mockResolvedValue('producto-nuevo')
  mocks.crearVarianteAdmin.mockResolvedValue(undefined)
  mocks.cargarImagenProductoAdmin.mockResolvedValue('/producto.png')
  mocks.eliminarImagenProductoAdmin.mockResolvedValue(undefined)
  mocks.cargarImagenPrincipalVarianteAdmin.mockResolvedValue('/variante.png')
  mocks.eliminarImagenPrincipalVarianteAdmin.mockResolvedValue(undefined)
  mocks.obtenerImagenesVarianteAdmin.mockResolvedValue([])
  mocks.cargarImagenAdicionalVarianteAdmin.mockResolvedValue('/adicional.png')
  mocks.eliminarImagenAdicionalVarianteAdmin.mockResolvedValue(undefined)
})

describe('AdminPanel: cobertura de imágenes adicionales', () => {
  it('filtra categorías inactivas y ejecuta las operaciones de imágenes adicionales', async () => {
    render(<AdminPanel alVolverATienda={vi.fn()} />)

    expect(await screen.findByRole('heading', { name: 'Detalle simulado' })).toBeTruthy()
    expect(screen.getByLabelText('Categorías editables').textContent).toBe('Dulces')

    screen.getByRole('button', { name: 'Cargar imagen adicional' }).click()

    await waitFor(() => {
      expect(mocks.cargarImagenAdicionalVarianteAdmin).toHaveBeenCalledWith(
        'variante-1',
        expect.any(File),
        1,
      )
    })

    await waitFor(() => {
      expect(mocks.obtenerProductosAdmin).toHaveBeenCalledTimes(2)
    })

    screen.getByRole('button', { name: 'Eliminar imagen adicional' }).click()

    await waitFor(() => {
      expect(mocks.eliminarImagenAdicionalVarianteAdmin).toHaveBeenCalledWith(
        'variante-1',
        'imagen-1',
      )
    })

    await waitFor(() => {
      expect(mocks.obtenerProductosAdmin).toHaveBeenCalledTimes(3)
    })

    screen.getByRole('button', { name: 'Consultar imágenes' }).click()

    await waitFor(() => {
      expect(mocks.obtenerImagenesVarianteAdmin).toHaveBeenCalledWith('variante-1')
    })

    screen.getByRole('button', { name: 'Crear variante' }).click()

    await waitFor(() => {
      expect(mocks.crearVarianteAdmin).toHaveBeenCalledWith('producto-1', {
        nombre: 'Caja pequeña',
        sku: 'CAJA-001',
        precio: '5.00',
      })
      expect(mocks.obtenerProductosAdmin).toHaveBeenCalledTimes(4)
    })

    screen.getByRole('button', { name: 'Eliminar imagen de producto' }).click()

    await waitFor(() => {
      expect(mocks.eliminarImagenProductoAdmin).toHaveBeenCalledWith('producto-1')
      expect(mocks.obtenerProductosAdmin).toHaveBeenCalledTimes(5)
    })
  })

  it('carga y elimina la imagen principal de una variante y recarga los productos', async () => {
    render(<AdminPanel alVolverATienda={vi.fn()} />)

    expect(await screen.findByRole('heading', { name: 'Detalle simulado' })).toBeTruthy()

    screen.getByRole('button', { name: 'Cargar imagen principal' }).click()

    await waitFor(() => {
      expect(mocks.cargarImagenPrincipalVarianteAdmin).toHaveBeenCalledWith(
        'variante-1',
        expect.any(File),
      )
      expect(mocks.obtenerProductosAdmin).toHaveBeenCalledTimes(2)
    })

    screen.getByRole('button', { name: 'Eliminar imagen principal' }).click()

    await waitFor(() => {
      expect(mocks.eliminarImagenPrincipalVarianteAdmin).toHaveBeenCalledWith(
        'variante-1',
      )
      expect(mocks.obtenerProductosAdmin).toHaveBeenCalledTimes(3)
    })
  })
})
