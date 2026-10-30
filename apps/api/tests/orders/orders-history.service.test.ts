import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  listarPedidosUsuario: vi.fn(),
}));

vi.mock('../../src/config/database.js', () => ({
  pool: { execute: mocks.execute },
}));

vi.mock('../../src/modules/orders/orders-history.repository.js', () => ({
  listarPedidosUsuario: mocks.listarPedidosUsuario,
}));

import {
  obtenerDetallePedido,
  obtenerHistorialPedidos,
} from '../../src/modules/orders/orders-history.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('obtenerHistorialPedidos', () => {
  it('devuelve el historial del usuario solicitado', async () => {
    const pedidos = [
      {
        id: '42',
        numero: 'ORD-42',
        estado: 'CONFIRMADO',
        metodoPago: 'CASH',
        total: '15.00',
        cantidadItems: 2,
      },
    ];
    mocks.listarPedidosUsuario.mockResolvedValueOnce(pedidos);

    await expect(obtenerHistorialPedidos('20')).resolves.toEqual(pedidos);
    expect(mocks.listarPedidosUsuario).toHaveBeenCalledWith('20');
  });

  it('devuelve una lista vacía cuando el usuario no tiene pedidos', async () => {
    mocks.listarPedidosUsuario.mockResolvedValueOnce([]);

    await expect(obtenerHistorialPedidos('20')).resolves.toEqual([]);
  });

  it('propaga errores del repositorio', async () => {
    mocks.listarPedidosUsuario.mockRejectedValueOnce(new Error('Error SQL'));

    await expect(obtenerHistorialPedidos('20')).rejects.toThrow('Error SQL');
  });
});

describe('obtenerDetallePedido', () => {
  const pedido = {
    id: '42',
    numero: 'ORD-42',
    estado: 'CONFIRMADO',
    metodoPago: 'CASH',
    subtotal: '15.00',
    total: '15.00',
    notas: null,
    creadoEn: new Date('2026-10-28T12:00:00Z'),
  };

  const items = [
    {
      varianteId: '5',
      producto: 'Alfajor',
      variante: 'Caja de 6',
      sku: 'ALF-006',
      precioUnitario: '7.50',
      cantidad: 2,
      subtotal: '15.00',
    },
  ];

  it('devuelve el pedido junto con sus artículos', async () => {
    mocks.execute
      .mockResolvedValueOnce([[pedido]])
      .mockResolvedValueOnce([items]);

    await expect(obtenerDetallePedido('20', '42')).resolves.toEqual({
      ...pedido,
      items,
    });

    expect(mocks.execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE id = ? AND user_id = ?'),
      ['42', '20'],
    );
    expect(mocks.execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('WHERE order_id = ?'),
      ['42'],
    );
  });

  it('rechaza pedidos inexistentes o pertenecientes a otro usuario', async () => {
    mocks.execute.mockResolvedValueOnce([[]]);

    await expect(
      obtenerDetallePedido('20', '42'),
    ).rejects.toMatchObject({
      status: 404,
      mensajePublico: 'El pedido no existe.',
    });

    expect(mocks.execute).toHaveBeenCalledOnce();
  });

  it('devuelve el pedido aunque no tenga artículos', async () => {
    mocks.execute
      .mockResolvedValueOnce([[pedido]])
      .mockResolvedValueOnce([[]]);

    await expect(obtenerDetallePedido('20', '42')).resolves.toEqual({
      ...pedido,
      items: [],
    });
  });

  it('propaga errores al consultar el pedido', async () => {
    mocks.execute.mockRejectedValueOnce(new Error('Error SQL'));

    await expect(
      obtenerDetallePedido('20', '42'),
    ).rejects.toThrow('Error SQL');
  });

  it('propaga errores al consultar los artículos', async () => {
    mocks.execute
      .mockResolvedValueOnce([[pedido]])
      .mockRejectedValueOnce(new Error('Error de artículos'));

    await expect(
      obtenerDetallePedido('20', '42'),
    ).rejects.toThrow('Error de artículos');
  });
});
