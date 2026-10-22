import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Producto, Variante } from '../src/types/catalogo.types'
import type { LineaCarrito } from '../src/modules/cart/types/cart.types'
import CartEmpty from '../src/modules/cart/components/CartEmpty/CartEmpty'
import CartItem from '../src/modules/cart/components/CartItem/CartItem'
import CartSummary from '../src/modules/cart/components/CartSummary/CartSummary'
import CartPanel from '../src/modules/cart/components/CartPanel'

afterEach(() => {
    cleanup()
})

const variante: Variante = {
    id: 'variante-1',
    nombre: 'Unidad',
    sku: 'TEST-001',
    precio: '2.50',
    imagenUrl: null,
    stockDisponible: 3,
}

const producto: Producto = {
    id: 'producto-1',
    nombre: 'Producto de prueba',
    descripcion: 'Descripción de prueba',
    imagenUrl: null,
    categoria: {
        nombre: 'Pruebas',
        slug: 'pruebas',
    },
    variantes: [variante],
}

const linea: LineaCarrito = {
    producto,
    variante,
    cantidad: 2,
    precioUnitario: 2.5,
    subtotal: 5,
}

describe('CartEmpty', () => {
    it('muestra el estado vacío y permite volver al catálogo', () => {
        const onCerrar = vi.fn()

        render(<CartEmpty onCerrar={onCerrar} />)

        expect(
            screen.getByRole('heading', { level: 2 }).textContent,
        ).toMatch(/Tu carrito est/)

        fireEvent.click(screen.getByRole('button'))

        expect(onCerrar).toHaveBeenCalledOnce()
    })
})

describe('CartItem', () => {
    it('muestra los datos del producto y el subtotal', () => {
        render(
            <CartItem
                linea={linea}
                onCambiarCantidad={vi.fn()}
                onEliminar={vi.fn()}
            />,
        )

        expect(
            screen.getByRole('heading', {
                name: 'Producto de prueba',
            }),
        ).toBeTruthy()

        expect(screen.getByText('Pruebas')).toBeTruthy()
        expect(screen.getByText('Unidad', { exact: false })).toBeTruthy()
        expect(screen.getByLabelText('Cantidad: 2').textContent).toBe('2')
        expect(screen.getByText('$5,00')).toBeTruthy()
    })

    it('usa la imagen de la variante cuando está disponible', () => {
        const lineaConImagen: LineaCarrito = {
            ...linea,
            variante: {
                ...variante,
                imagenUrl: 'https://example.com/variante.png',
            },
            producto: {
                ...producto,
                imagenUrl: 'https://example.com/producto.png',
            },
        }

        render(
            <CartItem
                linea={lineaConImagen}
                onCambiarCantidad={vi.fn()}
                onEliminar={vi.fn()}
            />,
        )

        const imagen = document.querySelector('.cart-item__image')

        expect(imagen).not.toBeNull()
        expect(imagen?.getAttribute('src')).toBe(
            'https://example.com/variante.png',
        )
    })

    it('usa la imagen del producto si la variante no tiene imagen', () => {
        const lineaConImagenProducto: LineaCarrito = {
            ...linea,
            producto: {
                ...producto,
                imagenUrl: 'https://example.com/producto.png',
            },
        }

        render(
            <CartItem
                linea={lineaConImagenProducto}
                onCambiarCantidad={vi.fn()}
                onEliminar={vi.fn()}
            />,
        )

        const imagen = document.querySelector('.cart-item__image')

        expect(imagen).not.toBeNull()
        expect(imagen?.getAttribute('src')).toBe(
            'https://example.com/producto.png',
        )
    })

    it('usa la imagen predeterminada cuando no hay imágenes propias', () => {
        render(
            <CartItem
                linea={linea}
                onCambiarCantidad={vi.fn()}
                onEliminar={vi.fn()}
            />,
        )

        const imagen = document.querySelector('.cart-item__image')

        expect(imagen).not.toBeNull()
        expect(imagen?.getAttribute('src')).toContain(
            'photo-1558961363-fa8fdf82db35',
        )
    })

    it('permite disminuir la cantidad cuando es mayor que uno', () => {
        const onCambiarCantidad = vi.fn()

        render(
            <CartItem
                linea={linea}
                onCambiarCantidad={onCambiarCantidad}
                onEliminar={vi.fn()}
            />,
        )

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Disminuir cantidad de Producto de prueba',
            }),
        )

        expect(onCambiarCantidad).toHaveBeenCalledWith('variante-1', 1)
    })

    it('deshabilita disminuir cuando la cantidad es uno', () => {
        render(
            <CartItem
                linea={{ ...linea, cantidad: 1 }}
                onCambiarCantidad={vi.fn()}
                onEliminar={vi.fn()}
            />,
        )

        expect(
            screen.getByRole('button', {
                name: 'Disminuir cantidad de Producto de prueba',
            }).hasAttribute('disabled'),
        ).toBe(true)
    })

    it('permite aumentar mientras haya existencias', () => {
        const onCambiarCantidad = vi.fn()

        render(
            <CartItem
                linea={linea}
                onCambiarCantidad={onCambiarCantidad}
                onEliminar={vi.fn()}
            />,
        )

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Aumentar cantidad de Producto de prueba',
            }),
        )

        expect(onCambiarCantidad).toHaveBeenCalledWith('variante-1', 3)
    })

    it('deshabilita aumentar y muestra el aviso al alcanzar el stock', () => {
        render(
            <CartItem
                linea={{ ...linea, cantidad: 3 }}
                onCambiarCantidad={vi.fn()}
                onEliminar={vi.fn()}
            />,
        )

        expect(
            screen.getByRole('button', {
                name: 'Aumentar cantidad de Producto de prueba',
            }).hasAttribute('disabled'),
        ).toBe(true)

        expect(screen.getByText(/disponible:\s*3/)).toBeTruthy()
    })

    it('permite eliminar el artículo', () => {
        const onEliminar = vi.fn()

        render(
            <CartItem
                linea={linea}
                onCambiarCantidad={vi.fn()}
                onEliminar={onEliminar}
            />,
        )

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Eliminar Producto de prueba del carrito',
            }),
        )

        expect(onEliminar).toHaveBeenCalledWith('variante-1')
    })
})

