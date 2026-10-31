import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ejecutarSqlMock } = vi.hoisted(() => ({
  ejecutarSqlMock: vi.fn(),
}));

vi.mock('../../src/config/database.js', () => ({
  pool: {
    execute: ejecutarSqlMock,
  },
}));

import {
  bloquearYObtenerIntentos,
  registrarIntentoFallido,
  reiniciarIntentosFallidos,
} from '../../src/modules/auth/login-attempts.repository.js';

beforeEach(() => {
  vi.clearAllMocks();
  ejecutarSqlMock.mockResolvedValue([[], []]);
});

describe('bloquearYObtenerIntentos', () => {
  it('crea el registro si no existe y bloquea la fila para actualizarla', async () => {
    ejecutarSqlMock
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([
        [{
          failed_attempts: 2,
          segundos_bloqueo: 0,
        }],
        [],
      ]);

    const resultado = await bloquearYObtenerIntentos('15');

    expect(ejecutarSqlMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT IGNORE INTO auth_login_attempts'),
      ['15'],
    );

    expect(ejecutarSqlMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FOR UPDATE'),
      ['15'],
    );

    expect(resultado).toEqual({
      intentosFallidos: 2,
      segundosBloqueo: 0,
    });
  });

  it('devuelve el tiempo restante de un bloqueo activo', async () => {
    ejecutarSqlMock
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([
        [{
          failed_attempts: 3,
          segundos_bloqueo: 420,
        }],
        [],
      ]);

    await expect(
      bloquearYObtenerIntentos('15'),
    ).resolves.toEqual({
      intentosFallidos: 3,
      segundosBloqueo: 420,
    });
  });

  it('reinicia los intentos cuando el tiempo de bloqueo es nulo', async () => {
    ejecutarSqlMock
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([
        [{
          failed_attempts: 3,
          segundos_bloqueo: null,
        }],
        [],
      ])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    await expect(
      bloquearYObtenerIntentos('15'),
    ).resolves.toEqual({
      intentosFallidos: 0,
      segundosBloqueo: 0,
    });

    expect(ejecutarSqlMock).toHaveBeenCalledTimes(3);
  });
  it('devuelve cero intentos si no encuentra el registro', async () => {
    await expect(
      bloquearYObtenerIntentos('15'),
    ).resolves.toEqual({
      intentosFallidos: 0,
      segundosBloqueo: 0,
    });
  });

  it('propaga errores al crear el registro', async () => {
    ejecutarSqlMock.mockRejectedValueOnce(new Error('Error de inserción'));

    await expect(
      bloquearYObtenerIntentos('15'),
    ).rejects.toThrow('Error de inserción');
  });

  it('propaga errores al consultar el bloqueo', async () => {
    ejecutarSqlMock
      .mockResolvedValueOnce([[], []])
      .mockRejectedValueOnce(new Error('Error de consulta'));

    await expect(
      bloquearYObtenerIntentos('15'),
    ).rejects.toThrow('Error de consulta');
  });
  it('reinicia los intentos cuando el bloqueo ya expiró', async () => {
    ejecutarSqlMock
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([
        [{
          failed_attempts: 3,
          segundos_bloqueo: 0,
        }],
        [],
      ])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    await expect(
      bloquearYObtenerIntentos('15'),
    ).resolves.toEqual({
      intentosFallidos: 0,
      segundosBloqueo: 0,
    });

    expect(ejecutarSqlMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('SET failed_attempts = 0, locked_until = NULL'),
      ['15'],
    );
  });
});

describe('registrarIntentoFallido', () => {
  it('incrementa los intentos y devuelve el estado actualizado', async () => {
    ejecutarSqlMock
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockResolvedValueOnce([
        [{
          failed_attempts: 1,
          segundos_bloqueo: 0,
        }],
        [],
      ]);

    const resultado = await registrarIntentoFallido('15');

    expect(ejecutarSqlMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('UPDATE auth_login_attempts'),
      ['15'],
    );

    expect(ejecutarSqlMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('WHERE user_id = ?'),
      ['15'],
    );

    expect(resultado).toEqual({
      intentosFallidos: 1,
      segundosBloqueo: 0,
    });
  });

  it('establece el bloqueo al alcanzar el tercer intento', async () => {
    ejecutarSqlMock
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockResolvedValueOnce([
        [{
          failed_attempts: 3,
          segundos_bloqueo: 900,
        }],
        [],
      ]);

    await expect(
      registrarIntentoFallido('15'),
    ).resolves.toEqual({
      intentosFallidos: 3,
      segundosBloqueo: 900,
    });

    expect(ejecutarSqlMock.mock.calls[0][0]).toContain(
      'INTERVAL 15 MINUTE',
    );
  });

  it('propaga errores al incrementar los intentos', async () => {
    ejecutarSqlMock.mockRejectedValueOnce(new Error('Error de actualización'));

    await expect(
      registrarIntentoFallido('15'),
    ).rejects.toThrow('Error de actualización');
  });

  it('propaga errores al consultar el estado actualizado', async () => {
    ejecutarSqlMock
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockRejectedValueOnce(new Error('Error de consulta'));

    await expect(
      registrarIntentoFallido('15'),
    ).rejects.toThrow('Error de consulta');
  });
  it('devuelve cero intentos si la consulta no encuentra el registro', async () => {
    ejecutarSqlMock
      .mockResolvedValueOnce([{ affectedRows: 0 }, []])
      .mockResolvedValueOnce([[], []]);

    await expect(
      registrarIntentoFallido('15'),
    ).resolves.toEqual({
      intentosFallidos: 0,
      segundosBloqueo: 0,
    });
  });
});

describe('reiniciarIntentosFallidos', () => {
  it('elimina el registro de intentos del usuario', async () => {
    await reiniciarIntentosFallidos('15');

    expect(ejecutarSqlMock).toHaveBeenCalledWith(
      'DELETE FROM auth_login_attempts WHERE user_id = ?',
      ['15'],
    );
  });

  it('propaga errores al reiniciar los intentos', async () => {
    ejecutarSqlMock.mockRejectedValueOnce(new Error('Error al eliminar'));

    await expect(
      reiniciarIntentosFallidos('15'),
    ).rejects.toThrow('Error al eliminar');
  });
});