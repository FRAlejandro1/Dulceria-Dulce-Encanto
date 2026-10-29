import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/modules/orders/services/orders.service', () => ({
    crearPedido: vi.fn(),
}))

import { crearPedido } from '../../src/modules/orders/services/orders.service'
import { useCreateOrder } from '../../src/modules/orders/hooks/useCreateOrder'
import type { UsuarioAutenticado } from '../../src/modules/auth/types/auth.types'
import type { LineaCarrito } from '../../src/modules/cart/types/cart.types'

const crearPedidoMock = vi.mocked(crearPedido)

const cliente: UsuarioAutenticado = {
    id: 'usuario-1',
    nombre: 'Ana',
    correo: 'ana@example.com',
    rol: 'CLIENTE',
}

const administrador: UsuarioAutenticado = {
    ...cliente,
    rol: 'ADMIN',
}

const linea: LineaCarrito = {
    producto: {
        id: 'producto-1',
        nombre: 'Chocolate',
        descripcion: null,
        imagenUrl: null,
        categoria: { nombre: 'Dulces', slug: 'dulces' },
        variantes: [],
    },
    variante: {
        id: 'variante-1',
        nombre: 'Unidad',
        sku: 'CHO-001',
        precio: '5.00',
        imagenUrl: null,
        stockDisponible: 10,
    },
    cantidad: 2,
    precioUnitario: 5,
    subtotal: 10,
}

const vaciarCarrito = vi.fn()
const abrirAutenticacion = vi.fn()
const notificar = vi.fn()
const alCrearPedido = vi.fn()

function preparar(
    usuario: UsuarioAutenticado | null,
    lineas: LineaCarrito[] = [linea],
) {
    return renderHook(() =>
        useCreateOrder({
            usuario,
            lineas,
            vaciarCarrito,
            abrirAutenticacion,
            notificar,
            alCrearPedido,
        }),
    )
}

afterEach(() => vi.clearAllMocks())

describe('useCreateOrder', () => {
    it('solicita iniciar sesión cuando no hay usuario', async () => {
        const { result } = preparar(null)

        await act(async () => {
            await result.current.manejarCreacionPedido({ metodoPago: 'CASH' })
        })

        expect(notificar).toHaveBeenCalledWith(
            'Inicia sesión para realizar un pedido.',
        )
        expect(abrirAutenticacion).toHaveBeenCalledOnce()
        expect(crearPedidoMock).not.toHaveBeenCalled()
    })

    it('rechaza usuarios administradores', async () => {
        const { result } = preparar(administrador)

        await act(async () => {
            await result.current.manejarCreacionPedido({ metodoPago: 'CASH' })
        })

        expect(notificar).toHaveBeenCalledWith(
            'Solo las cuentas de cliente pueden realizar pedidos.',
        )
        expect(crearPedidoMock).not.toHaveBeenCalled()
    })

    it('rechaza el carrito vacío', async () => {
        const { result } = preparar(cliente, [])

        await act(async () => {
            await result.current.manejarCreacionPedido({ metodoPago: 'CASH' })
        })

        expect(notificar).toHaveBeenCalledWith(
            'Agrega al menos un producto antes de confirmar el pedido.',
        )
        expect(crearPedidoMock).not.toHaveBeenCalled()
    })

    it('crea el pedido y vacía el carrito', async () => {
        crearPedidoMock.mockResolvedValue({
            id: 'pedido-1',
            numero: 'PED-001',
            estado: 'PENDIENTE',
            subtotal: 10,
            total: 10,
        })

        const { result } = preparar(cliente)

        await act(async () => {
            await result.current.manejarCreacionPedido({
                metodoPago: 'TRANSFER',
                notas: 'Entregar por la tarde',
            })
        })

        expect(crearPedidoMock).toHaveBeenCalledWith({
            metodoPago: 'TRANSFER',
            notas: 'Entregar por la tarde',
            items: [{ varianteId: 'variante-1', cantidad: 2 }],
        })
        expect(vaciarCarrito).toHaveBeenCalledOnce()
        expect(notificar).toHaveBeenCalledWith(
            'Pedido PED-001 creado correctamente.',
        )
        expect(alCrearPedido).toHaveBeenCalledOnce()
        expect(result.current.procesandoPedido).toBe(false)
    })

    it('notifica errores de tipo Error', async () => {
        crearPedidoMock.mockRejectedValue(new Error('Sin existencias'))

        const { result } = preparar(cliente)

        await act(async () => {
            await result.current.manejarCreacionPedido({ metodoPago: 'CASH' })
        })

        expect(notificar).toHaveBeenCalledWith('Sin existencias')
        expect(vaciarCarrito).not.toHaveBeenCalled()
        expect(result.current.procesandoPedido).toBe(false)
    })

    it('notifica errores que no son instancias de Error', async () => {
        crearPedidoMock.mockRejectedValue('fallo inesperado')

        const { result } = preparar(cliente)

        await act(async () => {
            await result.current.manejarCreacionPedido({ metodoPago: 'CASH' })
        })

        expect(notificar).toHaveBeenCalledWith(
            'No se pudo crear el pedido. Inténtalo nuevamente.',
        )
        expect(result.current.procesandoPedido).toBe(false)
    })

    it('ignora una segunda solicitud mientras crea el pedido', async () => {
        let resolverPedido:
            | ((pedido: Awaited<ReturnType<typeof crearPedido>>) => void)
            | undefined

        crearPedidoMock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolverPedido = resolve
                }),
        )

        const { result } = preparar(cliente)
        let primeraCreacion!: Promise<void>

        await act(async () => {
            primeraCreacion = result.current.manejarCreacionPedido({
                metodoPago: 'CASH',
            })
            await Promise.resolve()
        })

        expect(result.current.procesandoPedido).toBe(true)

        await act(async () => {
            await result.current.manejarCreacionPedido({
                metodoPago: 'CASH',
            })
        })

        expect(crearPedidoMock).toHaveBeenCalledOnce()

        await act(async () => {
            resolverPedido?.({
                id: 'pedido-1',
                numero: 'PED-001',
                estado: 'PENDIENTE',
                subtotal: 10,
                total: 10,
            })
            await primeraCreacion
        })

        expect(result.current.procesandoPedido).toBe(false)
        expect(vaciarCarrito).toHaveBeenCalledOnce()
    })
})
