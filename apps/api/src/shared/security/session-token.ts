import { createHash, randomBytes } from 'node:crypto';

export interface TokenSesion {
  token: string;
  hash: string;
}

export function generarTokenSesion(): TokenSesion {
  const token = randomBytes(32).toString('base64url');

  return {
    token,
    hash: calcularHashTokenSesion(token),
  };
}

export function calcularHashTokenSesion(token: string): string {
  return createHash('sha256')
    .update(token, 'utf8')
    .digest('hex');
}
