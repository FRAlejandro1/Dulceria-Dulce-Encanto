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

  if (!secreto || !/^[A-Za-z0-9_-]{43}$/.test(secreto)) {
    throw new Error('JWT_SECRET debe ser una clave aleatoria de 32 bytes en base64url');
  }

  const clave = Buffer.from(secreto, 'base64url');

  if (clave.length !== 32 || clave.toString('base64url') !== secreto) {
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
    !Number.isSafeInteger(duracionAccessToken) ||
    duracionAccessToken < 60 ||
    duracionAccessToken > 900
  ) {
    throw new Error('La duración del access token debe estar entre 60 y 900 segundos');
  }

  return {
    clave,
    emisor: emisor.trim(),
    audiencia: audiencia.trim(),
    duracionAccessToken,
  };
}

export function validarConfiguracionAutenticacion(): void {
  obtenerConfiguracionJwt();
}
