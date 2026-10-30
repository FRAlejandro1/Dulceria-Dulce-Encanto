import { SignJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  crearAccessToken,
  verificarAccessToken,
} from '../../src/shared/security/jwt.js';

const secreto = Buffer.from(
  '0123456789abcdef0123456789abcdef',
).toString('base64url');

function configurarEntorno(): void {
  vi.stubEnv('JWT_SECRET', secreto);
  vi.stubEnv('JWT_ISSUER', 'dulceria-api');
  vi.stubEnv('JWT_AUDIENCE', 'dulceria-web');
  vi.stubEnv('JWT_ACCESS_TOKEN_TTL_SECONDS', '600');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

async function firmarToken(
  opciones: {
    secret?: Uint8Array;
    issuer?: string;
    audience?: string;
    subject?: string;
    role?: unknown;
    typ?: unknown;
    expiration?: number;
    includeClaims?: boolean;
  } = {},
): Promise<string> {
  const ahora = Math.floor(Date.now() / 1000);
  const clave = opciones.secret ?? Buffer.from(secreto, 'base64url');

  let token = new SignJWT({
    role: opciones.role ?? 'CLIENTE',
    typ: opciones.typ ?? 'access',
  }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' });

  if (opciones.includeClaims !== false) {
    token = token
      .setSubject(opciones.subject ?? '1')
      .setIssuer(opciones.issuer ?? 'dulceria-api')
      .setAudience(opciones.audience ?? 'dulceria-web')
      .setIssuedAt(ahora)
      .setExpirationTime(opciones.expiration ?? ahora + 300)
      .setJti('prueba-jti');
  }

  return token.sign(clave);
}

describe('servicio JWT', () => {
  it('crea y verifica un token de acceso válido', async () => {
    configurarEntorno();

    const token = await crearAccessToken({
      userId: '123',
      role: 'CLIENTE',
    });

    const resultado = await verificarAccessToken(token);

    expect(resultado.userId).toBe('123');
    expect(resultado.role).toBe('CLIENTE');
    expect(resultado.jti).toBeTypeOf('string');
    expect(resultado.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('admite el rol ADMIN', async () => {
    configurarEntorno();

    const token = await crearAccessToken({
      userId: '2',
      role: 'ADMIN',
    });

    await expect(verificarAccessToken(token)).resolves.toMatchObject({
      userId: '2',
      role: 'ADMIN',
    });
  });

  it.each(['0', '-1', '01', 'abc'])(
    'rechaza el identificador de usuario %s al crear el token',
    async (userId) => {
      configurarEntorno();

      await expect(
        crearAccessToken({ userId, role: 'CLIENTE' }),
      ).rejects.toThrow('identificador del usuario');
    },
  );

  it('rechaza un rol no permitido al crear el token', async () => {
    configurarEntorno();

    await expect(
      crearAccessToken({
        userId: '1',
        role: 'SUPERADMIN' as 'CLIENTE',
      }),
    ).rejects.toThrow('rol del usuario');
  });

  it('rechaza un token malformado', async () => {
    configurarEntorno();

    await expect(verificarAccessToken('no-es-un-jwt')).rejects.toThrow();
  });

  it('rechaza un token firmado con otra clave', async () => {
    configurarEntorno();

    const otraClave = new Uint8Array(32).fill(7);
    const token = await firmarToken({ secret: otraClave });

    await expect(verificarAccessToken(token)).rejects.toThrow();
  });

  it('rechaza un emisor diferente', async () => {
    configurarEntorno();

    const token = await firmarToken({ issuer: 'otro-emisor' });

    await expect(verificarAccessToken(token)).rejects.toThrow();
  });

  it('rechaza una audiencia diferente', async () => {
    configurarEntorno();

    const token = await firmarToken({ audience: 'otra-audiencia' });

    await expect(verificarAccessToken(token)).rejects.toThrow();
  });

  it('rechaza un token expirado', async () => {
    configurarEntorno();

    const token = await firmarToken({
      expiration: Math.floor(Date.now() / 1000) - 60,
    });

    await expect(verificarAccessToken(token)).rejects.toThrow();
  });

  it('rechaza un token sin las claims obligatorias', async () => {
    configurarEntorno();

    const token = await firmarToken({ includeClaims: false });

    await expect(verificarAccessToken(token)).rejects.toThrow();
  });

  it('rechaza un rol inválido en un token firmado', async () => {
    configurarEntorno();

    const token = await firmarToken({ role: 'SUPERADMIN' });

    await expect(verificarAccessToken(token)).rejects.toThrow(
      'contenido del access token',
    );
  });

  it('rechaza un tipo de token distinto de access', async () => {
    configurarEntorno();

    const token = await firmarToken({ typ: 'refresh' });

    await expect(verificarAccessToken(token)).rejects.toThrow(
      'contenido del access token',
    );
  });

  it('rechaza un subject que no representa un identificador válido', async () => {
    configurarEntorno();

    const token = await firmarToken({ subject: '0' });

    await expect(verificarAccessToken(token)).rejects.toThrow(
      'contenido del access token',
    );
  });
});
