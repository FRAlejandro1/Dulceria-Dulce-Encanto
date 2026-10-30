import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  registrarAuditoria: vi.fn(),
  ejecutarTransaccion: vi.fn(),
  actualizarEstadoPedidoAdmin: vi.fn(),
  actualizarInventarioPedidoAdmin: vi.fn(),
  bloquearPedidoAdmin: vi.fn(),
  listarPedidosAdmin: vi.fn(),
  obtenerItemsInventarioPedido: vi.fn(),
  obtenerVentasMensualesAdmin: vi.fn(),
  obtenerDetallePedidoAdmin: vi.fn(),
  obtenerDashboardPedidosAdmin: vi.fn(),
  listarClientesPedidosAdmin: vi.fn(),
}));

vi.mock('../../src/modules/audit/audit.repository.js', () => ({
  registrarAuditoria: mocks.registrarAuditoria,
}));

vi.mock('../../src/shared/database/transaction.js', () => ({
  ejecutarTransaccion: mocks.ejecutarTransaccion,
}));

vi.mock('../../src/modules/orders/orders-admin.repository.js', () => ({
  actualizarEstadoPedidoAdmin: mocks.actualizarEstadoPedidoAdmin,
  actualizarInventarioPedidoAdmin: mocks.actualizarInventarioPedidoAdmin,
  bloquearPedidoAdmin: mocks.bloquearPedidoAdmin,
  listarPedidosAdmin: mocks.listarPedidosAdmin,
  obtenerItemsInventarioPedido: mocks.obtenerItemsInventarioPedido,
  obtenerVentasMensualesAdmin: mocks.obtenerVentasMensualesAdmin,
  obtenerDetallePedidoAdmin: mocks.obtenerDetallePedidoAdmin,
  obtenerDashboardPedidosAdmin: mocks.obtenerDashboardPedidosAdmin,
  listarClientesPedidosAdmin: mocks.listarClientesPedidosAdmin,
}));

import {
  cambiarEstadoPedidoAdmin,
  consultarPedidosAdmin,
  consultarVentasMensualesAdmin,
  consultarDetallePedidoAdmin,
  consultarDashboardPedidosAdmin,
  consultarClientesPedidosAdmin,
} from '../../src/modules/orders/orders-admin.service.js';

const conexion = {} as never;

const pedido = {
  id: '42',
  numero: 'ORD-20261028-ABC123',
  usuarioId: '20',
  estado: 'PENDIENTE_CONFIRMACION',
};

const item = {
  varianteId: '5',
  cantidad: 2,
  stockFisico: 10,
  stockReservado: 2,
};

function configurarTransaccion() {
  mocks.ejecutarTransaccion.mockImplementation(
    async (operacion: (conexion: never) => Promise<unknown>) =>
      operacion(conexion),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  configurarTransaccion();

  mocks.listarPedidosAdmin.mockResolvedValue({
    pedidos: [],
    total: 0,
    pagina: 1,
    limite: 20,
  });

  mocks.obtenerVentasMensualesAdmin.mockResolvedValue([]);
  mocks.obtenerDetallePedidoAdmin.mockResolvedValue(undefined);
  mocks.obtenerDashboardPedidosAdmin.mockResolvedValue({ estados: [] });
  mocks.listarClientesPedidosAdmin.mockResolvedValue({ clientes: [], totalClientes: 0, pagina: 1, limite: 8 });
  mocks.bloquearPedidoAdmin.mockResolvedValue({ ...pedido });
  mocks.obtenerItemsInventarioPedido.mockResolvedValue([{ ...item }]);
  mocks.actualizarInventarioPedidoAdmin.mockResolvedValue(undefined);
  mocks.actualizarEstadoPedidoAdmin.mockResolvedValue(undefined);
  mocks.registrarAuditoria.mockResolvedValue(undefined);
});

