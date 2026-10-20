import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App, { validarAdicionCarrito } from '../src/App'

const productosBase = [
  {
    id: 'producto-prueba',
    nombre: 'Producto de prueba',
    descripcion: 'Descripción de prueba.',
    categoria: { nombre: 'Pruebas', slug: 'pruebas' },
    variantes: [
      {
        id: 'variante-unidad',
        nombre: 'Unidad',
        sku: 'PRU-001',
        precio: '1.00',
        stockDisponible: 2,
      },
      {
        id: 'variante-paquete',
        nombre: 'Paquete',
        sku: 'PRU-002',
        precio: '3.50',
        stockDisponible: 5,
      },
    ],
  },
]

function respuesta(productos: unknown = productosBase, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => productos,
  } as Response
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    respuesta({ productos: productosBase }),
  ))
})

describe('Casos límite del catálogo', () => {
  it('permite seleccionar otra variante y actualiza precio y existencias', async () => {
    render(<App />)

    const titulo = await screen.findByRole('heading', {
      name: 'Producto de prueba',
    })
    const tarjeta = titulo.closest('article')

    expect(tarjeta).not.toBeNull()

    const contenidoTarjeta = within(tarjeta as HTMLElement)
    const selector = contenidoTarjeta.getByRole('combobox', {
      name: 'Presentación de Producto de prueba',
    })

    expect(contenidoTarjeta.getByText('$1.00')).toBeTruthy()
    expect(contenidoTarjeta.getByText('2 disponibles')).toBeTruthy()

    fireEvent.change(selector, {
      target: { value: 'variante-paquete' },
    })

    expect(contenidoTarjeta.getByText('$3.50')).toBeTruthy()
    expect(contenidoTarjeta.getByText('5 disponibles')).toBeTruthy()

    fireEvent.click(
      contenidoTarjeta.getByRole('button', {
        name: 'Agregar Producto de prueba al carrito',
      }),
    )

    expect(
      screen.getByRole('button', { name: 'Carrito, 1 productos' }),
    ).toBeTruthy()
  })

  it('impide añadir más unidades que el stock de la variante seleccionada', async () => {
    render(<App />)

    const titulo = await screen.findByRole('heading', {
      name: 'Producto de prueba',
    })
    const tarjeta = titulo.closest('article') as HTMLElement
    const contenidoTarjeta = within(tarjeta)
    const selector = contenidoTarjeta.getByRole('combobox', {
      name: 'Presentación de Producto de prueba',
    })

    fireEvent.change(selector, {
      target: { value: 'variante-unidad' },
    })

    const agregar = contenidoTarjeta.getByRole('button', {
      name: 'Agregar Producto de prueba al carrito',
    })

    fireEvent.click(agregar)
    fireEvent.click(agregar)

    expect(
      screen.getByRole('button', { name: 'Carrito, 2 productos' }),
    ).toBeTruthy()
    expect((agregar as HTMLButtonElement).disabled).toBe(true)
    expect(agregar.textContent).toContain('Stock completo')
  })

  it('muestra como agotado un producto cuya variante tiene stock cero', async () => {
    const productosAgotados = [
      {
        ...productosBase[0],
        variantes: [
          {
            ...productosBase[0].variantes[0],
            stockDisponible: 0,
          },
        ],
      },
    ]

    vi.mocked(fetch).mockResolvedValueOnce(
      respuesta({ productos: productosAgotados }),
    )

    render(<App />)

    const titulo = await screen.findByRole('heading', {
      name: 'Producto de prueba',
    })
    const tarjeta = titulo.closest('article') as HTMLElement
    const contenidoTarjeta = within(tarjeta)

    expect(
      contenidoTarjeta.getByText('Agotado', { selector: 'p' }),
    ).toBeTruthy()

    const botonAgregar = contenidoTarjeta.getByRole('button', {
      name: 'Agregar Producto de prueba al carrito',
    })

    expect((botonAgregar as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(botonAgregar)

    expect(
      screen.queryByRole('status'),
    ).toBeNull()

    expect(
      screen.getByRole('button', { name: 'Carrito, 0 productos' }),
    ).toBeTruthy()
  })

  it('acepta una descripción nula y muestra el texto alternativo', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      respuesta({
        productos: [
          {
            ...productosBase[0],
            descripcion: null,
            variantes: [productosBase[0].variantes[0]],
          },
        ],
      }),
    )

    render(<App />)

    await screen.findByRole('heading', { name: 'Producto de prueba' })

    expect(
      screen.getByText('Un dulce preparado para disfrutar.'),
    ).toBeTruthy()
  })

  it('muestra el estado de error cuando la respuesta HTTP no es correcta', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(respuesta({}, false))

    render(<App />)

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'No pudimos cargar el catálogo' }),
    ).toBeTruthy()
  })

  it('muestra el estado de error cuando la respuesta JSON no tiene el formato esperado', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(respuesta({ datos: [] }))

    render(<App />)

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'No pudimos cargar el catálogo' }),
    ).toBeTruthy()
  })

  it('descarta los productos que no cumplen la estructura mínima de la API', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      respuesta({
        productos: [
          ...productosBase,
          {
            id: 23,
            nombre: 'Producto inválido',
            categoria: { nombre: 'Pruebas', slug: 'pruebas' },
            variantes: [],
          },
          {
            id: 'sin-variantes',
            nombre: 'Producto sin variantes',
            categoria: { nombre: 'Pruebas', slug: 'pruebas' },
            variantes: [],
          },
        ],
      }),
    )

    render(<App />)

    await screen.findByRole('heading', { name: 'Producto de prueba' })

    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(
      screen.queryByRole('heading', { name: 'Producto inválido' }),
    ).toBeNull()
    expect(
      screen.queryByRole('heading', { name: 'Producto sin variantes' }),
    ).toBeNull()
  })

  it('muestra el catálogo vacío cuando la API devuelve una lista vacía', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      respuesta({ productos: [] }),
    )

    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: 'No encontramos productos',
      }),
    ).toBeTruthy()
    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })
  it('trata los precios no numéricos y negativos como cero', async () => {
    const productosConPreciosInvalidos = [
      {
        ...productosBase[0],
        id: 'precio-no-numerico',
        nombre: 'Producto con precio no numérico',
        variantes: [
          {
            ...productosBase[0].variantes[0],
            id: 'variante-precio-no-numerico',
            precio: 'no-es-un-numero',
          },
        ],
      },
      {
        ...productosBase[0],
        id: 'precio-negativo',
        nombre: 'Producto con precio negativo',
        variantes: [
          {
            ...productosBase[0].variantes[0],
            id: 'variante-precio-negativo',
            precio: '-5.00',
          },
        ],
      },
    ]

    vi.mocked(fetch).mockResolvedValueOnce(
      respuesta({ productos: productosConPreciosInvalidos }),
    )

    render(<App />)

    await screen.findByRole('heading', {
      name: 'Producto con precio no numérico',
    })

    expect(screen.getAllByText('$0.00')).toHaveLength(2)

    fireEvent.change(
      screen.getByRole('combobox', { name: 'Ordenar productos' }),
      { target: { value: 'precio-menor' } },
    )

    expect(
      screen.getByRole('heading', { name: 'Producto con precio negativo' }),
    ).toBeTruthy()

    expect(screen.getAllByText('$0.00')).toHaveLength(2)
  })

  it('no muestra el error si una petición cancelada termina con rechazo', async () => {
    let rechazarPeticion: (error: Error) => void = () => {
      throw new Error('La petición aún no se ha inicializado')
    }

    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise<Response>((_resolver, rechazar) => {
          rechazarPeticion = rechazar
        }),
    )

    const vista = render(<App />)

    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    const opcionesFetch = vi.mocked(fetch).mock.calls[0]?.[1]
    const senal = opcionesFetch?.signal

    expect(senal).toBeInstanceOf(AbortSignal)

    vista.unmount()

    expect(senal?.aborted).toBe(true)

    await Promise.resolve().then(() => {
      rechazarPeticion(new Error('Petición cancelada'))
    })

    await Promise.resolve()

    expect(
      screen.queryByRole('heading', { name: 'No pudimos cargar el catálogo' }),
    ).toBeNull()
  })
})

describe('Validación de adiciones al carrito', () => {
  const variante = {
    id: 'variante-prueba',
    nombre: 'Unidad',
    sku: 'PRU-001',
    precio: '1.00',
    stockDisponible: 2,
  }

  it('rechaza productos sin variantes', () => {
    expect(validarAdicionCarrito(undefined, 0)).toBe(
      'Este producto no tiene variantes disponibles.',
    )
  })

  it('rechaza variantes sin existencias', () => {
    expect(validarAdicionCarrito({ ...variante, stockDisponible: 0 }, 0)).toBe(
      'Esta variante no tiene existencias disponibles.',
    )
  })

  it('rechaza cantidades que alcanzan el límite de stock', () => {
    expect(validarAdicionCarrito(variante, 2)).toBe(
      'No puedes agregar más unidades que las disponibles en stock.',
    )
  })

  it('permite agregar unidades mientras haya stock', () => {
    expect(validarAdicionCarrito(variante, 1)).toBeNull()
  })
})
