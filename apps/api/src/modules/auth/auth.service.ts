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
import {
  bloquearYObtenerIntentos,
  registrarIntentoFallido,
  reiniciarIntentosFallidos,
} from './login-attempts.repository.js';

const DURACION_SESION_MS = 8 * 60 * 60 * 1000;
const PATRON_TOKEN_SESION = /^[A-Za-z0-9_-]{43}$/;
const MAXIMO_INTENTOS = 3;

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

type ResultadoInterno =
  | { tipo: 'error'; status: number; mensaje: string }
  | { tipo: 'exito'; resultado: ResultadoInicioSesion };

function crearErrorBloqueo(segundos: number): ResultadoInterno {
  const minutos = Math.max(1, Math.ceil(segundos / 60));

  return {
    tipo: 'error',
    status: 429,
    mensaje: `Acceso bloqueado. Inténtalo de nuevo en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.`,
  };
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

  const resultado = await ejecutarTransaccion(
    async (conexion: PoolConnection): Promise<ResultadoInterno> => {
      const usuario = await buscarUsuarioPorCorreo(correo, conexion);

      if (usuario === null || !usuario.activo) {
        return {
          tipo: 'error',
          status: 401,
          mensaje: 'Correo o contraseña incorrectos',
        };
      }

      const estado = await bloquearYObtenerIntentos(usuario.id, conexion);

      if (estado.segundosBloqueo > 0) {
        return crearErrorBloqueo(estado.segundosBloqueo);
      }

      const contrasenaValida = await verificarContrasena(
        usuario.hashContrasena,
        contrasena,
      );

      if (!contrasenaValida) {
        const nuevoEstado = await registrarIntentoFallido(
          usuario.id,
          conexion,
        );

        if (nuevoEstado.intentosFallidos >= MAXIMO_INTENTOS) {
          return {
            tipo: 'error',
            status: 429,
            mensaje: 'Acceso bloqueado durante 15 minutos por demasiados intentos.',
          };
        }

        const restantes = MAXIMO_INTENTOS - nuevoEstado.intentosFallidos;

        return {
          tipo: 'error',
          status: 401,
          mensaje: `Contraseña incorrecta. Te quedan ${restantes} de ${MAXIMO_INTENTOS} intentos.`,
        };
      }

      await reiniciarIntentosFallidos(usuario.id, conexion);

      const tokenSesion = generarTokenSesion();
      const expiraEn = new Date(Date.now() + DURACION_SESION_MS);

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

      return {
        tipo: 'exito',
        resultado: {
          usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            rol: usuario.rol,
          },
          token: tokenSesion.token,
          expiraEn,
        },
      };
    },
    pool,
  );

  if (resultado.tipo === 'error') {
    throw new ErrorAplicacion(resultado.status, resultado.mensaje);
  }

  return resultado.resultado;
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