describe('consultarPedidosAdmin', () => {
  it('aplica valores predeterminados', async () => {
    await consultarPedidosAdmin({});

    expect(mocks.listarPedidosAdmin).toHaveBeenCalledWith({
      pagina: 1,
      limite: 20,
    });
  });

  it('acepta filtros válidos y convierte paginaciÃ³n', async () => {
    await consultarPedidosAdmin({
      estado: 'CONFIRMADO',
      usuarioId: '20',
      desde: '2026-01-01',
      hasta: '2026-12-31',
      pagina: '2',
      limite: '50',
    });

    expect(mocks.listarPedidosAdmin).toHaveBeenCalledWith({
      estado: 'CONFIRMADO',
      usuarioId: '20',
      desde: '2026-01-01',
      hasta: '2026-12-31',
      pagina: 2,
      limite: 50,
    });
  });

  it.each([
    { estado: 'DESCONOCIDO' },
    { usuarioId: 'abc' },
    { desde: '2026-02-30' },
    { desde: '2026-12-31', hasta: '2026-01-01' },
    { pagina: 0 },
    { limite: 101 },
    null,
  ])('rechaza filtros inválidos: %o', async (entrada) => {
    await expect(consultarPedidosAdmin(entrada)).rejects.toMatchObject({
      status: 400,
      mensajePublico: 'Los filtros de pedidos no son válidos.',
    });

    expect(mocks.listarPedidosAdmin).not.toHaveBeenCalled();
  });

  it('propaga errores del repositorio', async () => {
    mocks.listarPedidosAdmin.mockRejectedValueOnce(new Error('Error SQL'));

    await expect(consultarPedidosAdmin({})).rejects.toThrow('Error SQL');
  });
});

describe('consultarVentasMensualesAdmin', () => {
  it('consulta ventas para un año vÃ¡lido', async () => {
    const ventas = [{ mes: 1, cantidadPedidos: 3, ventas: 75 }];
    mocks.obtenerVentasMensualesAdmin.mockResolvedValueOnce(ventas);

    await expect(consultarVentasMensualesAdmin({ anio: '2026' }))
      .resolves.toEqual(ventas);

    expect(mocks.obtenerVentasMensualesAdmin).toHaveBeenCalledWith(2026);
  });

  it.each([
    {},
    { anio: 'abc' },
    { anio: 1999 },
    { anio: 2101 },
    { anio: 2026.5 },
    null,
  ])('rechaza un año invÃ¡lido: %o', async (entrada) => {
    await expect(consultarVentasMensualesAdmin(entrada)).rejects.toMatchObject({
      status: 400,
      mensajePublico: 'El año solicitado no es válido.',
    });

    expect(mocks.obtenerVentasMensualesAdmin).not.toHaveBeenCalled();
  });

  it('propaga errores del repositorio', async () => {
    mocks.obtenerVentasMensualesAdmin.mockRejectedValueOnce(new Error('Error SQL'));

    await expect(
      consultarVentasMensualesAdmin({ anio: 2026 }),
    ).rejects.toThrow('Error SQL');
  });
});

