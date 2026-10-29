import { afterEach, describe, expect, it, vi } from 'vitest'

const { enviarSolicitudProtegida } = vi.hoisted(() => ({
  enviarSolicitudProtegida: vi.fn(),
}))

vi.mock('../../src/services/http.service', () => ({
  enviarSolicitudProtegida,
}))

import { crearPedido } from '../../src/modules/orders/services/orders.service'

afterEach(() => vi.clearAllMocks())

describe('orders.service', () => {
  const entrada = {
    metodoPago: 'CASH' as const,
    items: [{ varianteId: 'variante-1', cantidad: 2 }],
  }

  const pedido = {
    id: 1,
    numero: 'PED-001',
    estado: 'PENDIENTE',
    subtotal: 10,
    total: 10,
  }

  it('crea un pedido y normaliza su identificador', async () => {
    enviarSolicitudProtegida.mockResolvedValue({ pedido })

    await expect(crearPedido(entrada)).resolves.toEqual({
      ...pedido,
      id: '1',
    })

    expect(enviarSolicitudProtegida).toHaveBeenCalledWith(
      '/api/v1/orders',
      { metodo: 'POST', cuerpo: entrada },
    )
  })

  it('acepta un identificador de texto', async () => {
    enviarSolicitudProtegida.mockResolvedValue({
      pedido: { ...pedido, id: 'pedido-2' },
    })

    await expect(crearPedido(entrada)).resolves.toMatchObject({
      id: 'pedido-2',
    })
  })

  it.each([null, undefined, {}, { pedido: null }, ])(
    'rechaza una estructura de respuesta inválida',
    async (respuesta) => {
      enviarSolicitudProtegida.mockResolvedValue(respuesta)

      await expect(crearPedido(entrada)).rejects.toThrow(
        'El servidor devolvió una respuesta de pedido inválida.',
      )
    },
  )

  it.each([
    { ...pedido, id: true },
    { ...pedido, id: Infinity },
    { ...pedido, numero: 123 },
    { ...pedido, estado: null },
    { ...pedido, subtotal: '10' },
    { ...pedido, subtotal: Infinity },
    { ...pedido, total: null },
    { ...pedido, total: Infinity },
  ])('rechaza datos de pedido inválidos', async (pedidoInvalido) => {
    enviarSolicitudProtegida.mockResolvedValue({
      pedido: pedidoInvalido,
    })

    await expect(crearPedido(entrada)).rejects.toThrow(
      'El servidor devolvió datos de pedido inválidos.',
    )
  })

  it('propaga errores de la solicitud', async () => {
    enviarSolicitudProtegida.mockRejectedValue(new Error('Error de red'))

    await expect(crearPedido(entrada)).rejects.toThrow('Error de red')
  })
})
