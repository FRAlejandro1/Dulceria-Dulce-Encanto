import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const {
  cambiarEstadoPedidoAdmin,
  consultarPedidosAdmin,
  consultarVentasMensualesAdmin,
} = vi.hoisted(() => ({
  cambiarEstadoPedidoAdmin: vi.fn(),
  consultarPedidosAdmin: vi.fn(),
  consultarVentasMensualesAdmin: vi.fn(),
}));

vi.mock('../../src/modules/orders/orders-admin.service.js', () => ({
  cambiarEstadoPedidoAdmin,
  consultarPedidosAdmin,
  consultarVentasMensualesAdmin,
}));

vi.mock('../../src/shared/security/authentication.middleware.js', () => ({
  autenticarUsuario: (
    req: express.Request & { usuario?: { id: string; rol: string } },
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.usuario = { id: '15', rol: 'ADMIN' };
    next();
  },
}));

vi.mock('../../src/shared/security/authorization.middleware.js', () => ({
  autorizarRoles: () => (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
}));

vi.mock('../../src/shared/security/csrf.js', () => ({
  protegerCsrf: (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
}));

import { ordersAdminRouter } from '../../src/modules/orders/orders-admin.routes.js';

const app = express();
app.use(express.json());
app.use('/admin/orders', ordersAdminRouter);
app.use((
  error: Error,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction,
) => res.status(500).json({ error: error.message }));

describe('orders-admin.routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta los pedidos administrativos', async () => {
    consultarPedidosAdmin.mockResolvedValueOnce({
      pedidos: [{ id: '1' }],
      total: 1,
      pagina: 1,
      limite: 10,
    });

    const respuesta = await request(app).get('/admin/orders');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.pedidos).toEqual([{ id: '1' }]);
    expect(consultarPedidosAdmin).toHaveBeenCalledOnce();
  });

  it('propaga errores al consultar pedidos', async () => {
    consultarPedidosAdmin.mockRejectedValueOnce(new Error('Error pedidos'));

    const respuesta = await request(app).get('/admin/orders');

    expect(respuesta.status).toBe(500);
  });

  it('consulta las ventas mensuales', async () => {
    consultarVentasMensualesAdmin.mockResolvedValueOnce([{ mes: 1, total: 100 }]);

    const respuesta = await request(app).get('/admin/orders/sales/monthly?anio=2026');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.ventasMensuales).toEqual([{ mes: 1, total: 100 }]);
    expect(consultarVentasMensualesAdmin).toHaveBeenCalledOnce();
  });

  it('propaga errores al consultar ventas mensuales', async () => {
    consultarVentasMensualesAdmin.mockRejectedValueOnce(new Error('Error ventas'));

    const respuesta = await request(app).get('/admin/orders/sales/monthly');

    expect(respuesta.status).toBe(500);
  });

  it.each(['abc', '-1', '1.5'])(
    'rechaza el identificador inválido: %s',
    async (id) => {
      const respuesta = await request(app)
        .patch(`/admin/orders/${id}/status`)
        .send({ estado: 'CONFIRMADO' });

      expect(respuesta.status).toBe(400);
      expect(cambiarEstadoPedidoAdmin).not.toHaveBeenCalled();
    },
  );

  it.each([{}, { estado: 123 }, { estado: null }])(
    'rechaza un estado no válido',
    async (cuerpo) => {
      const respuesta = await request(app)
        .patch('/admin/orders/12/status')
        .send(cuerpo);

      expect(respuesta.status).toBe(400);
      expect(cambiarEstadoPedidoAdmin).not.toHaveBeenCalled();
    },
  );

  it('actualiza el estado del pedido', async () => {
    cambiarEstadoPedidoAdmin.mockResolvedValueOnce({
      id: '12',
      estado: 'CONFIRMADO',
    });

    const respuesta = await request(app)
      .patch('/admin/orders/12/status')
      .send({ estado: 'CONFIRMADO' });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.pedido).toEqual({
      id: '12',
      estado: 'CONFIRMADO',
    });
    expect(cambiarEstadoPedidoAdmin).toHaveBeenCalledWith(
      expect.any(String),
      '12',
      'CONFIRMADO',
    );
  });

  it('propaga errores al actualizar el estado', async () => {
    cambiarEstadoPedidoAdmin.mockRejectedValueOnce(new Error('Error estado'));

    const respuesta = await request(app)
      .patch('/admin/orders/12/status')
      .send({ estado: 'CONFIRMADO' });

    expect(respuesta.status).toBe(500);
  });
});
