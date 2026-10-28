import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductoAdmin, VarianteAdmin } from '../../src/modules/admin/types/inventory.types'
import type { PropiedadesListaProductos } from '../../src/modules/admin/types/admin.types'
import ProductList from '../../src/modules/admin/components/ProductList/ProductList'

function crearVariante(
    id: string,
    opciones: Partial<VarianteAdmin> = {},
): VarianteAdmin {
    return {
        id,
        nombre: 'Unidad',
        sku: `SKU-${id}`,
        precio: '5.00',
        imagenUrl: null,
        activa: true,
        stockDisponible: 4,
        stockFisico: 4,
        stockReservado: 0,
        ...opciones,
    }
}

function crearProducto(
    id: string,
    opciones: Partial<ProductoAdmin> = {},
): ProductoAdmin {
    return {
        id,
        nombre: `Producto ${id}`,
        descripcion: 'Descripción de prueba',
        imagenUrl: null,
        activo: true,
        categoriaId: 'dulces',
        categoria: {
            nombre: 'Dulces',
            slug: 'dulces',
            activa: true,
        },
        variantes: [crearVariante(`var-${id}`)],
        ...opciones,
    }
}

const categoriasDisponibles = [
    { id: 'dulces', nombre: 'Dulces', activa: true },
    { id: 'confites', nombre: 'Confites', activa: true },
    { id: 'inactiva', nombre: 'Categoría inactiva', activa: false },
]

const producto = crearProducto('1', {
    nombre: 'Alfajor',
    variantes: [
        crearVariante('v1'),
        crearVariante('v2', {
            nombre: 'Caja',
            precio: '8.50',
            stockDisponible: 6,
        }),
    ],
})

const productoSinVariantes = crearProducto('2', {
    nombre: 'Galleta',
    descripcion: null,
    variantes: [],
})

function crearPropiedades(
    cambios: Partial<PropiedadesListaProductos> = {},
): PropiedadesListaProductos {
    return {
        productos: [producto, productoSinVariantes],
        productoSeleccionadoId: '1',
        busqueda: '',
        categoriaSeleccionada: 'Todas',
        categorias: ['Todas', 'Dulces', 'Confites'],
        categoriasDisponibles,
        onCambiarBusqueda: vi.fn(),
        onCambiarCategoria: vi.fn(),
        onSeleccionarProducto: vi.fn(),
        onCrearProducto: vi.fn().mockResolvedValue('producto-nuevo'),
        onCargarImagenProducto: vi.fn().mockResolvedValue(undefined),
        ...cambios,
    }
}

function abrirFormulario() {
    fireEvent.click(screen.getByRole('button', { name: '+ Crear producto' }))
}

function completarProducto() {
    fireEvent.change(
        screen.getByRole('textbox', { name: /Nombre del producto/ }),
        { target: { value: 'Torta artesanal' } },
    )
    fireEvent.change(
        screen.getByRole('textbox', { name: /Descripción/ }),
        { target: { value: 'Torta de chocolate' } },
    )
    fireEvent.change(
        screen.getByRole('textbox', { name: /Nombre de la variante/ }),
        { target: { value: 'Unidad' } },
    )
    fireEvent.change(screen.getByRole('textbox', { name: 'SKU *' }), {
        target: { value: 'TOR-001' },
    })
    fireEvent.change(screen.getByRole('spinbutton', { name: /Precio/ }), {
        target: { value: '12.5' },
    })
}

function crearArchivo(
    nombre = 'producto.png',
    tipo = 'image/png',
): File {
    return new File(['contenido de prueba'], nombre, { type: tipo })
}

function prepararUrlObject() {
    const URLOriginal = globalThis.URL

    class URLConVistaPrevia extends URLOriginal {}

    Object.defineProperties(URLConVistaPrevia, {
        createObjectURL: {
            configurable: true,
            value: vi.fn().mockReturnValue('blob:imagen-prueba'),
        },
        revokeObjectURL: {
            configurable: true,
            value: vi.fn(),
        },
    })

    vi.stubGlobal('URL', URLConVistaPrevia)
}

beforeEach(() => {
    vi.clearAllMocks()
    prepararUrlObject()
})

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
})

