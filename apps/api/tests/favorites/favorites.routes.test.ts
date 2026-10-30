import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  buscarSesionActivaPorHash,
  buscarUsuarioPorId,
  listarFavoritos,
  agregarFavorito,
  eliminarFavorito,
} = vi.hoisted(() => ({
  buscarSesionActivaPorHash: vi.fn(),
  buscarUsuarioPorId: vi.fn(),
  listarFavoritos: vi.fn(),
  agregarFavorito: vi.fn(),
  eliminarFavorito: vi.fn(),
}));

vi.mock('../../src/modules/auth/sessions.repository.js', () => ({
  buscarSesionActivaPorHash,
}));

vi.mock('../../src/modules/users/users.repository.js', () => ({
  buscarUsuarioPorId,
}));

vi.mock('../../src/modules/favorites/favorites.repository.js', () => ({
  listarFavoritos,
  agregarFavorito,
  eliminarFavorito,
}));

import { crearAplicacion } from '../../src/app.js';
import { COOKIE_SESION } from '../../src/shared/security/authentication.middleware.js';
import { generarTokenCsrf } from '../../src/shared/security/csrf.js';

const tokenSesion = 'A'.repeat(43);
const origenWeb = 'http://localhost:5173';

function solicitud(
  metodo: 'get' | 'post' | 'delete',
  ruta: string,
) {
  return request(crearAplicacion())[metodo](ruta)
    .set('Cookie', `${COOKIE_SESION}=${tokenSesion}`);
}

function agregarCsrf<T extends request.Test>(peticion: T): T {
  return peticion
    .set('Origin', origenWeb)
    .set('X-CSRF-Token', generarTokenCsrf());
}

beforeEach(() => {
  vi.clearAllMocks();

  vi.stubEnv(
    'CSRF_SECRET',
    Buffer.from('0123456789abcdef0123456789abcdef').toString('base64url'),
  );
  vi.stubEnv('WEB_ORIGIN', origenWeb);

  buscarSesionActivaPorHash.mockResolvedValue({
    id: '7',
    userId: '20',
    expiraEn: '2099-12-31 23:59:59.000',
  });

  buscarUsuarioPorId.mockResolvedValue({
    id: '20',
    nombre: 'Cliente de prueba',
    correo: 'cliente@example.com',
    hashContrasena: 'hash',
    rol: 'CLIENTE',
    activo: true,
  });

  listarFavoritos.mockResolvedValue(['5', '8']);
  agregarFavorito.mockResolvedValue(true);
  eliminarFavorito.mockResolvedValue(undefined);
});

describe('GET /api/v1/favorites', () => {
  it('devuelve los favoritos del usuario autenticado', async () => {
    const respuesta = await solicitud('get', '/api/v1/favorites')
      .expect(200);

    expect(respuesta.body).toEqual({ favoritos: ['5', '8'] });
    expect(listarFavoritos).toHaveBeenCalledWith('20');
  });

  it('rechaza solicitudes sin sesión', async () => {
    await request(crearAplicacion())
      .get('/api/v1/favorites')
      .expect(401);

    expect(listarFavoritos).not.toHaveBeenCalled();
  });

  it('oculta los errores internos del repositorio', async () => {
    listarFavoritos.mockRejectedValueOnce(new Error('Fallo SQL'));

    const respuesta = await solicitud('get', '/api/v1/favorites')
      .expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
  });
});

describe('POST /api/v1/favorites/:productoId', () => {
  it('agrega un producto con autenticación y CSRF válidos', async () => {
    const respuesta = await agregarCsrf(
      solicitud('post', '/api/v1/favorites/5'),
    ).expect(200);

    expect(respuesta.body).toEqual({
      mensaje: 'Producto agregado a favoritos.',
    });
    expect(agregarFavorito).toHaveBeenCalledWith('20', '5');
  });

  it('rechaza la solicitud si falta el token CSRF', async () => {
    await solicitud('post', '/api/v1/favorites/5')
      .set('Origin', origenWeb)
      .expect(403);

    expect(agregarFavorito).not.toHaveBeenCalled();
  });

  it('rechaza identificadores no numéricos', async () => {
    const respuesta = await agregarCsrf(
      solicitud('post', '/api/v1/favorites/abc'),
    ).expect(400);

    expect(respuesta.body).toEqual({
      error: 'Identificador de producto no válido.',
    });
    expect(agregarFavorito).not.toHaveBeenCalled();
  });

  it('devuelve 404 cuando el producto no está disponible', async () => {
    agregarFavorito.mockResolvedValueOnce(false);

    const respuesta = await agregarCsrf(
      solicitud('post', '/api/v1/favorites/99'),
    ).expect(404);

    expect(respuesta.body).toEqual({
      error: 'El producto no existe o no está disponible.',
    });
  });

  it('delega los errores inesperados al manejador global', async () => {
    agregarFavorito.mockRejectedValueOnce(new Error('Fallo SQL'));

    const respuesta = await agregarCsrf(
      solicitud('post', '/api/v1/favorites/5'),
    ).expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
  });
});

describe('DELETE /api/v1/favorites/:productoId', () => {
  it('elimina el favorito y devuelve 204', async () => {
    await agregarCsrf(
      solicitud('delete', '/api/v1/favorites/5'),
    ).expect(204);

    expect(eliminarFavorito).toHaveBeenCalledWith('20', '5');
  });

  it('rechaza identificadores no numéricos', async () => {
    await agregarCsrf(
      solicitud('delete', '/api/v1/favorites/abc'),
    ).expect(400);

    expect(eliminarFavorito).not.toHaveBeenCalled();
  });

  it('rechaza solicitudes sin token CSRF', async () => {
    await solicitud('delete', '/api/v1/favorites/5')
      .set('Origin', origenWeb)
      .expect(403);

    expect(eliminarFavorito).not.toHaveBeenCalled();
  });

  it('delega los errores inesperados al manejador global', async () => {
    eliminarFavorito.mockRejectedValueOnce(new Error('Fallo SQL'));

    const respuesta = await agregarCsrf(
      solicitud('delete', '/api/v1/favorites/5'),
    ).expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
  });
});
