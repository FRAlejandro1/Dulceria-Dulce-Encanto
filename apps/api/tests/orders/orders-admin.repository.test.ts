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
  obtenerVentasPeriodoAdmin,
  obtenerDetallePedidoAdmin,
  obtenerDashboardPedidosAdmin,
  listarClientesPedidosAdmin,
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


  describe('obtenerVentasPeriodoAdmin', () => {
    it.each([
      ['dia', "DATE_FORMAT(created_at, '%H:00')"],
      ['semana', "DATE_FORMAT(created_at, '%Y-%m-%d')"],
      ['mes', 'DAY(created_at)'],
      ['anio', 'MONTH(created_at)'],
      ['personalizado', "DATE_FORMAT(created_at, '%Y-%m-%d')"],
    ] as const)('agrupa las ventas por período %s', async (periodo, agrupacion) => {
      ejecutar.mockResolvedValueOnce([[{ etiqueta: '10', ventas: 100 }]]);

      await expect(
        obtenerVentasPeriodoAdmin(periodo, '2026-01-01', '2026-01-31'),
      ).resolves.toEqual([{ etiqueta: '10', ventas: 100 }]);

      expect(ejecutar.mock.calls[0][0]).toContain(`${agrupacion} AS etiqueta`);
      expect(ejecutar.mock.calls[0][1]).toEqual([
        '2026-01-01',
        '2026-01-31',
      ]);
    });

    it('propaga errores al consultar ventas por período', async () => {
      ejecutar.mockRejectedValueOnce(new Error('Error del período'));

      await expect(
        obtenerVentasPeriodoAdmin('dia', '2026-01-01', '2026-01-31'),
      ).rejects.toThrow('Error del período');
    });
  });

  describe('obtenerDetallePedidoAdmin', () => {
    it('devuelve undefined cuando el pedido no existe', async () => {
      ejecutar.mockResolvedValueOnce([[]]);

      await expect(obtenerDetallePedidoAdmin('99')).resolves.toBeUndefined();
      expect(ejecutar).toHaveBeenCalledOnce();
    });

    it('devuelve el pedido junto con sus artículos', async () => {
      const pedido = { id: '8', numero: 'PED-008', cliente: 'Ana' };
      const items = [{ varianteId: '3', cantidad: 2 }];

      ejecutar
        .mockResolvedValueOnce([[pedido]])
        .mockResolvedValueOnce([items]);

      await expect(obtenerDetallePedidoAdmin('8')).resolves.toEqual({
        ...pedido,
        items,
      });

      expect(ejecutar).toHaveBeenCalledTimes(2);
      expect(ejecutar.mock.calls[0][1]).toEqual(['8']);
      expect(ejecutar.mock.calls[1][1]).toEqual(['8']);
    });

    it('propaga errores al consultar el pedido', async () => {
      ejecutar.mockRejectedValueOnce(new Error('Error del pedido'));

      await expect(obtenerDetallePedidoAdmin('8')).rejects.toThrow(
        'Error del pedido',
      );
    });

    it('propaga errores al consultar los artículos', async () => {
      ejecutar
        .mockResolvedValueOnce([[{ id: '8' }]])
        .mockRejectedValueOnce(new Error('Error de artículos'));

      await expect(obtenerDetallePedidoAdmin('8')).rejects.toThrow(
        'Error de artículos',
      );
    });
  });

  describe('obtenerDashboardPedidosAdmin', () => {
    it('obtiene los indicadores y estados sin filtros opcionales', async () => {
      const indicadores = { pedidosHoy: 2, ventasHoy: 50 };
      const estados = [{ estado: 'CONFIRMADO', cantidad: 2 }];

      ejecutar
        .mockResolvedValueOnce([[indicadores]])
        .mockResolvedValueOnce([estados]);

      await expect(
        obtenerDashboardPedidosAdmin({ periodo: 'mes' }),
      ).resolves.toEqual({ ...indicadores, estados });

      expect(ejecutar).toHaveBeenCalledTimes(2);
      expect(ejecutar.mock.calls[1][1]).toEqual([
        null, null, null, null, null, null,
      ]);
    });

    it('aplica los filtros de fecha y estado', async () => {
      ejecutar
        .mockResolvedValueOnce([[{ pedidosHoy: 1 }]])
        .mockResolvedValueOnce([[]]);

      await obtenerDashboardPedidosAdmin({
        periodo: 'personalizado',
        desde: '2026-01-01',
        hasta: '2026-01-31',
        estado: 'CONFIRMADO',
      });

      expect(ejecutar.mock.calls[1][1]).toEqual([
        '2026-01-01',
        '2026-01-01',
        '2026-01-31',
        '2026-01-31',
        'CONFIRMADO',
        'CONFIRMADO',
      ]);
    });

    it('propaga errores al consultar los indicadores', async () => {
      ejecutar.mockRejectedValueOnce(new Error('Error del dashboard'));

      await expect(
        obtenerDashboardPedidosAdmin({ periodo: 'dia' }),
      ).rejects.toThrow('Error del dashboard');
    });

    it('propaga errores al consultar los estados', async () => {
      ejecutar
        .mockResolvedValueOnce([[{}]])
        .mockRejectedValueOnce(new Error('Error de estados'));

      await expect(
        obtenerDashboardPedidosAdmin({ periodo: 'dia' }),
      ).rejects.toThrow('Error de estados');
    });
  });

  describe('listarClientesPedidosAdmin', () => {
    it('devuelve una lista vacía cuando no hay clientes', async () => {
      ejecutar
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      await expect(
        listarClientesPedidosAdmin({ pagina: 1, limite: 10 }),
      ).resolves.toEqual({
        clientes: [],
        totalClientes: 0,
        pagina: 1,
        limite: 10,
      });

      expect(ejecutar).toHaveBeenCalledTimes(2);
      expect(ejecutar.mock.calls[0][0]).not.toContain('WHERE');
      expect(ejecutar.mock.calls[0][1]).toEqual([10, 0]);
    });

    it('combina filtros, agrupa pedidos y convierte los identificadores', async () => {
      const clientes = [
        { id: 7, nombre: 'Ana', correo: 'ana@example.com', cantidadPedidos: '2' },
        { id: 8, nombre: 'Luis', correo: 'luis@example.com', cantidadPedidos: '1' },
      ];
      const pedidos = [
        { id: '10', usuarioId: 7, numero: 'PED-010' },
        { id: '11', usuarioId: '7', numero: 'PED-011' },
      ];

      ejecutar
        .mockResolvedValueOnce([clientes])
        .mockResolvedValueOnce([[{ totalClientes: '2' }]])
        .mockResolvedValueOnce([pedidos]);

      const resultado = await listarClientesPedidosAdmin({
        estado: 'CONFIRMADO',
        desde: '2026-01-01',
        hasta: '2026-01-31',
        busqueda: ' Ana ',
        pagina: 2,
        limite: 5,
      });

      expect(resultado).toEqual({
        clientes: [
          { ...clientes[0], id: '7', cantidadPedidos: 2, pedidos },
          { ...clientes[1], id: '8', cantidadPedidos: 1, pedidos: [] },
        ],
        totalClientes: 2,
        pagina: 2,
        limite: 5,
      });

      const [sql, parametros] = ejecutar.mock.calls[0];
      expect(sql).toContain('o.status = ?');
      expect(sql).toContain('o.created_at >= ?');
      expect(sql).toContain('DATE_ADD(?, INTERVAL 1 DAY)');
      expect(sql).toContain('u.name LIKE ? OR u.email LIKE ?');
      expect(parametros).toEqual([
        'CONFIRMADO',
        '2026-01-01 00:00:00',
        '2026-01-31',
        '%Ana%',
        '%Ana%',
        5,
        5,
      ]);

      expect(ejecutar.mock.calls[2][0]).toContain('o.user_id IN (?, ?)');
      expect(ejecutar.mock.calls[2][1]).toEqual([
        'CONFIRMADO',
        '2026-01-01 00:00:00',
        '2026-01-31',
        '%Ana%',
        '%Ana%',
        '7',
        '8',
      ]);
    });

    it('usa cero cuando el conteo no devuelve filas', async () => {
      ejecutar
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      const resultado = await listarClientesPedidosAdmin({
        pagina: 1,
        limite: 10,
      });

      expect(resultado.totalClientes).toBe(0);
    });


    it('usa cero cuando la fila de conteo no contiene totalClientes', async () => {
      ejecutar
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{}]]);

      const resultado = await listarClientesPedidosAdmin({
        pagina: 1,
        limite: 10,
      });

      expect(resultado.totalClientes).toBe(0);
    });
    it('propaga errores al consultar clientes', async () => {
      ejecutar.mockRejectedValueOnce(new Error('Error de clientes'));

      await expect(
        listarClientesPedidosAdmin({ pagina: 1, limite: 10 }),
      ).rejects.toThrow('Error de clientes');
    });

    it('propaga errores al consultar el conteo', async () => {
      ejecutar
        .mockResolvedValueOnce([[{ id: '7' }]])
        .mockRejectedValueOnce(new Error('Error del conteo'));

      await expect(
        listarClientesPedidosAdmin({ pagina: 1, limite: 10 }),
      ).rejects.toThrow('Error del conteo');
    });

    it('propaga errores al consultar los pedidos de los clientes', async () => {
      ejecutar
        .mockResolvedValueOnce([[{ id: '7' }]])
        .mockResolvedValueOnce([[{ totalClientes: 1 }]])
        .mockRejectedValueOnce(new Error('Error de pedidos'));

      await expect(
        listarClientesPedidosAdmin({ pagina: 1, limite: 10 }),
      ).rejects.toThrow('Error de pedidos');
    });
  });
