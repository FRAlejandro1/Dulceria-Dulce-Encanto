import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ProductCard from '../../src/modules/catalog/components/ProductCard'
import type { Producto } from '../../src/types/catalogo.types'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const producto: Producto = {
  id: 'producto-prueba',
  nombre: 'Producto de prueba',
  descripcion: 'DescripciÃ³n de prueba.',
  imagenUrl: null,
  categoria: {
    nombre: 'Pruebas',
    slug: 'pruebas',
  },
  variantes: [
    {
      id: 'variante-unidad',
      nombre: 'Unidad',
      sku: 'PRU-001',
      precio: '1.00',
      imagenUrl: null,
      stockDisponible: 2,
    },
    {
      id: 'variante-paquete',
      nombre: 'Paquete',
      sku: 'PRU-002',
      precio: '3.50',
      imagenUrl: null,
      stockDisponible: 5,
    },
  ],
}

function renderizarTarjeta(
  opciones: {
    favorito?: boolean
    cantidadEnCarrito?: number
    varianteIndex?: number
  } = {},
) {
  const onCambiarVariante = vi.fn()
  const onAlternarFavorito = vi.fn()
  const onAgregar = vi.fn()
  const variante = producto.variantes[opciones.varianteIndex ?? 0]

  render(
    <ProductCard
      producto={producto}
      variante={variante}
      favorito={opciones.favorito ?? false}
      cantidadEnCarrito={opciones.cantidadEnCarrito ?? 0}
      onCambiarVariante={onCambiarVariante}
      onAlternarFavorito={onAlternarFavorito}
      onAgregar={onAgregar}
    />,
  )

  return {
    onCambiarVariante,
    onAlternarFavorito,
    onAgregar,
  }
}

describe('ProductCard', () => {
  it('muestra los datos del producto, precio, stock e imagen alternativa', () => {
    renderizarTarjeta()

    expect(
      screen.getByRole('heading', { name: 'Producto de prueba' }),
    ).toBeTruthy()
    expect(screen.getByText('Pruebas')).toBeTruthy()
    expect(screen.getByText('DescripciÃ³n de prueba.')).toBeTruthy()
    expect(screen.getByText('$1.00')).toBeTruthy()
    expect(screen.getByText('2 disponibles')).toBeTruthy()

    const imagen = screen.getByRole('img', { name: 'Producto de prueba' })
    expect(imagen.getAttribute('src')).toContain('images.unsplash.com')
  })

  it('muestra una descripciÃ³n alternativa cuando estÃ¡ vacÃ­a', () => {
    const productoSinDescripcion = {
      ...producto,
      descripcion: null,
    }

    render(
      <ProductCard
        producto={productoSinDescripcion}
        variante={producto.variantes[0]}
        favorito={false}
        cantidadEnCarrito={0}
        onCambiarVariante={vi.fn()}
        onAlternarFavorito={vi.fn()}
        onAgregar={vi.fn()}
      />,
    )

    expect(
      screen.getByText('Un dulce preparado para disfrutar.'),
    ).toBeTruthy()
  })

  it('permite solicitar el cambio de variante', () => {
    const { onCambiarVariante } = renderizarTarjeta()

    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'PresentaciÃ³n de Producto de prueba',
      }),
      { target: { value: 'variante-paquete' } },
    )

    expect(onCambiarVariante).toHaveBeenCalledWith(
      'producto-prueba',
      'variante-paquete',
    )
  })

  it('representa el estado de favorito y permite alternarlo', () => {
    const { onAlternarFavorito } = renderizarTarjeta({
      favorito: true,
    })

    const boton = screen.getByRole('button', {
      name: 'Quitar Producto de prueba de favoritos',
    })

    expect(boton.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(boton)

    expect(onAlternarFavorito).toHaveBeenCalledWith('producto-prueba')
  })

  it('permite solicitar que se agregue el producto al carrito', () => {
    const { onAgregar } = renderizarTarjeta()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Agregar Producto de prueba al carrito',
      }),
    )

    expect(onAgregar).toHaveBeenCalledWith(producto)
  })

  it('deshabilita la acciÃ³n cuando se alcanza el stock disponible', () => {
    renderizarTarjeta({ cantidadEnCarrito: 2 })

    const boton = screen.getByRole('button', {
      name: 'Agregar Producto de prueba al carrito',
    })

    expect((boton as HTMLButtonElement).disabled).toBe(true)
    expect(boton.textContent).toContain('Stock completo')
  })

  it('muestra agotado y deshabilita la acciÃ³n cuando no hay existencias', () => {
    const productoAgotado: Producto = {
      ...producto,
      variantes: [
        {
          ...producto.variantes[0],
          stockDisponible: 0,
        },
      ],
    }

    render(
      <ProductCard
        producto={productoAgotado}
        variante={productoAgotado.variantes[0]}
        favorito={false}
        cantidadEnCarrito={0}
        onCambiarVariante={vi.fn()}
        onAlternarFavorito={vi.fn()}
        onAgregar={vi.fn()}
      />,
    )

    expect(screen.getByText('Agotado', { selector: 'p' })).toBeTruthy()

    const boton = screen.getByRole('button', {
      name: 'Agregar Producto de prueba al carrito',
    })

    expect((boton as HTMLButtonElement).disabled).toBe(true)
    expect(boton.textContent).toContain('Agotado')
  })

  it('muestra el precio de la variante seleccionada', () => {
    renderizarTarjeta({ varianteIndex: 1 })

    expect(screen.getByText('$3.50')).toBeTruthy()
    expect(screen.getByText('5 disponibles')).toBeTruthy()
  })
})

