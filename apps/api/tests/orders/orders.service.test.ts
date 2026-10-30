import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  registrarAuditoria,
  ejecutarTransaccion,
  notificarPedidoCreado,
  crearDetallePedido,
  crearRegistroPedido,
  obtenerVariantesParaPedido,
  registrarReserva,
  reservarInventario,
} = vi.hoisted(() => ({
  registrarAuditoria: vi.fn(),
  ejecutarTransaccion: vi.fn(),
  notificarPedidoCreado: vi.fn(),
  crearDetallePedido: vi.fn(),
  crearRegistroPedido: vi.fn(),
  obtenerVariantesParaPedido: vi.fn(),
  registrarReserva: vi.fn(),
  reservarInventario: vi.fn(),
}));

vi.mock('../../src/modules/audit/audit.repository.js', () => ({
  registrarAuditoria,
}));

vi.mock('../../src/shared/database/transaction.js', () => ({
  ejecutarTransaccion,
}));

vi.mock('../../src/modules/orders/orders-notifications.repository.js', () => ({
  notificarPedidoCreado,
}));

vi.mock('../../src/modules/orders/orders.repository.js', () => ({
  crearDetallePedido,
  crearRegistroPedido,
  obtenerVariantesParaPedido,
  registrarReserva,
  reservarInventario,
}));

import { crearPedido } from '../../src/modules/orders/orders.service.js';

const conexion = {} as never;

const variante = {
  varianteId: '5',
  productoNombre: 'Alfajor',
  varianteNombre: 'Caja de 6',
  sku: 'ALF-006',
  precio: '1.50',
  activa: 1,
  stockFisico: 20,
  stockReservado: 2,
};

const datos = {
  metodoPago: 'CASH' as const,
  notas: '  Entregar por la tarde  ',
  items: [{ varianteId: '5', cantidad: 3 }],
};

beforeEach(() => {
  vi.clearAllMocks();

  ejecutarTransaccion.mockImplementation(
    async (operacion: (conexion: never) => Promise<unknown>) =>
      operacion(conexion),
  );

  obtenerVariantesParaPedido.mockResolvedValue([{ ...variante }]);
  crearRegistroPedido.mockResolvedValue('42');
  crearDetallePedido.mockResolvedValue(undefined);
  reservarInventario.mockResolvedValue(undefined);
  registrarReserva.mockResolvedValue(undefined);
  registrarAuditoria.mockResolvedValue(undefined);
  notificarPedidoCreado.mockResolvedValue(undefined);
});

