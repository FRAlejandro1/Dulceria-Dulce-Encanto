import type {
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';

import { pool } from '../../config/database.js';

type EjecutorSql = Pool | PoolConnection;

interface FilaSesion extends RowDataPacket {
  id: string;
  user_id: string;
  expires_at: Date | string;
}

export interface SesionActiva {
  id: string;
  userId: string;
  expiraEn: Date;
}

export interface DatosNuevaSesion {
  userId: string;
  hashToken: string;
  expiraEn: Date;
}

export async function crearSesion(
  datos: DatosNuevaSesion,
  ejecutor: EjecutorSql = pool,
): Promise<void> {
  await ejecutor.execute<ResultSetHeader>(
    `INSERT INTO sessions (
      user_id,
      token_hash,
      expires_at
    ) VALUES (?, ?, ?)`,
    [
      datos.userId,
      datos.hashToken,
      datos.expiraEn,
    ],
  );
}

export async function buscarSesionActivaPorHash(
  hashToken: string,
  ejecutor: EjecutorSql = pool,
): Promise<SesionActiva | null> {
  const [filas] = await ejecutor.execute<FilaSesion[]>(
    `SELECT
      CAST(id AS CHAR) AS id,
      CAST(user_id AS CHAR) AS user_id,
      expires_at
    FROM sessions
    WHERE token_hash = ?
      AND expires_at > UTC_TIMESTAMP(3)
    LIMIT 1`,
    [hashToken],
  );

  const fila = filas[0];

  if (fila === undefined) {
    return null;
  }

  const expiraEn = fila.expires_at instanceof Date
    ? fila.expires_at
    : new Date(`${fila.expires_at}Z`);

  return {
    id: fila.id,
    userId: fila.user_id,
    expiraEn,
  };
}

export async function revocarSesionPorHash(
  hashToken: string,
  ejecutor: EjecutorSql = pool,
): Promise<void> {
  await ejecutor.execute<ResultSetHeader>(
    'DELETE FROM sessions WHERE token_hash = ?',
    [hashToken],
  );
}
