import { randomBytes } from 'node:crypto';

const LONGITUD_CLAVE = 32;
const PATRON_CLAVE_BASE64URL = /^[A-Za-z0-9_-]{43}$/;

export interface ConfiguracionJwt {
  clave: Uint8Array;
  emisor: string;
  audiencia: string;
  duracionAccessToken: number;
}

export function obtenerConfiguracionJwt(
  entorno: NodeJS.ProcessEnv = process.env,
): ConfiguracionJwt {
  const secreto = entorno.JWT_SECRET;
  const emisor = entorno.JWT_ISSUER;
  const audiencia = entorno.JWT_AUDIENCE;
  const duracion = entorno.JWT_ACCESS_TOKEN_TTL_SECONDS ?? '600';

  if (!secreto || !PATRON_CLAVE_BASE64URL.test(secreto)) {
    throw new Error(
      'JWT_SECRET debe ser una clave aleatoria de 32 bytes en base64url',
    );
  }

  const clave = Buffer.from(secreto, 'base64url');

  if (
    clave.length !== LONGITUD_CLAVE
    || clave.toString('base64url') !== secreto
  ) {
    throw new Error('JWT_SECRET no tiene un formato válido');
  }

  if (!emisor?.trim()) {
    throw new Error('JWT_ISSUER es obligatorio');
  }

  if (!audiencia?.trim()) {
    throw new Error('JWT_AUDIENCE es obligatorio');
  }

  if (!/^\d+$/.test(duracion)) {
    throw new Error('JWT_ACCESS_TOKEN_TTL_SECONDS debe ser un entero');
  }

  const duracionAccessToken = Number(duracion);

  if (
    !Number.isSafeInteger(duracionAccessToken)
    || duracionAccessToken < 60
    || duracionAccessToken > 900
  ) {
    throw new Error(
      'La duración del access token debe estar entre 60 y 900 segundos',
    );
  }

  return {
    clave,
    emisor: emisor.trim(),
    audiencia: audiencia.trim(),
    duracionAccessToken,
  };
}

export function obtenerClaveCsrf(
  entorno: NodeJS.ProcessEnv = process.env,
): Uint8Array {
  const secreto = entorno.CSRF_SECRET;

  if (!secreto || !PATRON_CLAVE_BASE64URL.test(secreto)) {
    throw new Error(
      'CSRF_SECRET debe ser una clave aleatoria de 32 bytes en base64url',
    );
  }

  const clave = Buffer.from(secreto, 'base64url');

  if (
    clave.length !== LONGITUD_CLAVE
    || clave.toString('base64url') !== secreto
  ) {
    throw new Error('CSRF_SECRET no tiene un formato válido');
  }

  return clave;
}

export function validarConfiguracionAutenticacion(): void {
  obtenerConfiguracionJwt();
}

export function validarConfiguracionCsrf(): void {
  obtenerClaveCsrf();
}

/**
 * Genera una clave criptográficamente aleatoria de 32 bytes,
 * codificada en Base64URL sin relleno.
 */
export function generarSecretoCsrf(): string {
  return randomBytes(LONGITUD_CLAVE).toString('base64url');
}