describe('crearPedido', () => {
  it('crea el pedido, guarda detalles, reserva inventario y notifica', async () => {
    const resultado = await crearPedido('20', datos);

    expect(resultado).toMatchObject({
      id: '42',
      estado: 'PENDIENTE_CONFIRMACION',
      subtotal: 4.5,
      total: 4.5,
    });
    expect(resultado.numero).toMatch(/^ORD-\d+-[A-F0-9]{6}$/);

    expect(obtenerVariantesParaPedido).toHaveBeenCalledWith(
      conexion,
      ['5'],
    );
    expect(crearRegistroPedido).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        usuarioId: '20',
        metodoPago: 'CASH',
        subtotal: 4.5,
        notas: 'Entregar por la tarde',
      }),
    );
    expect(crearDetallePedido).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        pedidoId: '42',
        varianteId: '5',
        precio: 1.5,
        cantidad: 3,
      }),
    );
    expect(reservarInventario).toHaveBeenCalledWith(conexion, '5', 3);
    expect(registrarReserva).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        varianteId: '5',
        pedidoId: '42',
        cantidad: 3,
        usuarioId: '20',
      }),
    );
    expect(registrarAuditoria).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        actorUserId: '20',
        action: 'ORDER_CREATED',
        entityId: '42',
        details: expect.objectContaining({ total: 4.5 }),
      }),
    );
    expect(notificarPedidoCreado).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        pedidoId: '42',
        usuarioId: '20',
        total: 4.5,
      }),
    );
  });

  it('rechaza variantes inexistentes', async () => {
    obtenerVariantesParaPedido.mockResolvedValueOnce([]);

    await expect(crearPedido('20', datos)).rejects.toMatchObject({
      status: 404,
      mensajePublico: 'Una o más variantes no existen o no tienen inventario.',
    });

    expect(crearRegistroPedido).not.toHaveBeenCalled();
  });

  it('rechaza variantes inactivas', async () => {
    obtenerVariantesParaPedido.mockResolvedValueOnce([
      { ...variante, activa: 0 },
    ]);

    await expect(
      crearPedido('20', datos),
    ).rejects.toMatchObject({
      status: 409,
      mensajePublico: 'Una de las variantes seleccionadas no está disponible.',
    });

    expect(crearRegistroPedido).not.toHaveBeenCalled();
  });

  it('rechaza precios no numéricos', async () => {
    obtenerVariantesParaPedido.mockResolvedValueOnce([
      { ...variante, precio: 'inválido' },
    ]);

    await expect(crearPedido('20', datos)).rejects.toMatchObject({
      status: 409,
      mensajePublico: 'El precio de una variante no es válido.',
    });
  });

  it('rechaza precios negativos', async () => {
    obtenerVariantesParaPedido.mockResolvedValueOnce([
      { ...variante, precio: '-1.00' },
    ]);

    await expect(crearPedido('20', datos)).rejects.toMatchObject({
      status: 409,
      mensajePublico: 'El precio de una variante no es válido.',
    });
  });

  it('rechaza stock disponible insuficiente', async () => {
    obtenerVariantesParaPedido.mockResolvedValueOnce([
      { ...variante, stockFisico: 4, stockReservado: 2 },
    ]);

    await expect(crearPedido('20', datos)).rejects.toMatchObject({
      status: 409,
      mensajePublico: 'Stock insuficiente para Alfajor (Caja de 6).',
    });

    expect(crearRegistroPedido).not.toHaveBeenCalled();
  });

  it('normaliza las notas vacías a null', async () => {
    await crearPedido('20', { ...datos, notas: '   ' });

    expect(crearRegistroPedido).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({ notas: null }),
    );
  });

  it('permite crear un pedido sin notas', async () => {
    const datosSinNotas = { ...datos, notas: undefined };

    await crearPedido('20', datosSinNotas);

    expect(crearRegistroPedido).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({ notas: null }),
    );
  });

  it('propaga errores al consultar las variantes', async () => {
    obtenerVariantesParaPedido.mockRejectedValueOnce(new Error('Fallo SQL'));

    await expect(crearPedido('20', datos)).rejects.toThrow('Fallo SQL');
  });

  it('propaga errores al registrar el pedido', async () => {
    crearRegistroPedido.mockRejectedValueOnce(new Error('Fallo SQL'));

    await expect(crearPedido('20', datos)).rejects.toThrow('Fallo SQL');
  });

  it('propaga errores al crear el detalle', async () => {
    crearDetallePedido.mockRejectedValueOnce(new Error('Fallo SQL'));

    await expect(crearPedido('20', datos)).rejects.toThrow('Fallo SQL');
  });

  it('propaga errores al reservar inventario', async () => {
    reservarInventario.mockRejectedValueOnce(new Error('Fallo SQL'));

    await expect(crearPedido('20', datos)).rejects.toThrow('Fallo SQL');
  });

  it('propaga errores al registrar la auditoría', async () => {
    registrarAuditoria.mockRejectedValueOnce(new Error('Fallo auditoría'));

    await expect(crearPedido('20', datos)).rejects.toThrow('Fallo auditoría');
  });

  it('propaga errores al notificar la creación', async () => {
    notificarPedidoCreado.mockRejectedValueOnce(new Error('Fallo notificación'));

    await expect(crearPedido('20', datos)).rejects.toThrow('Fallo notificación');
  });

  it('rechaza pedidos cuyo subtotal supera el límite permitido', async () => {
    obtenerVariantesParaPedido.mockResolvedValueOnce([
      {
        ...variante,
        varianteId: '5',
        precio: '50000000000000.00',
        stockFisico: 100,
        stockReservado: 0,
      },
      {
        ...variante,
        varianteId: '6',
        precio: '50000000000000.00',
        stockFisico: 100,
        stockReservado: 0,
      },
    ]);

    await expect(
      crearPedido('20', {
        ...datos,
        items: [
          { varianteId: '5', cantidad: 100 },
          { varianteId: '6', cantidad: 100 },
        ],
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'El total del pedido supera el límite permitido.',
    });

    expect(crearRegistroPedido).not.toHaveBeenCalled();
  });
});
