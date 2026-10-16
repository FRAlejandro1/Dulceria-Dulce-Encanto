
import mysql from 'mysql2/promise';

function obtenerNumeroEnv(nombre: string, predeterminado: number): number {
  const valor = process.env[nombre];

  if (valor === undefined || valor.trim() === '') {
    return predeterminado;
  }

  const numero = Number(valor);

  if (!Number.isInteger(numero) || numero < 1) {
    throw new Error(`${nombre} debe ser un entero positivo`);
  }

  return numero;
}

export function validarConfiguracionBaseDatos(): void {
  const obligatorias = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const faltantes = obligatorias.filter((nombre) => {
    const valor = process.env[nombre];
    return valor === undefined || valor.trim() === '';
  });

  if (faltantes.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias para MySQL: ${faltantes.join(', ')}`,
    );
  }

  obtenerNumeroEnv('DB_PORT', 3306);
  obtenerNumeroEnv('DB_CONNECTION_LIMIT', 10);
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: obtenerNumeroEnv('DB_PORT', 3306),
  user: process.env.DB_USER ?? 'dulceria_app',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'dulceria_dulce_encanto',
  waitForConnections: true,
  connectionLimit: obtenerNumeroEnv('DB_CONNECTION_LIMIT', 10),
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z',
  dateStrings: true,
  enableKeepAlive: true,
});
