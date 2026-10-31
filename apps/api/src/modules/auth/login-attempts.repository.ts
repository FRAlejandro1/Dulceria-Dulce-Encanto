import type {
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';

import { pool } from '../../config/database.js';

type EjecutorSql = Pool | PoolConnection;

interface FilaIntentos extends RowDataPacket {
  failed_attempts: number;
  segundos_bloqueo: number | null;
}

export interface EstadoIntentosInicioSesion {
  intentosFallidos: number;
  segundosBloqueo: number;
}

async function consultarEstado(
  userId: string,
  ejecutor: EjecutorSql,
): Promise<EstadoIntentosInicioSesion> {
  const [filas] = await ejecutor.execute<FilaIntentos[]>(
    `SELECT
      failed_attempts,
      GREATEST(
        COALESCE(
          TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(3), locked_until),
          0
        ),
        0
      ) AS segundos_bloqueo
    FROM auth_login_attempts
    WHERE user_id = ?
    LIMIT 1`,
    [userId],
  );

  const fila = filas[0];

  return {
    intentosFallidos: Number(fila?.failed_attempts ?? 0),
    segundosBloqueo: Number(fila?.segundos_bloqueo ?? 0),
  };
}

export async function bloquearYObtenerIntentos(
  userId: string,
  ejecutor: EjecutorSql = pool,
): Promise<EstadoIntentosInicioSesion> {
  await ejecutor.execute<ResultSetHeader>(
    `INSERT IGNORE INTO auth_login_attempts (user_id)
     VALUES (?)`,
    [userId],
  );

  const [filas] = await ejecutor.execute<FilaIntentos[]>(
    `SELECT
      failed_attempts,
      GREATEST(
        COALESCE(
          TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(3), locked_until),
          0
        ),
        0
      ) AS segundos_bloqueo
    FROM auth_login_attempts
    WHERE user_id = ?
    LIMIT 1
    FOR UPDATE`,
    [userId],
  );

  const fila = filas[0];

  if (
    fila !== undefined
    && Number(fila.failed_attempts) >= 3
    && Number(fila.segundos_bloqueo ?? 0) === 0
  ) {
    await ejecutor.execute<ResultSetHeader>(
      `UPDATE auth_login_attempts
       SET failed_attempts = 0, locked_until = NULL
       WHERE user_id = ?`,
      [userId],
    );

    return {
      intentosFallidos: 0,
      segundosBloqueo: 0,
    };
  }

  return {
    intentosFallidos: Number(fila?.failed_attempts ?? 0),
    segundosBloqueo: Number(fila?.segundos_bloqueo ?? 0),
  };
}

export async function registrarIntentoFallido(
  userId: string,
  ejecutor: EjecutorSql = pool,
): Promise<EstadoIntentosInicioSesion> {
  await ejecutor.execute<ResultSetHeader>(
    `UPDATE auth_login_attempts
     SET
       locked_until = CASE
         WHEN failed_attempts >= 2
           THEN DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 15 MINUTE)
         ELSE NULL
       END,
       failed_attempts = LEAST(failed_attempts + 1, 3)
     WHERE user_id = ?`,
    [userId],
  );

  return consultarEstado(userId, ejecutor);
}

export async function reiniciarIntentosFallidos(
  userId: string,
  ejecutor: EjecutorSql = pool,
): Promise<void> {
  await ejecutor.execute<ResultSetHeader>(
    'DELETE FROM auth_login_attempts WHERE user_id = ?',
    [userId],
  );
}