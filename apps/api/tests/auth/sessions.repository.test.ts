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
  buscarSesionActivaPorHash,
  crearSesion,
  revocarSesionPorHash,
} from '../../src/modules/auth/sessions.repository.js';

const fechaExpiracion = new Date('2026-10-21T12:00:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
  ejecutarSqlMock.mockResolvedValue([[], []]);
});

describe('crearSesion', () => {
  it('inserta la sesión con usuario, hash y expiración', async () => {
    const datos = {
      userId: '15',
      hashToken: 'a'.repeat(64),
      expiraEn: fechaExpiracion,
    };

    await crearSesion(datos);

    expect(ejecutarSqlMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sessions'),
      [datos.userId, datos.hashToken, datos.expiraEn],
    );
  });

  it('propaga los errores de la base de datos', async () => {
    ejecutarSqlMock.mockRejectedValueOnce(new Error('Error SQL'));

    await expect(
      crearSesion({
        userId: '15',
        hashToken: 'a'.repeat(64),
        expiraEn: fechaExpiracion,
      }),
    ).rejects.toThrow('Error SQL');
  });
});

describe('buscarSesionActivaPorHash', () => {
  it('consulta por hash y devuelve null si no encuentra una sesión', async () => {
    ejecutarSqlMock.mockResolvedValueOnce([[], []]);

    await expect(
      buscarSesionActivaPorHash('a'.repeat(64)),
    ).resolves.toBeNull();

    expect(ejecutarSqlMock).toHaveBeenCalledWith(
      expect.stringContaining('WHERE token_hash = ?'),
      ['a'.repeat(64)],
    );
  });

  it('devuelve la sesión y conserva una fecha Date', async () => {
    ejecutarSqlMock.mockResolvedValueOnce([
      [{
        id: '8',
        user_id: '15',
        expires_at: fechaExpiracion,
      }],
      [],
    ]);

    const resultado = await buscarSesionActivaPorHash('b'.repeat(64));

    expect(resultado).toEqual({
      id: '8',
      userId: '15',
      expiraEn: fechaExpiracion,
    });
  });

  it('convierte una fecha SQL de texto a Date UTC', async () => {
    ejecutarSqlMock.mockResolvedValueOnce([
      [{
        id: '9',
        user_id: '16',
        expires_at: '2026-10-22 08:30:00.000',
      }],
      [],
    ]);

    const resultado = await buscarSesionActivaPorHash('c'.repeat(64));

    expect(resultado).toEqual({
      id: '9',
      userId: '16',
      expiraEn: new Date('2026-10-22T08:30:00.000Z'),
    });
  });

  it('propaga los errores de consulta', async () => {
    ejecutarSqlMock.mockRejectedValueOnce(new Error('Error de consulta'));

    await expect(
      buscarSesionActivaPorHash('d'.repeat(64)),
    ).rejects.toThrow('Error de consulta');
  });
});

describe('revocarSesionPorHash', () => {
  it('elimina la sesión mediante su hash', async () => {
    const hash = 'e'.repeat(64);

    await revocarSesionPorHash(hash);

    expect(ejecutarSqlMock).toHaveBeenCalledWith(
      'DELETE FROM sessions WHERE token_hash = ?',
      [hash],
    );
  });

  it('propaga los errores al eliminar la sesión', async () => {
    ejecutarSqlMock.mockRejectedValueOnce(new Error('Error al eliminar'));

    await expect(
      revocarSesionPorHash('f'.repeat(64)),
    ).rejects.toThrow('Error al eliminar');
  });
});
