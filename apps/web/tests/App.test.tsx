import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'

const productosPrueba = [
  {
    id: 'caramelos-surtidos',
    nombre: 'Caramelos surtidos',
    descripcion: 'Caramelos de diferentes sabores.',
    categoria: { nombre: 'Caramelos', slug: 'caramelos' },
    variantes: [
      {
        id: 'var-caramelos',
        nombre: 'Unidad',
        sku: 'CAR-001',
        precio: '0.50',
        stockDisponible: 40,
      },
    ],
  },
  {
    id: 'chocolate-clasico',
    nombre: 'Chocolate clásico',
    descripcion: 'Chocolate de sabor tradicional.',
    categoria: { nombre: 'Chocolates', slug: 'chocolates' },
    variantes: [
      {
        id: 'var-chocolate-clasico',
        nombre: 'Unidad',
        sku: 'CHO-001',
        precio: '0.75',
        stockDisponible: 30,
      },
    ],
  },
  {
    id: 'gomitas-frutales',
    nombre: 'Gomitas frutales',
    descripcion: 'Gomitas dulces con sabores frutales.',
    categoria: { nombre: 'Gomitas', slug: 'gomitas' },
    variantes: [
      {
        id: 'var-gomitas',
        nombre: 'Unidad',
        sku: 'GOM-001',
        precio: '0.80',
        stockDisponible: 35,
      },
    ],
  },
  {
    id: 'chocolate-con-leche',
    nombre: 'Chocolate con leche',
    descripcion: 'Chocolate suave con leche.',
    categoria: { nombre: 'Chocolates', slug: 'chocolates' },
    variantes: [
      {
        id: 'var-chocolate-leche',
        nombre: 'Unidad',
        sku: 'CHO-002',
        precio: '1.00',
        stockDisponible: 25,
      },
    ],
  },
  {
    id: 'galletas-con-chispas',
    nombre: 'Galletas con chispas',
    descripcion: 'Galletas dulces con chispas de chocolate.',
    categoria: { nombre: 'Galletas', slug: 'galletas' },
    variantes: [
      {
        id: 'var-galletas',
        nombre: 'Unidad',
        sku: 'GAL-001',
        precio: '1.25',
        stockDisponible: 20,
      },
    ],
  },
]

function prepararRespuestaCatalogo(
  productos = productosPrueba,
): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ productos }),
  } as Response
}

async function esperarCatalogo() {
  await screen.findByRole('heading', { name: 'Caramelos surtidos' })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(prepararRespuestaCatalogo()),
  )
})

