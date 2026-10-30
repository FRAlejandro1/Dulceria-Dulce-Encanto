import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { crearPedido, obtenerDetallePedido, obtenerHistorialPedidos } =
  vi.hoisted(() => ({
    crearPedido: vi.fn(),
    obtenerDetallePedido: vi.fn(),
    obtenerHistorialPedidos: vi.fn(),
  }));

vi.mock('../../src/modules/orders/orders.service.js', () => ({
  crearPedido,
}));

vi.mock('../../src/modules/orders/orders-history.service.js', () => ({
  obtenerDetallePedido,
  obtenerHistorialPedidos,
}));

vi.mock('../../src/shared/security/authentication.middleware.js', () => ({
  autenticarUsuario: (
    req: express.Request & { usuario?: { id: string; rol: string } },
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.usuario = { id: '15', rol: 'CLIENTE' };
    next();
  },
}));

vi.mock('../../src/shared/security/csrf.js', () => ({
  protegerCsrf: (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
}));

import { ordersRouter } from '../../src/modules/orders/orders.routes.js';

const app = express();
app.use(express.json());
app.use('/orders', ordersRouter);

describe('orders.routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('obtiene el historial del usuario autenticado', async () => {
    obtenerHistorialPedidos.mockResolvedValueOnce([{ id: '1' }]);

    const respuesta = await request(app).get('/orders');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.pedidos).toEqual([{ id: '1' }]);
    expect(obtenerHistorialPedidos).toHaveBeenCalledWith('15');
  });

  it('propaga errores al consultar el historial', async () => {
    obtenerHistorialPedidos.mockRejectedValueOnce(new Error('Error historial'));

    const respuesta = await request(app).get('/orders');

    expect(respuesta.status).toBe(500);
  });

  it.each(['abc', '-1', '1.5'])(
    'rechaza el identificador de pedido inválido: %s',
    async (id) => {
      const respuesta = await request(app).get(`/orders/${id}`);

      expect(respuesta.status).toBe(400);
      expect(obtenerDetallePedido).not.toHaveBeenCalled();
    },
  );

  it('obtiene el detalle de un pedido del usuario', async () => {
    obtenerDetallePedido.mockResolvedValueOnce({ id: '12', items: [] });

    const respuesta = await request(app).get('/orders/12');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.pedido).toEqual({ id: '12', items: [] });
    expect(obtenerDetallePedido).toHaveBeenCalledWith('15', '12');
  });

  it('responde con error cuando falla la consulta del detalle', async () => {
    obtenerDetallePedido.mockRejectedValueOnce(new Error('Error detalle'));

    const respuesta = await request(app).get('/orders/12');

    expect(respuesta.status).toBe(500);
  });

  it('rechaza los datos de pedido inválidos', async () => {
    const respuesta = await request(app)
      .post('/orders')
      .send({ items: [], metodoPago: 'INVALIDO' });

    expect(respuesta.status).toBe(400);
    expect(crearPedido).not.toHaveBeenCalled();
  });

  it('crea un pedido válido', async () => {
    crearPedido.mockResolvedValueOnce({
      id: '20',
      numero: 'ORD-TEST',
      estado: 'PENDIENTE_CONFIRMACION',
      subtotal: 10,
      total: 10,
    });

    const respuesta = await request(app)
      .post('/orders')
      .send({
        metodoPago: 'CASH',
        items: [{ varianteId: '3', cantidad: 2 }],
      });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.pedido.id).toBe('20');
    expect(crearPedido).toHaveBeenCalledWith('15', {
      metodoPago: 'CASH',
      items: [{ varianteId: '3', cantidad: 2 }],
    });
  });

  it('responde con error cuando falla la creación del pedido', async () => {
    crearPedido.mockRejectedValueOnce(new Error('Error creación'));

    const respuesta = await request(app)
      .post('/orders')
      .send({
        metodoPago: 'CASH',
        items: [{ varianteId: '3', cantidad: 2 }],
      });

    expect(respuesta.status).toBe(500);
  });
});
