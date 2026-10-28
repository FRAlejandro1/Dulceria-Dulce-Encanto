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
}));

import {
  cambiarEstadoPedidoAdmin,
  consultarPedidosAdmin,
  consultarVentasMensualesAdmin,
} from '../../src/modules/orders/orders-admin.service.js';
import { ErrorAplicacion } from '../../src/shared/http/app-error.js';

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

  it('acepta filtros válidos y convierte paginación', async () => {
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
  it('consulta ventas para un año válido', async () => {
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
  ])('rechaza un año inválido: %o', async (entrada) => {
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
  it('confirma un pedido, actualiza inventario y registra auditoría', async () => {
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

  it('rechaza un identificador no numérico', async () => {
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

  it('rechaza pedidos sin artículos', async () => {
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

  it('procesa todos los artículos antes de actualizar el estado', async () => {
    mocks.obtenerItemsInventarioPedido.mockResolvedValueOnce([
      { ...item, varianteId: '5' },
      { ...item, varianteId: '6', cantidad: 1, stockReservado: 1 },
    ]);

    await cambiarEstadoPedidoAdmin('7', '42', 'CONFIRMADO');

    expect(mocks.actualizarInventarioPedidoAdmin).toHaveBeenCalledTimes(2);
    expect(mocks.actualizarEstadoPedidoAdmin).toHaveBeenCalledOnce();
  });

  it('propaga errores de la transacción', async () => {
    mocks.ejecutarTransaccion.mockRejectedValueOnce(new Error('Error transaccional'));

    await expect(
      cambiarEstadoPedidoAdmin('7', '42', 'CONFIRMADO'),
    ).rejects.toThrow('Error transaccional');
  });

  it('propaga errores al registrar auditoría', async () => {
    mocks.registrarAuditoria.mockRejectedValueOnce(new Error('Error de auditoría'));

    await expect(
      cambiarEstadoPedidoAdmin('7', '42', 'CONFIRMADO'),
    ).rejects.toThrow('Error de auditoría');
  });
});
