import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  autenticarUsuario: vi.fn((_req, _res, next) => next()),
  protegerCsrf: vi.fn((_req, _res, next) => next()),
  listarNotificacionesUsuario: vi.fn(),
  marcarNotificacionLeida: vi.fn(),
}));

vi.mock('../../src/shared/security/authentication.middleware.js', () => ({
  autenticarUsuario: mocks.autenticarUsuario,
}));

vi.mock('../../src/shared/security/csrf.js', () => ({
  protegerCsrf: mocks.protegerCsrf,
}));

vi.mock('../../src/modules/orders/orders-notifications-query.repository.js', () => ({
  listarNotificacionesUsuario: mocks.listarNotificacionesUsuario,
  marcarNotificacionLeida: mocks.marcarNotificacionLeida,
}));

import { ordersNotificationsRouter } from '../../src/modules/orders/orders-notifications.routes.js';

function crearAplicacion() {
  const app = express();

  app.use(express.json());

  app.use((req, _res, next) => {
    (req as typeof req & { usuario: unknown }).usuario = {
      id: '20',
      nombre: 'Cliente de prueba',
      correo: 'cliente@example.com',
      rol: 'CLIENTE',
    };
    next();
  });

  app.use('/api/v1/orders/notifications', ordersNotificationsRouter);

  app.use((
    error: { status?: number; mensajePublico?: string },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    void _next
    res.status(error.status ?? 500).json({
      mensaje: error.mensajePublico ?? 'Error interno',
    })
  });

  return app;
}

const app = crearAplicacion();

beforeEach(() => {
  vi.clearAllMocks();

  mocks.autenticarUsuario.mockImplementation((_req, _res, next) => next());
  mocks.protegerCsrf.mockImplementation((_req, _res, next) => next());
  mocks.listarNotificacionesUsuario.mockResolvedValue([]);
  mocks.marcarNotificacionLeida.mockResolvedValue(true);
});

describe('GET /api/v1/orders/notifications', () => {
  it('devuelve las notificaciones del usuario autenticado', async () => {
    const notificaciones = [{ id: '1', titulo: 'Pedido recibido' }];
    mocks.listarNotificacionesUsuario.mockResolvedValueOnce(notificaciones);

    const respuesta = await request(app).get('/api/v1/orders/notifications');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ notificaciones });
    expect(mocks.listarNotificacionesUsuario).toHaveBeenCalledWith('20');
  });

  it('propaga errores al consultar las notificaciones', async () => {
    mocks.listarNotificacionesUsuario.mockRejectedValueOnce(new Error('Error SQL'));

    const respuesta = await request(app).get('/api/v1/orders/notifications');

    expect(respuesta.status).toBe(500);
    expect(respuesta.body).toEqual({ mensaje: 'Error interno' });
  });
});

describe('PATCH /api/v1/orders/notifications/:id/read', () => {
  it('marca una notificación como leída', async () => {
    const respuesta = await request(app)
      .patch('/api/v1/orders/notifications/7/read');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({
      mensaje: 'Notificación marcada como leída.',
    });
    expect(mocks.marcarNotificacionLeida).toHaveBeenCalledWith('20', '7');
    expect(mocks.protegerCsrf).toHaveBeenCalledOnce();
  });

  it('rechaza un identificador no numérico', async () => {
    const respuesta = await request(app)
      .patch('/api/v1/orders/notifications/abc/read');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body).toEqual({
      error: 'Identificador de notificación no válido.',
    });
    expect(mocks.marcarNotificacionLeida).not.toHaveBeenCalled();
  });

  it('responde 404 si la notificación no existe para el usuario', async () => {
    mocks.marcarNotificacionLeida.mockResolvedValueOnce(false);

    const respuesta = await request(app)
      .patch('/api/v1/orders/notifications/99/read');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body).toEqual({
      error: 'La notificación no existe.',
    });
  });

  it('propaga errores al marcar como leída', async () => {
    mocks.marcarNotificacionLeida.mockRejectedValueOnce(new Error('Error SQL'));

    const respuesta = await request(app)
      .patch('/api/v1/orders/notifications/7/read');

    expect(respuesta.status).toBe(500);
    expect(respuesta.body).toEqual({ mensaje: 'Error interno' });
  });

  it('detiene la solicitud cuando falla la protección CSRF', async () => {
    mocks.protegerCsrf.mockImplementationOnce((_req, res) => {
      res.status(403).json({ error: 'CSRF inválido' });
    });

    const respuesta = await request(app)
      .patch('/api/v1/orders/notifications/7/read');

    expect(respuesta.status).toBe(403);
    expect(mocks.marcarNotificacionLeida).not.toHaveBeenCalled();
  });
});
