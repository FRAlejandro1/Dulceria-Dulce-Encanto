import type {
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';

import { pool } from '../../config/database.js';
import {
  esRolUsuario,
  type RolUsuario,
} from '../../shared/security/roles.js';

export type { RolUsuario } from '../../shared/security/roles.js';

/**
 * Datos internos de una cuenta.
 * El hash de contraseña nunca debe incluirse en respuestas HTTP.
 */
export interface UsuarioAutenticacion {
  id: string;
  nombre: string;
  correo: string;
  hashContrasena: string;
  rol: RolUsuario;
  activo: boolean;
}

export interface DatosNuevoUsuario {
  nombre: string;
  correo: string;
  hashContrasena: string;
}

interface FilaUsuario extends RowDataPacket {
  id: string;
  nombre: string;
  correo: string;
  hash_contrasena: string;
  rol: unknown;
  activo: number;
}

/**
 * Pool y conexión transaccional comparten las operaciones SQL necesarias.
 * Inyectar la conexión permite que varias operaciones participen en la
 * misma transacción sin abrir consultas fuera de ella.
 */
type EjecutorSql = Pool | PoolConnection;

function convertirFilaUsuario(
  fila: FilaUsuario,
): UsuarioAutenticacion {
  if (!esRolUsuario(fila.rol)) {
    throw new Error('El rol del usuario recuperado no es válido');
  }

  return {
    id: fila.id,
    nombre: fila.nombre,
    correo: fila.correo,
    hashContrasena: fila.hash_contrasena,
    rol: fila.rol,
    activo: fila.activo === 1,
  };
}

const consultaUsuario = `
  SELECT
    CAST(id AS CHAR) AS id,
    name AS nombre,
    email AS correo,
    password_hash AS hash_contrasena,
    role AS rol,
    is_active AS activo
  FROM users
`;

/**
 * Busca por correo. La normalización corresponde al servicio.
 * Puede recibir una conexión para mantener la consulta dentro
 * de una transacción existente.
 */
export async function buscarUsuarioPorCorreo(
  correo: string,
  ejecutor: EjecutorSql = pool,
): Promise<UsuarioAutenticacion | null> {
  const [filas] = await ejecutor.execute<FilaUsuario[]>(
    `${consultaUsuario}
     WHERE email = ?
     LIMIT 1`,
    [correo],
  );

  const fila = filas[0];
  return fila === undefined ? null : convertirFilaUsuario(fila);
}

/**
 * Busca por identificador y conserva BIGINT como cadena.
 */
export async function buscarUsuarioPorId(
  id: string,
  ejecutor: EjecutorSql = pool,
): Promise<UsuarioAutenticacion | null> {
  const [filas] = await ejecutor.execute<FilaUsuario[]>(
    `${consultaUsuario}
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  const fila = filas[0];
  return fila === undefined ? null : convertirFilaUsuario(fila);
}

/**
 * Inserta y recupera la cuenta utilizando el mismo ejecutor SQL.
 * Cuando se proporciona una conexión transaccional, ambas consultas
 * quedan dentro de la transacción del servicio.
 */
export async function crearUsuario(
  datos: DatosNuevoUsuario,
  ejecutor: EjecutorSql = pool,
): Promise<UsuarioAutenticacion> {
  await ejecutor.execute<ResultSetHeader>(
    `INSERT INTO users (
      name,
      email,
      password_hash
    ) VALUES (?, ?, ?)`,
    [
      datos.nombre,
      datos.correo,
      datos.hashContrasena,
    ],
  );

  const usuario = await buscarUsuarioPorCorreo(
    datos.correo,
    ejecutor,
  );

  if (usuario === null) {
    throw new Error(
      'No se pudo recuperar el usuario después de crearlo',
    );
  }

  return usuario;
}
