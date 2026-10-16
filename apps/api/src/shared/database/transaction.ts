import type { Pool, PoolConnection } from 'mysql2/promise';

import { pool as poolPredeterminado } from '../../config/database.js';
import { registrarError } from '../logging/logger.js';

export type ConexionTransaccional = PoolConnection;

export async function ejecutarTransaccion<T>(
  operacion: (conexion: ConexionTransaccional) => Promise<T>,
  origen: Pool = poolPredeterminado,
): Promise<T> {
  const conexion = await origen.getConnection();
  let transaccionIniciada = false;

  try {
    await conexion.beginTransaction();
    transaccionIniciada = true;

    const resultado = await operacion(conexion);

    await conexion.commit();
    transaccionIniciada = false;

    return resultado;
  } catch (error: unknown) {
    if (transaccionIniciada) {
      try {
        await conexion.rollback();
      } catch (errorRollback: unknown) {
        registrarError('database.rollback_failed', errorRollback);
      }
    }

    throw error;
  } finally {
    conexion.release();
  }
}