describe('cambiarEstadoPedidoAdmin', () => {
  it('confirma un pedido, actualiza inventario y registra auditorÃ­a', async () => {
    await expect(
      cambiarEstadoPedidoAdmin('7', '42', 'CONFIRMADO'),
    ).resolves.toEqual({
      id: '42',
      numero: pedido.numero,
      estado: 'CONFIRMADO',
    });

    expect(mocks.ejecutarTransaccion).toHaveBeenCalledOnce();
    expect(mocks.bloquearPedidoAdmin).toHaveBeenCalledWith(conexion, '42');
    expect(mocks.obtenerItemsInventarioPedido).toHaveBeenCalledWith(conexion, '42');
    expect(mocks.actualizarInventarioPedidoAdmin).toHaveBeenCalledWith(
      conexion,
      {
        varianteId: '5',
        pedidoId: '42',
        cantidad: 2,
        stockFisico: 10,
        stockReservado: 2,
        estado: 'CONFIRMADO',
        administradorId: '7',
      },
    );
    expect(mocks.actualizarEstadoPedidoAdmin).toHaveBeenCalledWith(
      conexion,
      '42',
      'CONFIRMADO',
    );
    expect(mocks.registrarAuditoria).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        actorUserId: '7',
        action: 'ORDER_STATUS_CHANGED',
        entityId: '42',
      }),
    );
  });

  it.each(['RECHAZADO', 'CANCELADO'])(
    'procesa un pedido con estado %s',
    async (estado) => {
      await expect(
        cambiarEstadoPedidoAdmin('7', '42', estado),
      ).resolves.toMatchObject({ estado });

      expect(mocks.actualizarEstadoPedidoAdmin).toHaveBeenCalledWith(
        conexion,
        '42',
        estado,
      );
    },
  );

  it('rechaza un identificador no numÃ©rico', async () => {
    await expect(
      cambiarEstadoPedidoAdmin('7', 'abc', 'CONFIRMADO'),
    ).rejects.toMatchObject({ status: 400 });

    expect(mocks.ejecutarTransaccion).not.toHaveBeenCalled();
  });

  it('rechaza un estado no permitido', async () => {
    await expect(
      cambiarEstadoPedidoAdmin('7', '42', 'PENDIENTE_CONFIRMACION'),
    ).rejects.toMatchObject({ status: 400 });

    expect(mocks.ejecutarTransaccion).not.toHaveBeenCalled();
  });

  it('rechaza un pedido inexistente', async () => {
    mocks.bloquearPedidoAdmin.mockResolvedValueOnce(undefined);

    await expect(
      cambiarEstadoPedidoAdmin('7', '42', 'CONFIRMADO'),
    ).rejects.toMatchObject({ status: 404 });

    expect(mocks.obtenerItemsInventarioPedido).not.toHaveBeenCalled();
  });

  it('rechaza pedidos que ya fueron procesados', async () => {
    mocks.bloquearPedidoAdmin.mockResolvedValueOnce({
      ...pedido,
      estado: 'CONFIRMADO',
    });

    await expect(
      cambiarEstadoPedidoAdmin('7', '42', 'CANCELADO'),
    ).rejects.toMatchObject({ status: 409 });

    expect(mocks.actualizarEstadoPedidoAdmin).not.toHaveBeenCalled();
  });

  it('rechaza pedidos sin artÃ­culos', async () => {
    mocks.obtenerItemsInventarioPedido.mockResolvedValueOnce([]);

    await expect(
      cambiarEstadoPedidoAdmin('7', '42', 'CONFIRMADO'),
    ).rejects.toMatchObject({ status: 409 });

    expect(mocks.actualizarEstadoPedidoAdmin).not.toHaveBeenCalled();
  });

  it.each([
    { ...item, stockReservado: 1 },
    { ...item, stockFisico: 1 },
  ])('rechaza inventario insuficiente al confirmar: %o', async (inventario) => {
    mocks.obtenerItemsInventarioPedido.mockResolvedValueOnce([inventario]);

    await expect(
      cambiarEstadoPedidoAdmin('7', '42', 'CONFIRMADO'),
    ).rejects.toMatchObject({ status: 409 });

    expect(mocks.actualizarInventarioPedidoAdmin).not.toHaveBeenCalled();
    expect(mocks.actualizarEstadoPedidoAdmin).not.toHaveBeenCalled();
  });

  it('rechaza una reserva insuficiente al cancelar', async () => {
    mocks.obtenerItemsInventarioPedido.mockResolvedValueOnce([
      { ...item, stockReservado: 1 },
    ]);

    await expect(
      cambiarEstadoPedidoAdmin('7', '42', 'CANCELADO'),
    ).rejects.toMatchObject({ status: 409 });

    expect(mocks.actualizarEstadoPedidoAdmin).not.toHaveBeenCalled();
  });

  it('procesa todos los artÃ­culos antes de actualizar el estado', async () => {
    mocks.obtenerItemsInventarioPedido.mockResolvedValueOnce([
      { ...item, varianteId: '5' },
      { ...item, varianteId: '6', cantidad: 1, stockReservado: 1 },
    ]);

    await cambiarEstadoPedidoAdmin('7', '42', 'CONFIRMADO');

    expect(mocks.actualizarInventarioPedidoAdmin).toHaveBeenCalledTimes(2);
    expect(mocks.actualizarEstadoPedidoAdmin).toHaveBeenCalledOnce();
  });

  it('propaga errores de la transacciÃ³n', async () => {
    mocks.ejecutarTransaccion.mockRejectedValueOnce(new Error('Error transaccional'));

    await expect(
      cambiarEstadoPedidoAdmin('7', '42', 'CONFIRMADO'),
    ).rejects.toThrow('Error transaccional');
  });

  it('propaga errores al registrar auditorÃ­a', async () => {
    mocks.registrarAuditoria.mockRejectedValueOnce(new Error('Error de auditorÃ­a'));

    await expect(
      cambiarEstadoPedidoAdmin('7', '42', 'CONFIRMADO'),
    ).rejects.toThrow('Error de auditorÃ­a');
  });
});


