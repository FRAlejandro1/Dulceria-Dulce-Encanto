import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { ErrorAplicacion } from '../../src/shared/http/app-error.js';
import type { SolicitudAutenticada } from '../../src/shared/security/authentication.middleware.js';
import { autorizarRoles } from '../../src/shared/security/authorization.middleware.js';

function crearSolicitud(usuario?: SolicitudAutenticada['usuario']): Request {
  const req: Record<string, unknown> = {};

  if (usuario !== undefined) {
    req['usuario'] = usuario;
  }

  return req as Request;
}

function crearRespuesta(): Response {
  return {} as Response;
}

describe('autorizarRoles', () => {
  it('rechaza una solicitud sin identidad autenticada', () => {
    const middleware = autorizarRoles('ADMIN');
    const req = crearSolicitud();
    const next = vi.fn<NextFunction>();

    middleware(req, crearRespuesta(), next);

    expect(next).toHaveBeenCalledOnce();

    const error = next.mock.calls[0]?.[0] as ErrorAplicacion;

    expect(error).toBeInstanceOf(ErrorAplicacion);
    expect(error.status).toBe(401);
    expect(error.mensajePublico).toBe('Se requiere autenticación');
  });

  it('rechaza un rol que no está autorizado', () => {
    const middleware = autorizarRoles('ADMIN');
    const req = crearSolicitud({ id: '15', rol: 'CLIENTE' });
    const next = vi.fn<NextFunction>();

    middleware(req, crearRespuesta(), next);

    expect(next).toHaveBeenCalledOnce();

    const error = next.mock.calls[0]?.[0] as ErrorAplicacion;

    expect(error).toBeInstanceOf(ErrorAplicacion);
    expect(error.status).toBe(403);
    expect(error.mensajePublico).toBe(
      'No tiene permisos para realizar esta operación',
    );
  });

  it('permite continuar cuando el rol está autorizado', () => {
    const middleware = autorizarRoles('ADMIN');
    const req = crearSolicitud({ id: '20', rol: 'ADMIN' });
    const next = vi.fn<NextFunction>();

    middleware(req, crearRespuesta(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  it('permite cualquiera de los roles autorizados', () => {
    const middleware = autorizarRoles('CLIENTE', 'ADMIN');
    const req = crearSolicitud({ id: '15', rol: 'CLIENTE' });
    const next = vi.fn<NextFunction>();

    middleware(req, crearRespuesta(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });
});
