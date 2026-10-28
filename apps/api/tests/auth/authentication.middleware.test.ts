import type { Request, Response, NextFunction } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  buscarUsuarioPorIdMock,
  buscarSesionActivaPorHashMock,
} = vi.hoisted(() => ({
  buscarUsuarioPorIdMock: vi.fn(),
  buscarSesionActivaPorHashMock: vi.fn(),
}));

vi.mock('../../src/modules/users/users.repository.js', () => ({
  buscarUsuarioPorId: buscarUsuarioPorIdMock,
}));

vi.mock('../../src/modules/auth/sessions.repository.js', () => ({
  buscarSesionActivaPorHash: buscarSesionActivaPorHashMock,
}));

import {
  autenticarUsuario,
  COOKIE_SESION,
} from '../../src/shared/security/authentication.middleware.js';
import { ErrorAplicacion } from '../../src/shared/http/app-error.js';
import { calcularHashTokenSesion } from '../../src/shared/security/session-token.js';

function crearSolicitud(token?: string): Request {
  return {
    cookies: token === undefined ? {} : { [COOKIE_SESION]: token },
  } as Request;
}

function crearRespuesta(): Response {
  return {} as Response;
}

function crearUsuario(
  opciones: {
    id?: string;
    rol?: 'CLIENTE' | 'ADMIN';
    activo?: boolean;
  } = {},
) {
  return {
    id: opciones.id ?? '15',
    nombre: 'Usuario de prueba',
    correo: 'usuario@ejemplo.com',
    hashContrasena: 'hash',
    rol: opciones.rol ?? 'CLIENTE',
    activo: opciones.activo ?? true,
  };
}

function crearSiguiente() {
  return vi.fn<NextFunction>();
}

describe('autenticarUsuario', () => {
  const tokenValido = 'A'.repeat(43);

  beforeEach(() => {
    vi.clearAllMocks();

    buscarSesionActivaPorHashMock.mockResolvedValue({
      id: '7',
      userId: '15',
      expiraEn: '2026-10-20 23:00:00.000',
    });

    buscarUsuarioPorIdMock.mockResolvedValue(crearUsuario());
  });

  it('rechaza una solicitud sin cookie de sesión', async () => {
    const next = crearSiguiente();

    await autenticarUsuario(crearSolicitud(), crearRespuesta(), next);

    expect(next).toHaveBeenCalledOnce();
    const error = next.mock.calls[0]?.[0] as ErrorAplicacion;
    expect(error).toBeInstanceOf(ErrorAplicacion);
    expect(error.status).toBe(401);
    expect(error.mensajePublico).toBe('Se requiere autenticación');
    expect(buscarSesionActivaPorHashMock).not.toHaveBeenCalled();
  });

  it('rechaza una cookie vacía', async () => {
    const next = crearSiguiente();

    await autenticarUsuario(crearSolicitud(''), crearRespuesta(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]?.[0]).toMatchObject({
      status: 401,
      mensajePublico: 'Se requiere autenticación',
    });
  });

  it('rechaza un token con formato incorrecto', async () => {
    const next = crearSiguiente();

    await autenticarUsuario(
      crearSolicitud('token-invalido'),
      crearRespuesta(),
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]?.[0]).toMatchObject({
      status: 401,
      mensajePublico: 'Se requiere autenticación',
    });
    expect(buscarSesionActivaPorHashMock).not.toHaveBeenCalled();
  });

  it('busca la sesión por el hash del token y adjunta la identidad', async () => {
    const req = crearSolicitud(tokenValido);
    const next = crearSiguiente();

    await autenticarUsuario(req, crearRespuesta(), next);

    expect(buscarSesionActivaPorHashMock).toHaveBeenCalledWith(
      calcularHashTokenSesion(tokenValido),
    );
    expect(buscarUsuarioPorIdMock).toHaveBeenCalledWith('15');
    expect(req).toHaveProperty('usuario', {
      id: '15',
      rol: 'CLIENTE',
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('acepta un usuario con rol ADMIN', async () => {
    buscarUsuarioPorIdMock.mockResolvedValue(
      crearUsuario({ id: '20', rol: 'ADMIN' }),
    );
    const req = crearSolicitud(tokenValido);
    const next = crearSiguiente();

    await autenticarUsuario(req, crearRespuesta(), next);

    expect(req).toHaveProperty('usuario', {
      id: '20',
      rol: 'ADMIN',
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('rechaza una sesión inexistente o expirada', async () => {
    buscarSesionActivaPorHashMock.mockResolvedValue(null);
    const next = crearSiguiente();

    await autenticarUsuario(
      crearSolicitud(tokenValido),
      crearRespuesta(),
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]?.[0]).toMatchObject({
      status: 401,
      mensajePublico: 'La sesión es inválida o ha expirado',
    });
    expect(buscarUsuarioPorIdMock).not.toHaveBeenCalled();
  });

  it('rechaza una sesión cuyo usuario ya no existe', async () => {
    buscarUsuarioPorIdMock.mockResolvedValue(null);
    const next = crearSiguiente();

    await autenticarUsuario(
      crearSolicitud(tokenValido),
      crearRespuesta(),
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]?.[0]).toMatchObject({
      status: 401,
      mensajePublico: 'La sesión es inválida o ha expirado',
    });
  });

  it('rechaza una sesión cuyo usuario está desactivado', async () => {
    buscarUsuarioPorIdMock.mockResolvedValue(
      crearUsuario({ activo: false }),
    );
    const next = crearSiguiente();

    await autenticarUsuario(
      crearSolicitud(tokenValido),
      crearRespuesta(),
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]?.[0]).toMatchObject({
      status: 401,
      mensajePublico: 'La sesión es inválida o ha expirado',
    });
  });

  it('propaga un error controlado si falla la consulta de sesión', async () => {
    buscarSesionActivaPorHashMock.mockRejectedValue(
      new Error('Error de base de datos'),
    );
    const next = crearSiguiente();

    await autenticarUsuario(
      crearSolicitud(tokenValido),
      crearRespuesta(),
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]?.[0]).toMatchObject({
      status: 500,
      mensajePublico: 'No se pudo validar la sesión',
    });
  });

  it('propaga un error controlado si falla la consulta del usuario', async () => {
    buscarUsuarioPorIdMock.mockRejectedValue(
      new Error('Error de base de datos'),
    );
    const next = crearSiguiente();

    await autenticarUsuario(
      crearSolicitud(tokenValido),
      crearRespuesta(),
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]?.[0]).toMatchObject({
      status: 500,
      mensajePublico: 'No se pudo validar la sesión',
    });
  });
});