describe('consultarDetallePedidoAdmin', () => {
  it('rechaza identificadores no numéricos', async () => {
    await expect(consultarDetallePedidoAdmin('abc'))
      .rejects.toMatchObject({ status: 400 });

    expect(mocks.obtenerDetallePedidoAdmin).not.toHaveBeenCalled();
  });

  it('rechaza pedidos inexistentes', async () => {
    mocks.obtenerDetallePedidoAdmin.mockResolvedValueOnce(undefined);

    await expect(consultarDetallePedidoAdmin('42'))
      .rejects.toMatchObject({ status: 404 });
  });

  it('devuelve el detalle del pedido', async () => {
    const detalle = { ...pedido, items: [{ varianteId: '5', cantidad: 2 }] };
    mocks.obtenerDetallePedidoAdmin.mockResolvedValueOnce(detalle);

    await expect(consultarDetallePedidoAdmin('42')).resolves.toEqual(detalle);
    expect(mocks.obtenerDetallePedidoAdmin).toHaveBeenCalledWith('42');
  });

  it('propaga errores del repositorio', async () => {
    mocks.obtenerDetallePedidoAdmin.mockRejectedValueOnce(new Error('Error SQL'));

    await expect(consultarDetallePedidoAdmin('42')).rejects.toThrow('Error SQL');
  });
});

describe('consultarDashboardPedidosAdmin', () => {
  it('aplica el período anual predeterminado', async () => {
    await consultarDashboardPedidosAdmin({});

    expect(mocks.obtenerDashboardPedidosAdmin).toHaveBeenCalledWith({
      periodo: 'anio',
    });
  });

  it('acepta filtros válidos y un período personalizado', async () => {
    await consultarDashboardPedidosAdmin({
      periodo: 'personalizado',
      desde: '2026-01-01',
      hasta: '2026-01-31',
      estado: 'CONFIRMADO',
    });

    expect(mocks.obtenerDashboardPedidosAdmin).toHaveBeenCalledWith({
      periodo: 'personalizado',
      desde: '2026-01-01',
      hasta: '2026-01-31',
      estado: 'CONFIRMADO',
    });
  });

  it.each([
    { periodo: 'desconocido' },
    { desde: '2026-02-30' },
    { desde: '2026-12-31', hasta: '2026-01-01' },
    { periodo: 'personalizado' },
    { periodo: 'personalizado', desde: '2026-01-01' },
    null,
  ])('rechaza filtros inválidos: %o', async (entrada) => {
    await expect(consultarDashboardPedidosAdmin(entrada))
      .rejects.toMatchObject({ status: 400 });

    expect(mocks.obtenerDashboardPedidosAdmin).not.toHaveBeenCalled();
  });

  it('propaga errores del repositorio', async () => {
    mocks.obtenerDashboardPedidosAdmin.mockRejectedValueOnce(
      new Error('Error del dashboard'),
    );

    await expect(consultarDashboardPedidosAdmin({}))
      .rejects.toThrow('Error del dashboard');
  });
});

describe('consultarClientesPedidosAdmin', () => {
  it('aplica valores predeterminados', async () => {
    await consultarClientesPedidosAdmin({});

    expect(mocks.listarClientesPedidosAdmin).toHaveBeenCalledWith({
      pagina: 1,
      limite: 8,
    });
  });

  it('acepta filtros válidos y convierte la paginación', async () => {
    await consultarClientesPedidosAdmin({
      estado: 'CONFIRMADO',
      desde: '2026-01-01',
      hasta: '2026-01-31',
      busqueda: '  Ana  ',
      pagina: '2',
      limite: '10',
    });

    expect(mocks.listarClientesPedidosAdmin).toHaveBeenCalledWith({
      estado: 'CONFIRMADO',
      desde: '2026-01-01',
      hasta: '2026-01-31',
      busqueda: 'Ana',
      pagina: 2,
      limite: 10,
    });
  });

  it.each([
    { estado: 'DESCONOCIDO' },
    { desde: '2026-02-30' },
    { desde: '2026-12-31', hasta: '2026-01-01' },
    { pagina: 0 },
    { limite: 51 },
    { busqueda: 'a'.repeat(121) },
    null,
  ])('rechaza filtros inválidos: %o', async (entrada) => {
    await expect(consultarClientesPedidosAdmin(entrada))
      .rejects.toMatchObject({ status: 400 });

    expect(mocks.listarClientesPedidosAdmin).not.toHaveBeenCalled();
  });

  it('propaga errores del repositorio', async () => {
    mocks.listarClientesPedidosAdmin.mockRejectedValueOnce(
      new Error('Error de clientes'),
    );

    await expect(consultarClientesPedidosAdmin({}))
      .rejects.toThrow('Error de clientes');
  });
});
