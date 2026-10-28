import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
}));

vi.mock('../../src/config/database.js', () => ({
  pool: { execute: mocks.execute },
}));

import { notificarPedidoCreado } from '../../src/modules/orders/orders-notifications.repository.js';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.execute.mockResolvedValue([{ affectedRows: 1 }]);
});

describe('notificarPedidoCreado', () => {
  const conexion = { execute: mocks.execute } as never;
  const datos = {
    pedidoId: '42',
    numero: 'ORD-20261028-ABC123',
    usuarioId: '20',
    total: 15.5,
  };

  it('crea una notificación para el cliente', async () => {
    await notificarPedidoCreado(conexion, datos);

    expect(mocks.execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT IGNORE INTO notifications'),
      [
        '20',
        '42',
        'order:42:created',
        'Pedido recibido',
        'Tu pedido ORD-20261028-ABC123 fue recibido y está pendiente de confirmación.',
      ],
    );
  });

  it('crea notificaciones para los administradores activos', async () => {
    await notificarPedidoCreado(conexion, datos);

    expect(mocks.execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("WHERE role = 'ADMIN'"),
      [
        '42',
        'order:42:created',
        'Nuevo pedido recibido',
        'El pedido ORD-20261028-ABC123 fue registrado por un total de 15.50.',
      ],
    );
    expect(mocks.execute.mock.calls[1][0]).toContain('is_active = 1');
  });

  it('formatea el total con dos decimales', async () => {
    await notificarPedidoCreado(conexion, { ...datos, total: 7 });

    expect(mocks.execute.mock.calls[1][1]).toContain(
      'El pedido ORD-20261028-ABC123 fue registrado por un total de 7.00.',
    );
  });

  it('propaga errores al guardar la notificación del cliente', async () => {
    mocks.execute.mockRejectedValueOnce(new Error('Error SQL'));

    await expect(notificarPedidoCreado(conexion, datos)).rejects.toThrow('Error SQL');
    expect(mocks.execute).toHaveBeenCalledOnce();
  });

  it('propaga errores al guardar las notificaciones administrativas', async () => {
    mocks.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockRejectedValueOnce(new Error('Error SQL'));

    await expect(notificarPedidoCreado(conexion, datos)).rejects.toThrow('Error SQL');
    expect(mocks.execute).toHaveBeenCalledTimes(2);
  });
});
