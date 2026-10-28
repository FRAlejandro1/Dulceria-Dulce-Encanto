import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  iniciarSesionMock,
  cerrarSesionMock,
  generarTokenCsrfMock,
  protegerCsrfMock,
} = vi.hoisted(() => ({
  iniciarSesionMock: vi.fn(),
  cerrarSesionMock: vi.fn(),
  generarTokenCsrfMock: vi.fn(),
  protegerCsrfMock: vi.fn((_req, _res, next) => next()),
}));

vi.mock('../../src/modules/auth/auth.service.js', () => ({
  iniciarSesion: iniciarSesionMock,
  cerrarSesion: cerrarSesionMock,
}));

vi.mock('../../src/shared/security/csrf.js', () => ({
  generarTokenCsrf: generarTokenCsrfMock,
  protegerCsrf: protegerCsrfMock,
}));

import { autenticacionRouter } from '../../src/modules/auth/auth.routes.js';

function crearAplicacion() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/v1/auth', autenticacionRouter);

  app.use((
    error: { status?: number; mensajePublico?: string },
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    void next;
    res.status(error.status ?? 500).json({
      mensaje: error.mensajePublico ?? 'Error interno',
    });
  });

  return app;
}

const app = crearAplicacion();

beforeEach(() => {
  vi.clearAllMocks();

  generarTokenCsrfMock.mockReturnValue('csrf-token-prueba');
  iniciarSesionMock.mockResolvedValue({
    usuario: {
      id: '15',
      nombre: 'Cliente de prueba',
      correo: 'cliente@example.com',
      rol: 'CLIENTE',
    },
    token: 'A'.repeat(43),
    expiraEn: new Date('2026-10-21T00:00:00.000Z'),
  });

  cerrarSesionMock.mockResolvedValue(undefined);
  protegerCsrfMock.mockImplementation((_req, _res, next) => next());
});

describe('GET /api/v1/auth/csrf', () => {
  it('devuelve un token CSRF', async () => {
    const respuesta = await request(app).get('/api/v1/auth/csrf');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({
      csrfToken: 'csrf-token-prueba',
    });
    expect(generarTokenCsrfMock).toHaveBeenCalledOnce();
  });
});

describe('POST /api/v1/auth/login', () => {
  it('inicia sesión y establece la cookie HttpOnly', async () => {
    const respuesta = await request(app)
      .post('/api/v1/auth/login')
      .send({
        correo: 'cliente@example.com',
        contrasena: 'ContrasenaSegura123',
      });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({
      usuario: {
        id: '15',
        nombre: 'Cliente de prueba',
        correo: 'cliente@example.com',
        rol: 'CLIENTE',
      },
      expiraEn: '2026-10-21T00:00:00.000Z',
    });

    const cookie = respuesta.headers['set-cookie'] as unknown as string[];
    expect(cookie[0]).toContain('dulceria_session=');
    expect(cookie[0]).toContain('HttpOnly');
    expect(cookie[0]).toContain('SameSite=Lax');
    expect(cookie[0]).toContain('Path=/');
    expect(cookie[0]).toContain('Max-Age=28800');

    expect(iniciarSesionMock).toHaveBeenCalledWith({
      correo: 'cliente@example.com',
      contrasena: 'ContrasenaSegura123',
    });
  });

  it('activa Secure para la cookie en producción', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const respuesta = await request(app)
      .post('/api/v1/auth/login')
      .send({
        correo: 'cliente@example.com',
        contrasena: 'ContrasenaSegura123',
      });

    expect(respuesta.status).toBe(200);

    const cookie = respuesta.headers['set-cookie'] as unknown as string[];
    expect(cookie[0]).toContain('Secure');
  });

  it('propaga los errores del servicio de inicio de sesión', async () => {
    iniciarSesionMock.mockRejectedValueOnce({
      status: 401,
      mensajePublico: 'Correo o contraseña incorrectos',
    });

    const respuesta = await request(app)
      .post('/api/v1/auth/login')
      .send({
        correo: 'cliente@example.com',
        contrasena: 'incorrecta',
      });

    expect(respuesta.status).toBe(401);
    expect(respuesta.body).toEqual({
      mensaje: 'Correo o contraseña incorrectos',
    });
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('cierra sesión y elimina la cookie', async () => {
    const respuesta = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `dulceria_session=${'A'.repeat(43)}`);

    expect(respuesta.status).toBe(204);
    expect(cerrarSesionMock).toHaveBeenCalledWith('A'.repeat(43));

    const cookie = respuesta.headers['set-cookie'] as unknown as string[];
    expect(cookie[0]).toContain('dulceria_session=');
    expect(cookie[0]).toContain('Expires=Thu, 01 Jan 1970');
    expect(cookie[0]).toContain('HttpOnly');
    expect(cookie[0]).toContain('Path=/');
  });

  it('propaga los errores del servicio de cierre de sesión', async () => {
    cerrarSesionMock.mockRejectedValueOnce(new Error('Error de sesión'));

    const respuesta = await request(app).post('/api/v1/auth/logout');

    expect(respuesta.status).toBe(500);
    expect(respuesta.body).toEqual({ mensaje: 'Error interno' });
  });
});