describe('Catálogo de Dulce Encanto', () => {
  it('renderiza la marca, la navegación y los cinco productos', async () => {
    render(<App />)

    expect(
      screen.getByRole('link', { name: /Dulce Encanto, inicio/i }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Nuestros productos' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeTruthy()

    await esperarCatalogo()

    expect(screen.getAllByRole('article')).toHaveLength(5)
    expect(screen.getByRole('heading', { name: 'Galletas con chispas' })).toBeTruthy()
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/catalog/products',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      }),
    )
  })

  it('filtra por nombre y descripción y permite restablecer los resultados', async () => {
    render(<App />)
    await esperarCatalogo()

    const busqueda = screen.getByRole('textbox', {
      name: 'Buscar productos',
    })

    fireEvent.change(busqueda, { target: { value: 'chocolate' } })

    expect(
      screen.getByRole('heading', { name: 'Chocolate clásico' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Chocolate con leche' }),
    ).toBeTruthy()
    expect(screen.getAllByRole('article')).toHaveLength(3)

    fireEvent.change(busqueda, {
      target: { value: 'sabores frutales' },
    })

    expect(
      screen.getByRole('heading', { name: 'Gomitas frutales' }),
    ).toBeTruthy()
    expect(screen.getAllByRole('article')).toHaveLength(1)

    fireEvent.change(busqueda, { target: { value: '   ' } })
    expect(screen.getAllByRole('article')).toHaveLength(5)

    fireEvent.change(busqueda, {
      target: { value: 'producto inexistente' },
    })
    expect(
      screen.getByRole('heading', { name: 'No encontramos productos' }),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', { name: 'Ver todos los productos' }),
    )

    await esperarCatalogo()
    expect(screen.getAllByRole('article')).toHaveLength(5)
    expect((busqueda as HTMLInputElement).value).toBe('')
  })

  it('filtra por categoría y permite regresar a Todos', async () => {
    render(<App />)
    await esperarCatalogo()

    fireEvent.click(screen.getByRole('button', { name: 'Galletas' }))

    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(
      screen.getByRole('heading', { name: 'Galletas con chispas' }),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Chocolates' }))
    expect(screen.getAllByRole('article')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Todos' }))
    expect(screen.getAllByRole('article')).toHaveLength(5)
  })

  it('ordena los productos por precio ascendente y descendente', async () => {
    render(<App />)
    await esperarCatalogo()

    const ordenar = screen.getByRole('combobox', {
      name: 'Ordenar productos',
    })

    fireEvent.change(ordenar, { target: { value: 'precio-menor' } })

    let tarjetas = screen.getAllByRole('article')
    expect(
      within(tarjetas[0]!).getByRole('heading', {
        name: 'Caramelos surtidos',
      }),
    ).toBeTruthy()
    expect(
      within(tarjetas[4]!).getByRole('heading', {
        name: 'Galletas con chispas',
      }),
    ).toBeTruthy()

    fireEvent.change(ordenar, { target: { value: 'precio-mayor' } })

    tarjetas = screen.getAllByRole('article')
    expect(
      within(tarjetas[0]!).getByRole('heading', {
        name: 'Galletas con chispas',
      }),
    ).toBeTruthy()
    expect(
      within(tarjetas[4]!).getByRole('heading', {
        name: 'Caramelos surtidos',
      }),
    ).toBeTruthy()

    fireEvent.change(ordenar, { target: { value: 'destacados' } })

    tarjetas = screen.getAllByRole('article')
    expect(
      within(tarjetas[0]!).getByRole('heading', {
        name: 'Caramelos surtidos',
      }),
    ).toBeTruthy()
  })

  it('añade y quita favoritos y muestra la vista de favoritos vacía', async () => {
    render(<App />)
    await esperarCatalogo()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Añadir Caramelos surtidos a favoritos',
      }),
    )

    expect(
      screen.getByRole('button', {
        name: 'Quitar Caramelos surtidos de favoritos',
      }),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Favoritos/ }))
    expect(
      screen.getByRole('heading', { name: 'Mis favoritos' }),
    ).toBeTruthy()
    expect(screen.getAllByRole('article')).toHaveLength(1)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Quitar Caramelos surtidos de favoritos',
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'Aún no tienes favoritos' }),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Favoritos/ }))
    expect(
      screen.getByRole('heading', { name: 'Nuestros productos' }),
    ).toBeTruthy()
    expect(screen.getAllByRole('article')).toHaveLength(5)
  })

  it('permite navegar desde Inicio, Ofertas y Productos', async () => {
    render(<App />)
    await esperarCatalogo()

    fireEvent.click(screen.getByRole('link', { name: 'Inicio' }))
    expect(
      screen.getByRole('heading', { name: 'Nuestros productos' }),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('link', { name: 'Ofertas' }))
    expect(
      screen.getByRole('heading', { name: 'Nuestros productos' }),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('link', { name: 'Productos' }))
    expect(
      screen.getByRole('heading', { name: 'Nuestros productos' }),
    ).toBeTruthy()
    expect(screen.getAllByRole('article')).toHaveLength(5)
  })

  it('añade productos al carrito y permite cerrar el aviso', async () => {
    render(<App />)
    await esperarCatalogo()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Agregar Caramelos surtidos al carrito',
      }),
    )

    expect(
      screen.getByText('Caramelos surtidos se añadió al carrito.'),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Carrito, 1 productos' }),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Agregar Caramelos surtidos al carrito',
      }),
    )

    expect(
      screen.getByRole('button', { name: 'Carrito, 2 productos' }),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }))
    expect(
      screen.queryByText('Caramelos surtidos se añadió al carrito.'),
    ).toBeNull()

    fireEvent.click(
      screen.getByRole('button', { name: 'Carrito, 2 productos' }),
    )
    expect(screen.getByText(/Tienes 2 producto/)).toBeTruthy()
  })

  it('informa cuando el carrito está vacío', async () => {
    render(<App />)
    await esperarCatalogo()

    fireEvent.click(
      screen.getByRole('button', { name: 'Carrito, 0 productos' }),
    )

    expect(screen.getByText('Tu carrito está vacío.')).toBeTruthy()
  })

  it('abre y cierra las notificaciones', async () => {
    render(<App />)
    await esperarCatalogo()

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }))
    expect(
      screen.getByText('No tienes notificaciones nuevas.'),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }))
    expect(
      screen.queryByText('No tienes notificaciones nuevas.'),
    ).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }))
    expect(
      screen.getByText('No tienes notificaciones nuevas.'),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }))
    expect(
      screen.queryByText('No tienes notificaciones nuevas.'),
    ).toBeNull()
  })

  it('abre y cierra el perfil y muestra el aviso de inicio de sesión', async () => {
    render(<App />)
    await esperarCatalogo()

    fireEvent.click(screen.getByRole('button', { name: 'Abrir perfil' }))

    expect(
      screen.getByText(
        'Inicia sesión para acceder a tu perfil y guardar tus favoritos.',
      ),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(
      screen.getByText(/El inicio de sesión se conectará con la API/),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir perfil' }))

    expect(
      screen.queryByText(
        'Inicia sesión para acceder a tu perfil y guardar tus favoritos.',
      ),
    ).toBeNull()
  })

  it('alterna entre modo oscuro y modo claro', async () => {
    render(<App />)
    await esperarCatalogo()

    fireEvent.click(
      screen.getByRole('button', { name: 'Activar modo oscuro' }),
    )
    expect(screen.getByRole('main').className).toContain('app--dark')

    fireEvent.click(
      screen.getByRole('button', { name: 'Activar modo claro' }),
    )
    expect(screen.getByRole('main').className).toBe('app')
  })

  it('muestra las imágenes de los productos con texto alternativo', async () => {
    render(<App />)
    await esperarCatalogo()

    const imagenes = screen.getAllByRole('img')
    expect(imagenes).toHaveLength(5)

    for (const producto of productosPrueba) {
      expect(
        screen.getByRole('img', { name: producto.nombre }),
      ).toBeTruthy()
    }
  })

  it('muestra un error si la API no está disponible', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Error de conexión'))

    render(<App />)

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'No pudimos cargar el catálogo' }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(screen.getByRole('alert')).toBeTruthy()
  })
})
