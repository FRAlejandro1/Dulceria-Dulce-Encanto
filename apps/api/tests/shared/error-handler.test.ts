import type { Request, Response, NextFunction } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { manejarError } from '../../src/shared/http/error-handler.js';
import { ErrorAplicacion } from '../../src/shared/http/app-error.js';

function crearRespuesta(headersSent = false) {
  const res = {
    headersSent,
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
}

describe('manejarError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('propaga el error si las cabeceras ya fueron enviadas', () => {
    const error = new Error('error interno');
    const res = crearRespuesta(true);
    const next = vi.fn();

    manejarError(
      error,
      { method: 'GET', path: '/test' } as Request,
      res as unknown as Response,
      next as NextFunction,
    );

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('publica el estado y mensaje de un error de aplicación', () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const res = crearRespuesta();
    const error = new ErrorAplicacion(
      409,
      'Ya existe una cuenta con ese correo electrónico',
    );

    manejarError(
      error,
      { method: 'POST', path: '/api/v1/users' } as Request,
      res as unknown as Response,
      vi.fn() as NextFunction,
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Ya existe una cuenta con ese correo electrónico',
    });
  });

  it.each([
    [400, 'Solicitud inválida'],
    [413, 'El cuerpo de la solicitud excede el límite permitido'],
    [401, 'No se pudo procesar la solicitud'],
    [500, 'Error interno del servidor'],
    [503, 'Error interno del servidor'],
  ])('responde con el mensaje público correspondiente al estado %i', (status, mensaje) => {
    const escritura = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const res = crearRespuesta();
    const next = vi.fn();

    manejarError(
      { status },
      { method: 'POST', path: '/api/v1/test' } as Request,
      res as unknown as Response,
      next as NextFunction,
    );

    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({ error: mensaje });
    expect(next).not.toHaveBeenCalled();
    expect(String(escritura.mock.calls[0]?.[0])).toContain('"event":"http.request_failed"');
  });

  it.each([
    null,
    'error',
    {},
    { status: 200 },
    { status: 399 },
    { status: 600 },
    { status: '400' },
    { status: 400.5 },
    { status: 200, statusCode: 503 },
  ])('trata estados no válidos como error interno: %o', (error) => {
    const res = crearRespuesta();

    manejarError(
      error,
      { method: 'GET', path: '/test' } as Request,
      res as unknown as Response,
      vi.fn() as NextFunction,
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Error interno del servidor',
    });
  });

  it('acepta statusCode cuando status no está definido', () => {
    const res = crearRespuesta();

    manejarError(
      { statusCode: 404 },
      { method: 'GET', path: '/test' } as Request,
      res as unknown as Response,
      vi.fn() as NextFunction,
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'No se pudo procesar la solicitud',
    });
  });
});
