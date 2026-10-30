import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../src/App'

const cartMocks = vi.hoisted(() => ({
  errorCambioCantidad: null as string | null,
  errorAgregarVariante: null as string | null,
}))

vi.mock('../../src/modules/cart/hooks/useCart', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/modules/cart/hooks/useCart')>()

  return {
    ...actual,
    useCart: (...args: Parameters<typeof actual.useCart>) => {
      const carrito = actual.useCart(...args)

      if (
        cartMocks.errorCambioCantidad !== null ||
        cartMocks.errorAgregarVariante !== null
      ) {
        return {
          ...carrito,
          ...(cartMocks.errorCambioCantidad !== null
            ? { cambiarCantidad: () => cartMocks.errorCambioCantidad }
            : {}),
          ...(cartMocks.errorAgregarVariante !== null
            ? { agregarVariante: () => cartMocks.errorAgregarVariante }
            : {}),
        }
      }

      return carrito
    },
  }
})

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

function prepararRespuestaCatalogo(productos = productosPrueba): Response {
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
  cartMocks.errorCambioCantidad = null
  cartMocks.errorAgregarVariante = null
})

beforeEach(() => {
  cartMocks.errorCambioCantidad = null
  cartMocks.errorAgregarVariante = null

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
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeTruthy()

    await esperarCatalogo()

    expect(
      screen.getByRole('heading', { name: 'Nuestros productos' }),
    ).toBeTruthy()
    expect(screen.getAllByRole('article')).toHaveLength(5)
    expect(
      screen.getByRole('heading', { name: 'Galletas con chispas' }),
    ).toBeTruthy()
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

  it('restablece la búsqueda al pulsar la marca de Dulce Encanto', async () => {
    render(<App />)
    await esperarCatalogo()

    const busqueda = screen.getByRole('textbox', {
      name: 'Buscar productos',
    })

    fireEvent.change(busqueda, {
      target: { value: 'producto inexistente' },
    })

    expect(
      screen.getByRole('heading', { name: 'No encontramos productos' }),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('link', { name: 'Dulce Encanto, inicio' }),
    )

    expect(
      screen.getByRole('heading', { name: 'Nuestros productos' }),
    ).toBeTruthy()
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

  it('desplaza al catálogo cuando se navega a Ofertas', async () => {
    const desplazamiento = vi.fn()

    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: desplazamiento,
    })

    render(<App />)
    await esperarCatalogo()

    fireEvent.click(screen.getByRole('link', { name: 'Ofertas' }))

    expect(desplazamiento).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    })
  })

  it('vuelve al inicio al seleccionar Inicio', async () => {
    const desplazamiento = vi.fn()
    vi.stubGlobal('scrollTo', desplazamiento)

    render(<App />)
    await esperarCatalogo()

    fireEvent.click(screen.getByRole('link', { name: 'Inicio' }))

    expect(desplazamiento).toHaveBeenCalledWith({
      top: 0,
      behavior: 'auto',
    })
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

    expect(
      screen.getByRole('heading', { name: 'Mi carrito' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Caramelos surtidos' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Finalizar pedido' }),
    ).toBeTruthy()
  })

  it('muestra el error devuelto al agregar un producto al carrito', async () => {
    const mensajeError = 'No hay existencias suficientes para agregar el producto.'
    cartMocks.errorAgregarVariante = mensajeError

    render(<App />)
    await esperarCatalogo()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Agregar Caramelos surtidos al carrito',
      }),
    )

    expect(screen.getByText(mensajeError)).toBeTruthy()
  })

  it('muestra el error al fallar el cambio de cantidad en el carrito', async () => {
    const mensajeError =
      'No puedes superar las existencias disponibles.'

    cartMocks.errorCambioCantidad = mensajeError

    render(<App />)
    await esperarCatalogo()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Agregar Caramelos surtidos al carrito',
      }),
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Carrito, 1 productos' }),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Aumentar cantidad de Caramelos surtidos',
      }),
    )

    expect(screen.getByText(mensajeError)).toBeTruthy()
  })

  it('informa cuando el carrito está vacío', async () => {
    render(<App />)
    await esperarCatalogo()

    fireEvent.click(
      screen.getByRole('button', { name: 'Carrito, 0 productos' }),
    )

    expect(
      screen.getByRole('heading', { name: 'Tu carrito está vacío' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Explorar catálogo' }),
    ).toBeTruthy()
  })

  it('regresa al catálogo desde el carrito vacío', async () => {
    render(<App />)
    await esperarCatalogo()

    fireEvent.click(
      screen.getByRole('button', { name: 'Carrito, 0 productos' }),
    )

    expect(
      screen.getByRole('heading', { name: 'Tu carrito está vacío' }),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', { name: 'Explorar catálogo' }),
    )

    expect(
      screen.getByRole('heading', { name: 'Nuestros productos' }),
    ).toBeTruthy()
  })

  it('abre y cierra las notificaciones', async () => {
    render(<App />)
    await esperarCatalogo()

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }))
    expect(
      screen.getByText('Inicia sesión para consultar tus notificaciones.'),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }))
    expect(
      screen.queryByText('Inicia sesión para consultar tus notificaciones.'),
    ).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }))
    expect(
      screen.getByText('Inicia sesión para consultar tus notificaciones.'),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }))
    expect(
      screen.queryByText('Inicia sesión para consultar tus notificaciones.'),
    ).toBeNull()
  })

  it('abre y cierra el diálogo de autenticación desde el perfil', async () => {
    render(<App />)
    await esperarCatalogo()

    fireEvent.click(
      screen.getByRole('button', { name: 'Abrir perfil' }),
    )

    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Bienvenido de nuevo' }),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', { name: /Cerrar autenticación/i }),
    )

    expect(screen.queryByRole('dialog')).toBeNull()
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

    expect(
      await screen.findByRole('heading', {
        name: 'Nuestros productos',
      }),
    ).toBeTruthy()
  })

  it('acepta productos válidos sin variantes y no dibuja una tarjeta para ellos', async () => {
    const productosSinVariantes = [
      {
        ...productosPrueba[0]!,
        variantes: [],
      },
    ]

    vi.mocked(fetch).mockResolvedValueOnce(
      prepararRespuestaCatalogo(productosSinVariantes),
    )

    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Nuestros productos' }),
    ).toBeTruthy()

    expect(
      screen.queryByRole('heading', { name: 'Caramelos surtidos' }),
    ).toBeNull()
  })
})