describe('CartSummary', () => {
    it('muestra las cantidades, el subtotal y la información del envío', () => {
        render(
            <CartSummary
                cantidad={2}
                subtotal={5}
                onFinalizarPedido={vi.fn()}
            />,
        )

        expect(
            screen.getByRole('heading', {
                name: 'Resumen del pedido',
            }),
        ).toBeTruthy()

        expect(screen.getByText('Productos')).toBeTruthy()
        expect(screen.getByText('2')).toBeTruthy()
        expect(screen.getAllByText('$5,00')).toHaveLength(2)
        expect(screen.getByText('Por confirmar')).toBeTruthy()
    })

    it('invoca la acción de finalizar el pedido', () => {
        const onFinalizarPedido = vi.fn()

        render(
            <CartSummary
                cantidad={1}
                subtotal={2.5}
                onFinalizarPedido={onFinalizarPedido}
            />,
        )

        fireEvent.click(
            screen.getByRole('button', { name: /Finalizar pedido/ }),
        )

        expect(onFinalizarPedido).toHaveBeenCalledOnce()
    })
    describe('CartPanel', () => {
        const propiedades = {
            productos: [producto],
            carrito: { 'variante-1': 2 },
            onCerrar: vi.fn(),
            onCambiarCantidad: vi.fn(),
            onEliminar: vi.fn(),
            onFinalizarPedido: vi.fn(),
        }

        it.each([
            ['precio negativo', '-2.50'],
            ['precio no numérico', 'inválido'],
        ])('reemplaza por cero un %s y calcula el subtotal correctamente', (_caso, precio) => {
            const productoConPrecioInvalido: Producto = {
                ...producto,
                variantes: [{ ...variante, precio }],
            }

            render(
                <CartPanel
                    {...propiedades}
                    productos={[productoConPrecioInvalido]}
                />,
            )

            expect(screen.getAllByText('$0,00')).toHaveLength(3)
        })

        it('muestra el estado vacío si no hay unidades en el carrito', () => {
            render(
                <CartPanel
                    {...propiedades}
                    carrito={{ 'variante-1': 0 }}
                />,
            )

            expect(
                screen.getByRole('heading', { level: 2 }),
            ).toBeTruthy()
            expect(
                screen.getByText(/carrito est/i),
            ).toBeTruthy()
        })
    })
})
