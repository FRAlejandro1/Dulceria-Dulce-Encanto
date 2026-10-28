import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ejecutar } = vi.hoisted(() => ({
  ejecutar: vi.fn(),
}));

vi.mock('../../src/config/database.js', () => ({
  pool: { execute: ejecutar },
}));

import { listarPedidosUsuario } from '../../src/modules/orders/orders-history.repository.js';

describe('orders-history.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista los pedidos del usuario ordenados por fecha', async () => {
    const pedidos = [
      { id: '2', numero: 'ORD-2', cantidadItems: 2 },
      { id: '1', numero: 'ORD-1', cantidadItems: 1 },
    ];
    ejecutar.mockResolvedValueOnce([pedidos]);

    const resultado = await listarPedidosUsuario('15');

    expect(resultado).toEqual(pedidos);
    expect(ejecutar).toHaveBeenCalledOnce();

    const [sql, parametros] = ejecutar.mock.calls[0];
    expect(sql).toContain('WHERE o.user_id = ?');
    expect(sql).toContain('LEFT JOIN order_items');
    expect(sql).toContain('COUNT(oi.id)');
    expect(sql).toContain('ORDER BY o.created_at DESC, o.id DESC');
    expect(parametros).toEqual(['15']);
  });

  it('devuelve una lista vacía cuando el usuario no tiene pedidos', async () => {
    ejecutar.mockResolvedValueOnce([[]]);

    await expect(listarPedidosUsuario('20')).resolves.toEqual([]);
  });

  it('propaga los errores de la base de datos', async () => {
    ejecutar.mockRejectedValueOnce(new Error('Error SQL'));

    await expect(listarPedidosUsuario('30')).rejects.toThrow('Error SQL');
  });

  it('permite utilizar una conexión proporcionada', async () => {
    const conexion = {
      execute: vi.fn().mockResolvedValueOnce([[{ id: '9' }]]),
    };

    const resultado = await listarPedidosUsuario(
      '40',
      conexion as never,
    );

    expect(resultado).toEqual([{ id: '9' }]);
    expect(conexion.execute).toHaveBeenCalledOnce();
    expect(ejecutar).not.toHaveBeenCalled();
  });
});