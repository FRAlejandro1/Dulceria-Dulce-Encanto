import { randomUUID } from 'node:crypto';

import { SignJWT, jwtVerify } from 'jose';

import { obtenerConfiguracionJwt } from '../../config/auth.js';
import { esRolUsuario, type RolUsuario } from './roles.js';

export type { RolUsuario } from './roles.js';

export interface DatosAccessToken {
  userId: string;
  role: RolUsuario;
}

export interface AccessTokenVerificado {
  userId: string;
  role: RolUsuario;
  jti: string;
  exp: number;
}

export async function crearAccessToken(
  datos: DatosAccessToken,
): Promise<string> {
  if (!/^[1-9]\d*$/.test(datos.userId)) {
    throw new Error('El identificador del usuario no es válido');
  }

  if (!esRolUsuario(datos.role)) {
    throw new Error('El rol del usuario no es válido');
  }

  const configuracion = obtenerConfiguracionJwt();
  const ahora = Math.floor(Date.now() / 1000);

  return new SignJWT({
    role: datos.role,
    typ: 'access',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(datos.userId)
    .setIssuer(configuracion.emisor)
    .setAudience(configuracion.audiencia)
    .setIssuedAt(ahora)
    .setExpirationTime(ahora + configuracion.duracionAccessToken)
    .setJti(randomUUID())
    .sign(configuracion.clave);
}

export async function verificarAccessToken(
  token: string,
): Promise<AccessTokenVerificado> {
  const configuracion = obtenerConfiguracionJwt();

  const { payload } = await jwtVerify(token, configuracion.clave, {
    algorithms: ['HS256'],
    issuer: configuracion.emisor,
    audience: configuracion.audiencia,
    requiredClaims: ['sub', 'iat', 'exp', 'jti', 'typ', 'role'],
  });

  if (
    typeof payload.sub !== 'string' ||
    !/^[1-9]\d*$/.test(payload.sub) ||
    typeof payload.jti !== 'string' ||
    typeof payload.exp !== 'number' ||
    payload.typ !== 'access' ||
    !esRolUsuario(payload.role)
  ) {
    throw new Error('El contenido del access token no es válido');
  }

  return {
    userId: payload.sub,
    role: payload.role,
    jti: payload.jti,
    exp: payload.exp,
  };
}
