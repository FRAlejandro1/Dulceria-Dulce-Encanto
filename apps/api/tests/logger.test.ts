import { afterEach, describe, expect, it, vi } from 'vitest';

import { registrarError } from '../src/shared/logging/logger.js';

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
