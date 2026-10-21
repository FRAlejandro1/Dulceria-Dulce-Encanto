import {
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import type { Request, RequestHandler } from 'express';

import { obtenerClaveCsrf } from '../../config/auth.js';
import { ErrorAplicacion } from '../http/app-error.js';

const LONGITUD_FIRMA = 43;
const PATRON_NONCE = /^[A-Za-z0-9_-]{43}$/;
const SALT_CSRF = 'dulceria-dulce-encanto-csrf-v1';
const CONTEXTO_CSRF = 'csrf-token-signature-v1';

function firmarNonce(nonce: string): string {
  const clave = obtenerClaveCsrf();

  const claveCsrf = Buffer.from(
    hkdfSync(
      'sha256',
      clave,
      SALT_CSRF,
      CONTEXTO_CSRF,
      32,
    ),
  );

  return createHmac('sha256', claveCsrf)
    .update(nonce, 'utf8')
    .digest('base64url');
}

export function generarTokenCsrf(): string {
  const nonce = randomBytes(32).toString('base64url');

  return `${nonce}.${firmarNonce(nonce)}`;
}

export function verificarTokenCsrf(token: unknown): boolean {
  if (typeof token !== 'string') {
    return false;
  }

  const partes = token.split('.');

  if (partes.length !== 2) {
    return false;
  }

  const [nonce, firma] = partes;

  if (
    nonce === undefined
    || firma === undefined
    || !PATRON_NONCE.test(nonce)
    || firma.length !== LONGITUD_FIRMA
    || !/^[A-Za-z0-9_-]+$/.test(firma)
  ) {
    return false;
  }

  try {
    const firmaEsperada = Buffer.from(firmarNonce(nonce), 'base64url');
    const firmaRecibida = Buffer.from(firma, 'base64url');

    return firmaEsperada.length === firmaRecibida.length
      && timingSafeEqual(firmaEsperada, firmaRecibida);
  } catch {
    return false;
  }
}

function origenPermitido(req: Request): boolean {
  const origen = req.get('origin');

  if (origen === undefined) {
    return false;
  }

  const origenConfigurado = process.env.WEB_ORIGIN
    ?? 'http://localhost:5173';

  try {
    return new URL(origen).origin === origenConfigurado
      && origen === new URL(origen).origin;
  } catch {
    return false;
  }
}

export const protegerCsrf: RequestHandler = (
  req,
  _res,
  next,
): void => {
  if (!origenPermitido(req)) {
    next(
      new ErrorAplicacion(
        403,
        'El origen de la solicitud no está permitido',
      ),
    );
    return;
  }

  const token = req.get('X-CSRF-Token');

  if (!verificarTokenCsrf(token)) {
    next(
      new ErrorAplicacion(
        403,
        'El token CSRF es inválido o falta',
      ),
    );
    return;
  }

  next();
};