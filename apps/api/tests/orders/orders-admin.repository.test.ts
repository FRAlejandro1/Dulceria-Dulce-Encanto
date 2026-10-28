import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ejecutar } = vi.hoisted(() => ({
  ejecutar: vi.fn(),
}));

vi.mock('../../src/config/database.js', () => ({
  pool: { execute: ejecutar },
}));

import {
  actualizarEstadoPedidoAdmin,
  actualizarInventarioPedidoAdmin,
  bloquearPedidoAdmin,
  listarPedidosAdmin,
  obtenerItemsInventarioPedido,
  obtenerVentasMensualesAdmin,
} from '../../src/modules/orders/orders-admin.repository.js';

describe('orders-admin.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista pedidos sin filtros y calcula la paginación', async () => {
    ejecutar
      .mockResolvedValueOnce([[{ id: '1' }]])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const resultado = await listarPedidosAdmin({ pagina: 2, limite: 10 });

    expect(resultado).toEqual({
      pedidos: [{ id: '1' }],
      total: 1,
      pagina: 2,
      limite: 10,
    });

    expect(ejecutar.mock.calls[0][0]).not.toContain('WHERE');
    expect(ejecutar.mock.calls[0][1]).toEqual([10, 10]);
    expect(ejecutar.mock.calls[1][1]).toEqual([]);
  });

  it('combina todos los filtros administrativos', async () => {
    ejecutar
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 0 }]]);

    await listarPedidosAdmin({
      estado: 'PENDIENTE_CONFIRMACION',
      usuarioId: '7',
      desde: '2026-01-01',
      hasta: '2026-01-31',
      pagina: 1,
      limite: 20,
    });

    const [sql, parametros] = ejecutar.mock.calls[0];

    expect(sql).toContain('o.status = ?');
    expect(sql).toContain('o.user_id = ?');
    expect(sql).toContain('o.created_at >= ?');
    expect(sql).toContain('DATE_ADD(?, INTERVAL 1 DAY)');
    expect(parametros).toEqual([
      'PENDIENTE_CONFIRMACION',
      '7',
      '2026-01-01 00:00:00',
      '2026-01-31',
      20,
      0,
    ]);
    expect(ejecutar.mock.calls[1][1]).toEqual([
      'PENDIENTE_CONFIRMACION',
      '7',
      '2026-01-01 00:00:00',
      '2026-01-31',
    ]);
  });

  it('devuelve total cero si la consulta de conteo no contiene filas', async () => {
    ejecutar
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const resultado = await listarPedidosAdmin({ pagina: 1, limite: 5 });

    expect(resultado.total).toBe(0);
    expect(resultado.pedidos).toEqual([]);
  });

  it('propaga errores al listar pedidos', async () => {
    ejecutar.mockRejectedValueOnce(new Error('Error al listar'));

    await expect(
      listarPedidosAdmin({ pagina: 1, limite: 10 }),
    ).rejects.toThrow('Error al listar');
  });

  it('consulta ventas mensuales por año', async () => {
    ejecutar.mockResolvedValueOnce([[{ mes: 1, ventas: 150 }]]);

    await expect(obtenerVentasMensualesAdmin(2026)).resolves.toEqual([
      { mes: 1, ventas: 150 },
    ]);

    expect(ejecutar.mock.calls[0][0]).toContain("status = 'CONFIRMADO'");
    expect(ejecutar.mock.calls[0][1]).toEqual([2026]);
  });

  it('propaga errores al consultar ventas', async () => {
    ejecutar.mockRejectedValueOnce(new Error('Error de ventas'));

    await expect(obtenerVentasMensualesAdmin(2026)).rejects.toThrow(
      'Error de ventas',
    );
  });

  it('bloquea un pedido existente', async () => {
    const conexion = {
      execute: vi.fn().mockResolvedValueOnce([[{ id: '8', estado: 'PENDIENTE' }]]),
    };

    await expect(bloquearPedidoAdmin(conexion as never, '8')).resolves.toEqual({
      id: '8',
      estado: 'PENDIENTE',
    });

    expect(conexion.execute.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(conexion.execute.mock.calls[0][1]).toEqual(['8']);
  });

  it('devuelve undefined si el pedido no existe', async () => {
    const conexion = {
      execute: vi.fn().mockResolvedValueOnce([[]]),
    };

    await expect(bloquearPedidoAdmin(conexion as never, '99')).resolves.toBeUndefined();
  });

  it('propaga errores al bloquear un pedido', async () => {
    const conexion = {
      execute: vi.fn().mockRejectedValueOnce(new Error('Error de bloqueo')),
    };

    await expect(
      bloquearPedidoAdmin(conexion as never, '8'),
    ).rejects.toThrow('Error de bloqueo');
  });

  it('consulta los artículos de inventario del pedido', async () => {
    const items = [{ varianteId: '3', cantidad: 2 }];
    const conexion = {
      execute: vi.fn().mockResolvedValueOnce([items]),
    };

    await expect(
      obtenerItemsInventarioPedido(conexion as never, '8'),
    ).resolves.toEqual(items);

    expect(conexion.execute.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(conexion.execute.mock.calls[0][1]).toEqual(['8']);
  });

  it('actualiza el estado del pedido', async () => {
    const conexion = { execute: vi.fn().mockResolvedValueOnce([{}]) };

    await actualizarEstadoPedidoAdmin(conexion as never, '8', 'CONFIRMADO');

    expect(conexion.execute.mock.calls[0][0]).toContain('UPDATE orders');
    expect(conexion.execute.mock.calls[0][1]).toEqual(['CONFIRMADO', '8']);
  });

  it('actualiza inventario al confirmar y registra una venta', async () => {
    const conexion = {
      execute: vi.fn()
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{}]),
    };

    await actualizarInventarioPedidoAdmin(conexion as never, {
      varianteId: '3',
      pedidoId: '8',
      cantidad: 2,
      stockFisico: 10,
      stockReservado: 4,
      estado: 'CONFIRMADO',
      administradorId: '1',
    });

    expect(conexion.execute.mock.calls[0][1]).toEqual([8, 2, '3', 10, 4]);
    expect(conexion.execute.mock.calls[1][0]).toContain('inventory_movements');
    expect(conexion.execute.mock.calls[1][1][2]).toBe('SALE');
  });

  it.each(['RECHAZADO', 'CANCELADO'] as const)(
    'libera la reserva cuando el pedido está %s',
    async (estado) => {
      const conexion = {
        execute: vi.fn()
          .mockResolvedValueOnce([{ affectedRows: 1 }])
          .mockResolvedValueOnce([{}]),
      };

      await actualizarInventarioPedidoAdmin(conexion as never, {
        varianteId: '3',
        pedidoId: '8',
        cantidad: 2,
        stockFisico: 10,
        stockReservado: 4,
        estado,
        administradorId: '1',
      });

      expect(conexion.execute.mock.calls[0][1]).toEqual([10, 2, '3', 10, 4]);
      expect(conexion.execute.mock.calls[1][1][2]).toBe('RELEASE');
    },
  );

  it('rechaza inventario reservado insuficiente', async () => {
    const conexion = { execute: vi.fn() };

    await expect(
      actualizarInventarioPedidoAdmin(conexion as never, {
        varianteId: '3',
        pedidoId: '8',
        cantidad: 5,
        stockFisico: 10,
        stockReservado: 2,
        estado: 'RECHAZADO',
        administradorId: '1',
      }),
    ).rejects.toThrow('Inventario inconsistente');

    expect(conexion.execute).not.toHaveBeenCalled();
  });

  it('rechaza stock físico insuficiente al confirmar', async () => {
    const conexion = { execute: vi.fn() };

    await expect(
      actualizarInventarioPedidoAdmin(conexion as never, {
        varianteId: '3',
        pedidoId: '8',
        cantidad: 5,
        stockFisico: 2,
        stockReservado: 5,
        estado: 'CONFIRMADO',
        administradorId: '1',
      }),
    ).rejects.toThrow('Inventario inconsistente');

    expect(conexion.execute).not.toHaveBeenCalled();
  });

  it('detecta conflictos al actualizar el inventario', async () => {
    const conexion = {
      execute: vi.fn().mockResolvedValueOnce([{ affectedRows: 0 }]),
    };

    await expect(
      actualizarInventarioPedidoAdmin(conexion as never, {
        varianteId: '3',
        pedidoId: '8',
        cantidad: 2,
        stockFisico: 10,
        stockReservado: 4,
        estado: 'CONFIRMADO',
        administradorId: '1',
      }),
    ).rejects.toThrow('No se pudo actualizar el inventario');

    expect(conexion.execute).toHaveBeenCalledOnce();
  });

  it('propaga errores de la actualización del inventario', async () => {
    const conexion = {
      execute: vi.fn().mockRejectedValueOnce(new Error('Error SQL')),
    };

    await expect(
      actualizarInventarioPedidoAdmin(conexion as never, {
        varianteId: '3',
        pedidoId: '8',
        cantidad: 2,
        stockFisico: 10,
        stockReservado: 4,
        estado: 'CONFIRMADO',
        administradorId: '1',
      }),
    ).rejects.toThrow('Error SQL');
  });

  it('propaga errores al registrar el movimiento de inventario', async () => {
    const conexion = {
      execute: vi.fn()
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockRejectedValueOnce(new Error('Error al registrar movimiento')),
    };

    await expect(
      actualizarInventarioPedidoAdmin(conexion as never, {
        varianteId: '3',
        pedidoId: '8',
        cantidad: 2,
        stockFisico: 10,
        stockReservado: 4,
        estado: 'CONFIRMADO',
        administradorId: '1',
      }),
    ).rejects.toThrow('Error al registrar movimiento');
  });
});
