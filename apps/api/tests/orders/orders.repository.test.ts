import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
}));

import type { PoolConnection } from 'mysql2/promise';

import {
  crearDetallePedido,
  crearRegistroPedido,
  obtenerVariantesParaPedido,
  registrarReserva,
  reservarInventario,
} from '../../src/modules/orders/orders.repository.js';

const conexion = { execute: mocks.execute } as unknown as PoolConnection;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.execute.mockResolvedValue([{ insertId: 42, affectedRows: 1 }]);
});

describe('obtenerVariantesParaPedido', () => {
  it('consulta las variantes solicitadas con bloqueo de filas', async () => {
    const variantes = [{ varianteId: '5', precio: '7.50' }];
    mocks.execute.mockResolvedValueOnce([variantes]);

    await expect(obtenerVariantesParaPedido(conexion, ['5', '6']))
      .resolves.toEqual(variantes);

    expect(mocks.execute).toHaveBeenCalledWith(
      expect.stringContaining('WHERE pv.id IN (?, ?)'),
      ['5', '6'],
    );
    expect(mocks.execute.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(mocks.execute.mock.calls[0][0]).toContain('ORDER BY pv.id');
  });

  it('maneja una lista vacía de identificadores', async () => {
    mocks.execute.mockResolvedValueOnce([[]]);

    await expect(obtenerVariantesParaPedido(conexion, [])).resolves.toEqual([]);
    expect(mocks.execute).toHaveBeenCalledWith(
      expect.stringContaining('WHERE pv.id IN ()'),
      [],
    );
  });

  it('propaga errores de consulta', async () => {
    mocks.execute.mockRejectedValueOnce(new Error('Error SQL'));

    await expect(obtenerVariantesParaPedido(conexion, ['5']))
      .rejects.toThrow('Error SQL');
  });
});

describe('crearRegistroPedido', () => {
  it('inserta el pedido y devuelve su identificador como texto', async () => {
    const datos = {
      numero: 'ORD-20261028-ABC123',
      usuarioId: '20',
      metodoPago: 'CASH' as const,
      subtotal: 15.5,
      notas: null,
    };

    await expect(crearRegistroPedido(conexion, datos)).resolves.toBe('42');

    expect(mocks.execute).toHaveBeenCalledWith(
      expect.stringContaining("'PENDIENTE_CONFIRMACION'"),
      [
        datos.numero,
        datos.usuarioId,
        datos.metodoPago,
        datos.subtotal,
        datos.subtotal,
        datos.notas,
      ],
    );
  });

  it('guarda el método de transferencia y las notas', async () => {
    const datos = {
      numero: 'ORD-002',
      usuarioId: '21',
      metodoPago: 'TRANSFER' as const,
      subtotal: 20,
      notas: 'Entregar por la tarde',
    };

    await crearRegistroPedido(conexion, datos);

    expect(mocks.execute.mock.calls[0][1]).toContain('TRANSFER');
    expect(mocks.execute.mock.calls[0][1]).toContain('Entregar por la tarde');
  });

  it('propaga errores de inserción', async () => {
    mocks.execute.mockRejectedValueOnce(new Error('Error SQL'));

    await expect(crearRegistroPedido(conexion, {
      numero: 'ORD-003',
      usuarioId: '20',
      metodoPago: 'CASH',
      subtotal: 10,
      notas: null,
    })).rejects.toThrow('Error SQL');
  });
});

describe('crearDetallePedido', () => {
  const datos = {
    pedidoId: '42',
    varianteId: '5',
    productoNombre: 'Alfajor',
    varianteNombre: 'Caja de 6',
    sku: 'ALF-006',
    precio: 7.5,
    cantidad: 2,
  };

  it('inserta una instantánea del artículo y calcula el subtotal', async () => {
    await crearDetallePedido(conexion, datos);

    expect(mocks.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO order_items'),
      ['42', '5', 'Alfajor', 'Caja de 6', 'ALF-006', 7.5, 2, 15],
    );
  });

  it('propaga errores de inserción', async () => {
    mocks.execute.mockRejectedValueOnce(new Error('Error SQL'));

    await expect(crearDetallePedido(conexion, datos)).rejects.toThrow('Error SQL');
  });
});

describe('reservarInventario', () => {
  it('incrementa el stock reservado de la variante', async () => {
    await reservarInventario(conexion, '5', 3);

    expect(mocks.execute).toHaveBeenCalledWith(
      expect.stringContaining('stock_reserved = stock_reserved + ?'),
      [3, '5'],
    );
  });

  it('propaga errores al reservar inventario', async () => {
    mocks.execute.mockRejectedValueOnce(new Error('Error SQL'));

    await expect(reservarInventario(conexion, '5', 3)).rejects.toThrow('Error SQL');
  });
});

describe('registrarReserva', () => {
  const datos = {
    varianteId: '5',
    pedidoId: '42',
    cantidad: 2,
    stockFisico: 10,
    stockReservado: 3,
    usuarioId: '20',
  };

  it('registra el movimiento y los valores del inventario antes y después', async () => {
    await registrarReserva(conexion, datos);

    expect(mocks.execute).toHaveBeenCalledWith(
      expect.stringContaining("'RESERVATION'"),
      ['5', '42', 2, 10, 10, 3, 5, 'Reserva por creación de pedido', '20'],
    );
  });

  it('propaga errores al registrar el movimiento', async () => {
    mocks.execute.mockRejectedValueOnce(new Error('Error SQL'));

    await expect(registrarReserva(conexion, datos)).rejects.toThrow('Error SQL');
  });
});
