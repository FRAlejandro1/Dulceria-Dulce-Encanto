import type { Pool, PoolConnection } from 'mysql2/promise';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ejecutarTransaccion } from '../src/shared/database/transaction.js';

describe('ejecutarTransaccion', () => {
  const conexion = {
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
  };

  const origen = {
    getConnection: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    conexion.beginTransaction.mockResolvedValue(undefined);
    conexion.commit.mockResolvedValue(undefined);
    conexion.rollback.mockResolvedValue(undefined);
    origen.getConnection.mockResolvedValue(
      conexion as unknown as PoolConnection,
    );
  });

  it('confirma la transacción y devuelve el resultado', async () => {
    const resultado = await ejecutarTransaccion(
      async (conn) => {
        expect(conn).toBe(conexion);
        return { id: 42 };
      },
      origen as unknown as Pool,
    );

    expect(resultado).toEqual({ id: 42 });
    expect(conexion.beginTransaction).toHaveBeenCalledOnce();
    expect(conexion.commit).toHaveBeenCalledOnce();
    expect(conexion.rollback).not.toHaveBeenCalled();
    expect(conexion.release).toHaveBeenCalledOnce();
  });

  it('revierte la transacción si falla la operación', async () => {
    const error = new Error('Fallo de negocio');

    await expect(
      ejecutarTransaccion(
        async () => {
          throw error;
        },
        origen as unknown as Pool,
      ),
    ).rejects.toBe(error);

    expect(conexion.beginTransaction).toHaveBeenCalledOnce();
    expect(conexion.commit).not.toHaveBeenCalled();
    expect(conexion.rollback).toHaveBeenCalledOnce();
    expect(conexion.release).toHaveBeenCalledOnce();
  });

  it('intenta revertir si falla el commit', async () => {
    const error = new Error('Fallo al confirmar');
    conexion.commit.mockRejectedValueOnce(error);

    await expect(
      ejecutarTransaccion(
        async () => 'resultado',
        origen as unknown as Pool,
      ),
    ).rejects.toBe(error);

    expect(conexion.rollback).toHaveBeenCalledOnce();
    expect(conexion.release).toHaveBeenCalledOnce();
  });

  it('libera la conexión si falla el inicio de la transacción', async () => {
    const error = new Error('Fallo al iniciar');
    conexion.beginTransaction.mockRejectedValueOnce(error);

    await expect(
      ejecutarTransaccion(
        async () => 'resultado',
        origen as unknown as Pool,
      ),
    ).rejects.toBe(error);

    expect(conexion.commit).not.toHaveBeenCalled();
    expect(conexion.rollback).not.toHaveBeenCalled();
    expect(conexion.release).toHaveBeenCalledOnce();
  });

  it('propaga el error original si también falla el rollback', async () => {
    const errorOperacion = new Error('Fallo de negocio');
    conexion.rollback.mockRejectedValueOnce(
      new Error('Fallo al revertir'),
    );

    await expect(
      ejecutarTransaccion(
        async () => {
          throw errorOperacion;
        },
        origen as unknown as Pool,
      ),
    ).rejects.toBe(errorOperacion);

    expect(conexion.rollback).toHaveBeenCalledOnce();
    expect(conexion.release).toHaveBeenCalledOnce();
  });

  it('no solicita una conexión si falla la adquisición', async () => {
    const error = new Error('Pool no disponible');
    origen.getConnection.mockRejectedValueOnce(error);

    await expect(
      ejecutarTransaccion(
        async () => 'resultado',
        origen as unknown as Pool,
      ),
    ).rejects.toBe(error);

    expect(conexion.beginTransaction).not.toHaveBeenCalled();
    expect(conexion.release).not.toHaveBeenCalled();
  });
});