describe('ProductCard: ramas adicionales', () => {
  it('sustituye una imagen personalizada cuando falla su carga', () => {
    const productoConImagen: Producto = {
      ...producto,
      imagenUrl: 'https://example.com/producto.png',
    }

    render(
      <ProductCard
        producto={productoConImagen}
        variante={productoConImagen.variantes[0]}
        favorito={false}
        cantidadEnCarrito={0}
        onCambiarVariante={vi.fn()}
        onAlternarFavorito={vi.fn()}
        onAgregar={vi.fn()}
      />,
    )

    const imagen = screen.getByRole('img', {
      name: 'Producto de prueba',
    })

    fireEvent.error(imagen)

    expect(imagen.getAttribute('src')).toContain(
      'photo-1558961363-fa8fdf82db35',
    )
  })

  it('conserva la imagen predeterminada si vuelve a fallar', () => {
    renderizarTarjeta()

    const imagen = screen.getByRole('img', {
      name: 'Producto de prueba',
    })
    const origenInicial = imagen.getAttribute('src')

    fireEvent.error(imagen)

    expect(imagen.getAttribute('src')).toBe(origenInicial)
  })

  it('usa la categoría predeterminada cuando el nombre está vacío', () => {
    const productoSinCategoria: Producto = {
      ...producto,
      categoria: {
        ...producto.categoria,
        nombre: '',
      },
    }

    render(
      <ProductCard
        producto={productoSinCategoria}
        variante={productoSinCategoria.variantes[0]}
        favorito={false}
        cantidadEnCarrito={0}
        onCambiarVariante={vi.fn()}
        onAlternarFavorito={vi.fn()}
        onAgregar={vi.fn()}
      />,
    )

    expect(screen.getByText('Dulces artesanales')).toBeTruthy()
  })

  it.each([
    ['precio negativo', '-1.50'],
    ['precio no numérico', 'inválido'],
  ])('muestra cero con un %s', (_caso, precio) => {
    const productoConPrecioInvalido: Producto = {
      ...producto,
      variantes: [{ ...producto.variantes[0], precio }],
    }

    render(
      <ProductCard
        producto={productoConPrecioInvalido}
        variante={productoConPrecioInvalido.variantes[0]}
        favorito={false}
        cantidadEnCarrito={0}
        onCambiarVariante={vi.fn()}
        onAlternarFavorito={vi.fn()}
        onAgregar={vi.fn()}
      />,
    )

    expect(screen.getByText('$0.00')).toBeTruthy()
  })

  it('no muestra selector cuando el producto tiene una sola variante', () => {
    const productoUnaVariante: Producto = {
      ...producto,
      variantes: [producto.variantes[0]],
    }

    render(
      <ProductCard
        producto={productoUnaVariante}
        variante={productoUnaVariante.variantes[0]}
        favorito={false}
        cantidadEnCarrito={0}
        onCambiarVariante={vi.fn()}
        onAlternarFavorito={vi.fn()}
        onAgregar={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole('combobox', {
        name: 'Presentación de Producto de prueba',
      }),
    ).toBeNull()
  })
})
