import { afterEach, describe, expect, it, vi } from 'vitest';

import { registrarError, registrarInfo } from '../src/shared/logging/logger.js';

describe('registrarError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registra el tipo de error sin incluir mensaje ni traza', () => {
    const escritura = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);

    const error = new Error('dato-secreto-123');
    error.stack = 'traza-con-informacion-interna';

    registrarError('http.request_failed', error, {
      method: 'POST',
      status: 400,
    });

    const salida = escritura.mock.calls[0]?.[0];
    expect(salida).toBeTypeOf('string');

    const registro = JSON.parse(String(salida)) as {
      event: string;
      error: Record<string, unknown>;
      context: Record<string, unknown>;
    };

    expect(registro.event).toBe('http.request_failed');
    expect(registro.error).toEqual({ name: 'Error' });
    expect(registro.context).toEqual({
      method: 'POST',
      status: 400,
    });

    expect(String(salida)).not.toContain('dato-secreto-123');
    expect(String(salida)).not.toContain('traza-con-informacion-interna');
  });

  it('registra códigos técnicos seguros sin incluir mensajes', () => {
    const escritura = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);

    const error = Object.assign(
      new Error('mensaje interno'),
      { code: 'ER_DUP_ENTRY' },
    );

    registrarError('database.operation_failed', error);

    const salida = String(escritura.mock.calls[0]?.[0]);
    const registro = JSON.parse(salida) as {
      error: Record<string, unknown>;
    };

    expect(registro.error).toEqual({
      name: 'Error',
      code: 'ER_DUP_ENTRY',
    });
    expect(salida).not.toContain('mensaje interno');
  });

  it('no serializa el contenido de errores desconocidos', () => {
    const escritura = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);

    registrarError('operation.failed', {
      secret: 'valor-confidencial',
    });

    const salida = String(escritura.mock.calls[0]?.[0]);
    const registro = JSON.parse(salida) as {
      error: Record<string, unknown>;
    };

    expect(registro.error).toEqual({ name: 'UnknownError' });
    expect(salida).not.toContain('valor-confidencial');
  });
});

describe('serialización segura del logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reemplaza nombres de error con caracteres no permitidos', () => {
    const escritura = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const error = new Error('contenido privado');

    Object.defineProperty(error, 'name', { value: 'Error!Interno' });

    registrarError('security.test', error);

    const registro = JSON.parse(String(escritura.mock.calls[0]?.[0])) as {
      error: Record<string, unknown>;
    };

    expect(registro.error).toEqual({ name: 'Error' });
    expect(String(escritura.mock.calls[0]?.[0])).not.toContain('contenido privado');
  });

  it.each([
    ['codigo_en_minusculas', undefined],
    ['ER-DUP-ENTRY', undefined],
    ['A'.repeat(65), undefined],
    [123, undefined],
  ])('omite códigos técnicos que no cumplen el formato permitido: %s', (codigo) => {
    const escritura = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const error = Object.assign(new Error('dato privado'), { code: codigo });

    registrarError('database.test', error);

    const registro = JSON.parse(String(escritura.mock.calls[0]?.[0])) as {
      error: Record<string, unknown>;
    };

    expect(registro.error).toEqual({ name: 'Error' });
  });

  it('registra información con contexto explícito', () => {
    const escritura = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    registrarInfo('application.started', { port: 3000 });

    const registro = JSON.parse(String(escritura.mock.calls[0]?.[0])) as {
      level: string;
      event: string;
      context: Record<string, unknown>;
      timestamp: string;
    };

    expect(registro.level).toBe('info');
    expect(registro.event).toBe('application.started');
    expect(registro.context).toEqual({ port: 3000 });
    expect(Number.isNaN(Date.parse(registro.timestamp))).toBe(false);
  });

  it('registra información con contexto vacío cuando se omite', () => {
    const escritura = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    registrarInfo('application.ready');

    const registro = JSON.parse(String(escritura.mock.calls[0]?.[0])) as {
      context: Record<string, unknown>;
    };

    expect(registro.context).toEqual({});
  });
});