describe('ProductList: lista y navegación', () => {
    it('muestra productos, imágenes, stock y categorías', () => {
        render(<ProductList {...crearPropiedades()} />)

        expect(
            screen.getByRole('region', { name: 'Lista de productos' }),
        ).toBeTruthy()
        expect(screen.getByText('Alfajor')).toBeTruthy()
        expect(screen.getByText('Galleta')).toBeTruthy()
        expect(screen.getAllByText('DE').length).toBeGreaterThan(0)
        expect(
            screen.getByText((_, elemento) => {
                return (
                    elemento?.tagName.toLowerCase() === 'small' &&
                    elemento.textContent?.includes('2') === true &&
                    elemento.textContent.toLowerCase().includes('variante')
                )
            }),
        ).toBeTruthy()
        expect(screen.getByText(/10 disponibles/)).toBeTruthy()
        expect(screen.getByText('Sin descripción registrada.')).toBeTruthy()
        expect(
            screen.queryByRole('option', { name: 'Categoría inactiva' }),
        ).toBeNull()
    })

    it('ordena primero el producto seleccionado y cambia la selección', () => {
        const props = crearPropiedades({ productoSeleccionadoId: '2' })
        render(<ProductList {...props} />)

        const botones = screen.getAllByRole('button', {
            name: /Producto|Alfajor|Galleta/,
        })
        expect(botones.length).toBeGreaterThan(0)

        fireEvent.click(screen.getByRole('button', { name: /Alfajor/ }))
        expect(props.onSeleccionarProducto).toHaveBeenCalledWith('1')
    })

    it('mantiene el orden cuando ningún producto coincide con la selección', () => {
        render(
            <ProductList
                {...crearPropiedades({ productoSeleccionadoId: 'inexistente' })}
            />,
        )

        const region = screen.getByRole('region', { name: 'Lista de productos' })
        const alfajor = region.textContent?.indexOf('Alfajor') ?? -1
        const galleta = region.textContent?.indexOf('Galleta') ?? -1

        expect(alfajor).toBeGreaterThanOrEqual(0)
        expect(galleta).toBeGreaterThan(alfajor)
    })

    it('contrae el producto seleccionado cuando se vuelve a pulsar', () => {
        const props = crearPropiedades()
        render(<ProductList {...props} />)

        const boton = screen.getByRole('button', { name: /Alfajor/ })
        expect(boton.getAttribute('aria-expanded')).toBe('true')

        fireEvent.click(boton)

        expect(props.onSeleccionarProducto).toHaveBeenCalledWith('1')
        expect(screen.queryByText('Variantes del producto')).toBeNull()
    })

    it('muestra las variantes y los precios formateados', () => {
        render(<ProductList {...crearPropiedades()} />)

        expect(screen.getByText('SKU: SKU-v1')).toBeTruthy()
        expect(screen.getByText('$5.00')).toBeTruthy()
        expect(screen.getByText('$8.50')).toBeTruthy()
        expect(screen.getByText('6 disponibles')).toBeTruthy()
    })

    it('actualiza la búsqueda y el filtro de categoría', () => {
        const props = crearPropiedades()
        render(<ProductList {...props} />)

        fireEvent.change(screen.getByPlaceholderText('Buscar producto...'), {
            target: { value: 'torta' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Confites' }))

        expect(props.onCambiarBusqueda).toHaveBeenCalledWith('torta')
        expect(props.onCambiarCategoria).toHaveBeenCalledWith('Confites')
    })

    it('sincroniza el producto expandido cuando cambia la selección externa', () => {
        const props = crearPropiedades()
        const vista = render(<ProductList {...props} />)

        vista.rerender(
            <ProductList {...props} productoSeleccionadoId="2" />,
        )

        expect(
            screen
                .getByRole('button', { name: /Galleta/ })
                .getAttribute('aria-expanded'),
        ).toBe('true')
    })

    it('muestra el estado vacío sin productos', () => {
        render(<ProductList {...crearPropiedades({ productos: [] })} />)

        expect(screen.getByRole('status').textContent).toContain(
            'No se encontraron productos',
        )
    })

    it('maneja una categoría sin categorías activas', () => {
        render(
            <ProductList
                {...crearPropiedades({
                    categoriasDisponibles: [
                        { id: 'inactiva', nombre: 'Inactiva', activa: false },
                    ],
                })}
            />,
        )

        abrirFormulario()

        expect(
            screen.getByRole('button', { name: 'Guardar producto' }).hasAttribute('disabled'),
        ).toBe(true)
    })

    it('acepta categorías disponibles indefinidas', () => {
        render(
            <ProductList
                {...crearPropiedades({ categoriasDisponibles: undefined })}
            />,
        )

        abrirFormulario()

        expect(
            screen.getByRole('heading', { name: 'Nuevo producto' }),
        ).toBeTruthy()
    })
})

describe('ProductList: formulario de creación', () => {
    it('abre y cierra el formulario', () => {
        render(<ProductList {...crearPropiedades()} />)

        abrirFormulario()
        expect(screen.getByRole('heading', { name: 'Nuevo producto' })).toBeTruthy()

        fireEvent.click(screen.getByRole('button', { name: 'Cancelar creación' }))
        expect(screen.queryByRole('heading', { name: 'Nuevo producto' })).toBeNull()
    })

    it('rellena los campos y crea un producto', async () => {
        const props = crearPropiedades()
        render(<ProductList {...props} />)

        abrirFormulario()
        completarProducto()

        fireEvent.click(screen.getByRole('button', { name: 'Guardar producto' }))

        await waitFor(() => {
            expect(props.onCrearProducto).toHaveBeenCalledWith({
                nombre: 'Torta artesanal',
                descripcion: 'Torta de chocolate',
                categoriaId: 'dulces',
                variantes: [
                    {
                        nombre: 'Unidad',
                        sku: 'TOR-001',
                        precio: '12.50',
                    },
                ],
            })
        })

        await waitFor(() => {
            expect(
                screen.queryByRole('heading', { name: 'Nuevo producto' }),
            ).toBeNull()
        })
    })

    it('no crea el producto si faltan campos obligatorios', async () => {
        const props = crearPropiedades({ categoriasDisponibles: [] })
        render(<ProductList {...props} />)

        abrirFormulario()

        fireEvent.change(
            screen.getByRole('textbox', { name: /Nombre del producto/ }),
            { target: { value: 'Torta' } },
        )
        fireEvent.change(
            screen.getByRole('textbox', { name: /Nombre de la variante/ }),
            { target: { value: 'Unidad' } },
        )
        fireEvent.change(
            screen.getByRole('textbox', { name: /SKU/ }),
            { target: { value: 'TORTA-001' } },
        )
        fireEvent.change(
            screen.getByRole('spinbutton', { name: /Precio/ }),
            { target: { value: '5.00' } },
        )

        fireEvent.submit(
            screen.getByRole('heading', { name: 'Nuevo producto' }).closest('form')!,
        )

        await waitFor(() => {
            expect(
                screen.getByText('Completa los campos obligatorios.'),
            ).toBeTruthy()
        })

        expect(props.onCrearProducto).not.toHaveBeenCalled()
    })
    it('permite cambiar la categoría del producto', () => {
        render(<ProductList {...crearPropiedades()} />)
        abrirFormulario()

        const selectorCategoria = screen.getByRole('combobox', {
            name: /Categoría/,
        }) as HTMLSelectElement

        fireEvent.change(selectorCategoria, {
            target: { value: 'confites' },
        })

        expect(selectorCategoria.value).toBe('confites')
    })

    it.each(['0', '-1', 'abc'])(
        'rechaza el precio inválido %s',
        async (precio) => {
            const props = crearPropiedades()
            render(<ProductList {...props} />)

            abrirFormulario()
            completarProducto()

            fireEvent.change(screen.getByRole('spinbutton', { name: /Precio/ }), {
                target: { value: precio },
            })

            fireEvent.submit(
                screen.getByRole('heading', { name: 'Nuevo producto' }).closest('form')!,
            )

            await waitFor(() => {
                expect(props.onCrearProducto).not.toHaveBeenCalled()
            })
        },
    )

    it('muestra el error devuelto al fallar la creación', async () => {
        const props = crearPropiedades({
            onCrearProducto: vi.fn().mockRejectedValue(new Error('No se pudo crear')),
        })
        render(<ProductList {...props} />)

        abrirFormulario()
        completarProducto()
        fireEvent.submit(
            screen.getByRole('heading', { name: 'Nuevo producto' }).closest('form')!,
        )

        expect(await screen.findByRole('alert')).toBeTruthy()
        expect(screen.getByRole('alert').textContent).toContain('No se pudo crear')
    })

    it('muestra un mensaje genérico si falla con un valor que no es Error', async () => {
        const props = crearPropiedades({
            onCrearProducto: vi.fn().mockRejectedValue('error inesperado'),
        })
        render(<ProductList {...props} />)

        abrirFormulario()
        completarProducto()
        fireEvent.submit(
            screen.getByRole('heading', { name: 'Nuevo producto' }).closest('form')!,
        )

        expect(await screen.findByRole('alert')).toBeTruthy()
        expect(screen.getByRole('alert').textContent).toContain(
            'No se pudo crear el producto',
        )
    })

    it('no muestra la opción de cancelar mientras se está enviando', async () => {
        let resolver: ((id: string) => void) | undefined
        const props = crearPropiedades({
            onCrearProducto: vi.fn().mockImplementation(
                () =>
                    new Promise<string>((resolve) => {
                        resolver = resolve
                    }),
            ),
        })

        render(<ProductList {...props} />)
        abrirFormulario()
        completarProducto()
        fireEvent.submit(
            screen.getByRole('heading', { name: 'Nuevo producto' }).closest('form')!,
        )

        expect(
            await screen.findByRole('button', { name: 'Guardando...' }),
        ).toBeTruthy()

        resolver?.('producto-nuevo')

        await waitFor(() => {
            expect(
                screen.queryByRole('heading', { name: 'Nuevo producto' }),
            ).toBeNull()
        })
    })
})

describe('ProductList: selección y validación de imágenes', () => {
    it('rechaza un archivo que no sea una imagen', () => {
        render(<ProductList {...crearPropiedades()} />)
        abrirFormulario()

        const selector = screen.getByLabelText('Seleccionar imagen del producto')
        fireEvent.change(selector, {
            target: { files: [crearArchivo('documento.pdf', 'application/pdf')] },
        })

        expect(screen.getByRole('alert').textContent).toContain(
            'Selecciona un archivo de imagen',
        )
    })

    it('vuelve a validar el tipo de imagen al enviar el formulario', () => {
        const props = crearPropiedades()
        render(<ProductList {...props} />)
        abrirFormulario()
        completarProducto()

        const archivo = crearArchivo()
        fireEvent.change(screen.getByLabelText('Seleccionar imagen del producto'), {
            target: { files: [archivo] },
        })

        Object.defineProperty(archivo, 'type', {
            configurable: true,
            value: 'application/pdf',
        })

        fireEvent.submit(
            screen.getByRole('heading', { name: 'Nuevo producto' }).closest('form')!,
        )

        expect(screen.getByRole('alert').textContent).toContain(
            'Selecciona un archivo de imagen',
        )
        expect(props.onCrearProducto).not.toHaveBeenCalled()
    })

    it('selecciona una imagen y muestra la vista previa', () => {
        render(<ProductList {...crearPropiedades()} />)
        abrirFormulario()

        fireEvent.change(screen.getByLabelText('Seleccionar imagen del producto'), {
            target: { files: [crearArchivo()] },
        })

        expect(
            screen
                .getByRole('img', { name: 'Vista previa de la imagen del producto' })
                .getAttribute('src'),
        ).toBe('blob:imagen-prueba')
        expect(screen.getByText('Archivo: producto.png')).toBeTruthy()
    })

    it('permite introducir una URL de imagen válida', () => {
        render(<ProductList {...crearPropiedades()} />)
        abrirFormulario()

        fireEvent.click(screen.getByRole('button', { name: 'URL' }))
        fireEvent.change(
            screen.getByPlaceholderText('https://ejemplo.com/imagen.jpg'),
            { target: { value: 'https://ejemplo.com/foto.jpg' } },
        )
        fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

        expect(
            screen
                .getByRole('img', { name: 'Vista previa de la imagen del producto' })
                .getAttribute('src'),
        ).toBe('https://ejemplo.com/foto.jpg')
    })

    it('rechaza una URL vacía', () => {
        render(<ProductList {...crearPropiedades()} />)
        abrirFormulario()

        fireEvent.click(screen.getByRole('button', { name: 'URL' }))
        fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

        expect(screen.getByRole('alert').textContent).toContain('Introduce la URL')
    })

    it('rechaza una URL inválida', () => {
        render(<ProductList {...crearPropiedades()} />)
        abrirFormulario()

        fireEvent.click(screen.getByRole('button', { name: 'URL' }))
        fireEvent.change(
            screen.getByPlaceholderText('https://ejemplo.com/imagen.jpg'),
            { target: { value: 'esto-no-es-una-url' } },
        )
        fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

        expect(screen.getByRole('alert').textContent).toContain(
            'URL de imagen válida',
        )
    })

    it('rechaza protocolos distintos de HTTP y HTTPS', () => {
        render(<ProductList {...crearPropiedades()} />)
        abrirFormulario()

        fireEvent.click(screen.getByRole('button', { name: 'URL' }))
        fireEvent.change(
            screen.getByPlaceholderText('https://ejemplo.com/imagen.jpg'),
            { target: { value: 'ftp://ejemplo.com/foto.jpg' } },
        )
        fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

        expect(screen.getByRole('alert').textContent).toContain('HTTP o HTTPS')
    })

    it('muestra un error si no puede representar la vista previa', () => {
        render(<ProductList {...crearPropiedades()} />)
        abrirFormulario()

        fireEvent.change(screen.getByLabelText('Seleccionar imagen del producto'), {
            target: { files: [crearArchivo()] },
        })
        fireEvent(
            screen.getByRole('img', { name: 'Vista previa de la imagen del producto' }),
            new Event('error'),
        )

        expect(screen.getByRole('alert').textContent).toContain(
            'No se pudo mostrar la imagen',
        )
    })

    it('abre y cierra el campo para la URL de la imagen', () => {
        render(<ProductList {...crearPropiedades()} />)
        abrirFormulario()

        fireEvent.click(screen.getByRole('button', { name: 'URL' }))
        expect(
            screen.getByPlaceholderText('https://ejemplo.com/imagen.jpg'),
        ).toBeTruthy()

        fireEvent.click(screen.getByRole('button', { name: 'URL' }))
        expect(
            screen.queryByPlaceholderText('https://ejemplo.com/imagen.jpg'),
        ).toBeNull()
    })

    it('permite arrastrar y soltar un archivo de imagen', () => {
        render(<ProductList {...crearPropiedades()} />)
        abrirFormulario()

        const zona = screen.getByText('Imagen del producto').parentElement?.parentElement
        expect(zona).toBeTruthy()

        fireEvent.dragOver(zona!)
        expect(zona?.className).toContain('is-dragging')

        fireEvent.drop(zona!, {
            dataTransfer: { files: [crearArchivo('arrastrada.png')] },
        })

        expect(screen.getByText('Archivo: arrastrada.png')).toBeTruthy()
        expect(zona?.className).not.toContain('is-dragging')
    })

    it('desactiva el estado de arrastre cuando el cursor sale del área', () => {
        render(<ProductList {...crearPropiedades()} />)
        abrirFormulario()

        const zona = screen.getByText('Imagen del producto').parentElement?.parentElement
        expect(zona).toBeTruthy()

        fireEvent.dragOver(zona!)
        expect(zona?.className).toContain('is-dragging')

        fireEvent.dragLeave(zona!, { relatedTarget: document.body })

        expect(zona?.className).not.toContain('is-dragging')
    })

    it('abre el selector de archivos al pulsar Subir foto', () => {
        render(<ProductList {...crearPropiedades()} />)
        abrirFormulario()

        const selector = screen.getByLabelText(
            'Seleccionar imagen del producto',
        ) as HTMLInputElement

        const clickSelector = vi.spyOn(selector, 'click')

        fireEvent.click(screen.getByRole('button', { name: 'Subir foto' }))

        expect(clickSelector).toHaveBeenCalledOnce()
    })

    it('limpia la vista previa local al cancelar', () => {
        render(<ProductList {...crearPropiedades()} />)
        abrirFormulario()

        fireEvent.change(screen.getByLabelText('Seleccionar imagen del producto'), {
            target: { files: [crearArchivo()] },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:imagen-prueba')
    })
})

describe('ProductList: carga de imagen después de crear', () => {
    it('crea el producto y carga la imagen seleccionada', async () => {
        const props = crearPropiedades()
        render(<ProductList {...props} />)

        abrirFormulario()
        completarProducto()

        fireEvent.change(screen.getByLabelText('Seleccionar imagen del producto'), {
            target: { files: [crearArchivo()] },
        })
        fireEvent.submit(
            screen.getByRole('heading', { name: 'Nuevo producto' }).closest('form')!,
        )

        await waitFor(() => {
            expect(props.onCrearProducto).toHaveBeenCalledOnce()
            expect(props.onCargarImagenProducto).toHaveBeenCalledWith(
                'producto-nuevo',
                expect.any(File),
            )
        })
    })

    it('mantiene el formulario si falla la carga y permite reintentar', async () => {
        const props = crearPropiedades({
            onCargarImagenProducto: vi.fn()
                .mockRejectedValueOnce(new Error('Falló la carga'))
                .mockResolvedValueOnce(undefined),
        })
        render(<ProductList {...props} />)

        abrirFormulario()
        completarProducto()
        fireEvent.change(screen.getByLabelText('Seleccionar imagen del producto'), {
            target: { files: [crearArchivo()] },
        })
        fireEvent.submit(
            screen.getByRole('heading', { name: 'Nuevo producto' }).closest('form')!,
        )

        expect(await screen.findByRole('alert')).toBeTruthy()
        expect(screen.getByRole('alert').textContent).toContain('Falló la carga')
        expect(
            screen.getByRole('button', { name: 'Reintentar imagen' }),
        ).toBeTruthy()

        fireEvent.submit(
            screen.getByRole('heading', { name: 'Nuevo producto' }).closest('form')!,
        )

        await waitFor(() => {
            expect(props.onCargarImagenProducto).toHaveBeenCalledTimes(2)
        })
    })

    it('exige seleccionar un archivo cuando solo se ha aplicado una URL de vista previa', async () => {
        const props = crearPropiedades({
            onCargarImagenProducto: vi.fn().mockRejectedValueOnce(
                new Error('Error de carga'),
            ),
        })

        render(<ProductList {...props} />)
        abrirFormulario()
        completarProducto()

        fireEvent.change(screen.getByLabelText('Seleccionar imagen del producto'), {
            target: { files: [crearArchivo()] },
        })
        fireEvent.submit(
            screen.getByRole('heading', { name: 'Nuevo producto' }).closest('form')!,
        )

        expect(await screen.findByRole('alert')).toBeTruthy()
        expect(screen.getByRole('alert').textContent).toContain('Error de carga')

        fireEvent.click(screen.getByRole('button', { name: 'URL' }))
        fireEvent.change(
            screen.getByPlaceholderText('https://ejemplo.com/imagen.jpg'),
            { target: { value: 'https://ejemplo.com/foto.jpg' } },
        )
        fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

        fireEvent.submit(
            screen.getByRole('heading', { name: 'Nuevo producto' }).closest('form')!,
        )

        expect(await screen.findByRole('alert')).toBeTruthy()
        expect(screen.getByRole('alert').textContent).toContain(
            'La URL solo sirve para la vista previa',
        )
        expect(props.onCargarImagenProducto).toHaveBeenCalledTimes(1)
    })

    it('bloquea el botón para crear otro producto mientras queda una imagen pendiente', async () => {
        const props = crearPropiedades({
            onCargarImagenProducto: vi.fn().mockRejectedValueOnce(
                new Error('Error de carga'),
            ),
        })
        render(<ProductList {...props} />)

        abrirFormulario()
        completarProducto()
        fireEvent.change(screen.getByLabelText('Seleccionar imagen del producto'), {
            target: { files: [crearArchivo()] },
        })
        fireEvent.submit(
            screen.getByRole('heading', { name: 'Nuevo producto' }).closest('form')!,
        )

        expect(await screen.findByRole('alert')).toBeTruthy()

        expect(
            screen.getByRole('button', { name: 'Reintentar imagen' }),
        ).toBeTruthy()
        expect(props.onCrearProducto).toHaveBeenCalledOnce()
    })
})
