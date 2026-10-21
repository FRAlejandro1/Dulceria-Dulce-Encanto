import type { PoolConnection } from 'mysql2/promise';

import { pool } from '../../config/database.js';
import { registrarAuditoria } from '../audit/audit.repository.js';
import { ejecutarTransaccion } from '../../shared/database/transaction.js';
import { ErrorAplicacion } from '../../shared/http/app-error.js';
import {
  generarHashContrasena,
  verificarContrasena,
} from '../../shared/security/password.js';
import {
  calcularHashTokenSesion,
  generarTokenSesion,
} from '../../shared/security/session-token.js';
import type { RolUsuario } from '../../shared/security/roles.js';
import { buscarUsuarioPorCorreo } from '../users/users.repository.js';
import { esquemaInicioSesion } from './auth.schemas.js';
import {
  buscarSesionActivaPorHash,
  crearSesion,
  revocarSesionPorHash,
} from './sessions.repository.js';

const DURACION_SESION_MS = 8 * 60 * 60 * 1000;
const PATRON_TOKEN_SESION = /^[A-Za-z0-9_-]{43}$/;

export interface UsuarioSesion {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
}

export interface ResultadoInicioSesion {
  usuario: UsuarioSesion;
  token: string;
  expiraEn: Date;
}

export async function iniciarSesion(
  entrada: unknown,
): Promise<ResultadoInicioSesion> {
  const validacion = esquemaInicioSesion.safeParse(entrada);

  if (!validacion.success) {
    throw new ErrorAplicacion(
      400,
      'Los datos de inicio de sesión no son válidos',
    );
  }

  const { correo, contrasena } = validacion.data;
  const usuario = await buscarUsuarioPorCorreo(correo);

  if (usuario === null) {
    throw new ErrorAplicacion(401, 'Correo o contraseña incorrectos');
  }

  const contrasenaValida = await verificarContrasena(
    usuario.hashContrasena,
    contrasena,
  );

  if (!contrasenaValida || !usuario.activo) {
    throw new ErrorAplicacion(401, 'Correo o contraseña incorrectos');
  }

  const tokenSesion = generarTokenSesion();
  const expiraEn = new Date(Date.now() + DURACION_SESION_MS);

  await ejecutarTransaccion(async (conexion: PoolConnection) => {
    await crearSesion(
      {
        userId: usuario.id,
        hashToken: tokenSesion.hash,
        expiraEn,
      },
      conexion,
    );

    await registrarAuditoria(conexion, {
      actorUserId: usuario.id,
      action: 'USER_LOGIN',
      entityType: 'session',
      details: {
        rol: usuario.rol,
      },
    });
  }, pool);

  return {
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    },
    token: tokenSesion.token,
    expiraEn,
  };
}

export async function cerrarSesion(token: unknown): Promise<void> {
  if (
    typeof token !== 'string'
    || !PATRON_TOKEN_SESION.test(token)
  ) {
    return;
  }

  const hashToken = calcularHashTokenSesion(token);
  const sesion = await buscarSesionActivaPorHash(hashToken);

  if (sesion === null) {
    return;
  }

  await ejecutarTransaccion(async (conexion: PoolConnection) => {
    await revocarSesionPorHash(hashToken, conexion);

    await registrarAuditoria(conexion, {
      actorUserId: sesion.userId,
      action: 'USER_LOGOUT',
      entityType: 'session',
      entityId: sesion.id,
    });
  }, pool);
}

export { generarHashContrasena };