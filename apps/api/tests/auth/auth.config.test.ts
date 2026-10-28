
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  generarSecretoCsrf,
  obtenerClaveCsrf,
  obtenerConfiguracionJwt,
  validarConfiguracionAutenticacion,
  validarConfiguracionCsrf,
} from '../../src/config/auth.js';

const secretoValido = Buffer.from(
  '0123456789abcdef0123456789abcdef',
).toString('base64url');

function configurarEntorno(): void {
  vi.stubEnv('JWT_SECRET', secretoValido);
  vi.stubEnv('JWT_ISSUER', 'dulceria-api');
  vi.stubEnv('JWT_AUDIENCE', 'dulceria-web');
  vi.stubEnv('JWT_ACCESS_TOKEN_TTL_SECONDS', '600');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('configuración JWT', () => {
  it('devuelve la configuración válida', () => {
    configurarEntorno();

    expect(obtenerConfiguracionJwt()).toEqual({
      clave: Buffer.from(secretoValido, 'base64url'),
      emisor: 'dulceria-api',
      audiencia: 'dulceria-web',
      duracionAccessToken: 600,
    });
  });

  it('valida la configuración de autenticación', () => {
    configurarEntorno();

    expect(validarConfiguracionAutenticacion()).toBeUndefined();
  });

  it('rechaza una clave ausente', () => {
    configurarEntorno();
    vi.stubEnv('JWT_SECRET', '');

    expect(() => obtenerConfiguracionJwt()).toThrow('JWT_SECRET');
  });

  it('rechaza una clave con formato incorrecto', () => {
    configurarEntorno();
    vi.stubEnv('JWT_SECRET', 'clave-invalida');

    expect(() => obtenerConfiguracionJwt()).toThrow('JWT_SECRET');
  });

  it('rechaza una clave base64url que no representa 32 bytes', () => {
    configurarEntorno();
    vi.stubEnv('JWT_SECRET', Buffer.from('corta').toString('base64url'));

    expect(() => obtenerConfiguracionJwt()).toThrow('JWT_SECRET');
  });

  it('rechaza un emisor ausente', () => {
    configurarEntorno();
    vi.stubEnv('JWT_ISSUER', '   ');

    expect(() => obtenerConfiguracionJwt()).toThrow('JWT_ISSUER');
  });

  it('rechaza una audiencia ausente', () => {
    configurarEntorno();
    vi.stubEnv('JWT_AUDIENCE', '');

    expect(() => obtenerConfiguracionJwt()).toThrow('JWT_AUDIENCE');
  });

  it.each(['abc', '1.5', '-1', ''])(
    'rechaza una duración no entera: %s',
    (duracion) => {
      configurarEntorno();
      vi.stubEnv('JWT_ACCESS_TOKEN_TTL_SECONDS', duracion);

      expect(() => obtenerConfiguracionJwt()).toThrow(
        'JWT_ACCESS_TOKEN_TTL_SECONDS debe ser un entero',
      );
    },
  );

  it.each(['59', '901', '999999999999999999999'])(
    'rechaza una duración fuera del rango permitido: %s',
    (duracion) => {
      configurarEntorno();
      vi.stubEnv('JWT_ACCESS_TOKEN_TTL_SECONDS', duracion);

      expect(() => obtenerConfiguracionJwt()).toThrow(
        'La duración del access token debe estar entre 60 y 900 segundos',
      );
    },
  );

  it('acepta la duración mínima permitida', () => {
    configurarEntorno();
    vi.stubEnv('JWT_ACCESS_TOKEN_TTL_SECONDS', '60');

    expect(obtenerConfiguracionJwt().duracionAccessToken).toBe(60);
  });

  it('acepta la duración máxima permitida', () => {
    configurarEntorno();
    vi.stubEnv('JWT_ACCESS_TOKEN_TTL_SECONDS', '900');

    expect(obtenerConfiguracionJwt().duracionAccessToken).toBe(900);
  });

  it('recorta espacios del emisor y de la audiencia', () => {
    configurarEntorno();
    vi.stubEnv('JWT_ISSUER', ' dulceria-api ');
    vi.stubEnv('JWT_AUDIENCE', ' dulceria-web ');

    const configuracion = obtenerConfiguracionJwt();

    expect(configuracion.emisor).toBe('dulceria-api');
    expect(configuracion.audiencia).toBe('dulceria-web');
  });

  it('rechaza una duración que excede los enteros seguros', () => {
    configurarEntorno();
    vi.stubEnv('JWT_ACCESS_TOKEN_TTL_SECONDS', '9007199254740992');

    expect(() => obtenerConfiguracionJwt()).toThrow(
      'La duración del access token debe estar entre 60 y 900 segundos',
    );
  });

  it('rechaza un secreto base64url no canónico', () => {
    configurarEntorno();
    vi.stubEnv('JWT_SECRET', `${'A'.repeat(42)}B`);

    expect(() => obtenerConfiguracionJwt()).toThrow(
      'JWT_SECRET no tiene un formato válido',
    );
  });

  it('usa 600 segundos cuando no se configura la duración', () => {
    const entorno = {
      JWT_SECRET: secretoValido,
      JWT_ISSUER: 'dulceria-api',
      JWT_AUDIENCE: 'dulceria-web',
    } as NodeJS.ProcessEnv;

    expect(obtenerConfiguracionJwt(entorno).duracionAccessToken).toBe(600);
  });
});

describe('configuración CSRF', () => {
  it('devuelve la clave CSRF válida', () => {
    vi.stubEnv('CSRF_SECRET', secretoValido);

    expect(obtenerClaveCsrf()).toEqual(
      Buffer.from(secretoValido, 'base64url'),
    );
  });

  it('rechaza una clave CSRF ausente', () => {
    vi.stubEnv('CSRF_SECRET', '');

    expect(() => obtenerClaveCsrf()).toThrow('CSRF_SECRET');
  });

  it('rechaza una clave CSRF con formato incorrecto', () => {
    vi.stubEnv('CSRF_SECRET', 'clave-invalida');

    expect(() => obtenerClaveCsrf()).toThrow('CSRF_SECRET');
  });

  it('rechaza una clave CSRF que no representa 32 bytes', () => {
    vi.stubEnv(
      'CSRF_SECRET',
      Buffer.from('corta').toString('base64url'),
    );

    expect(() => obtenerClaveCsrf()).toThrow('CSRF_SECRET');
  });

  it('rechaza una clave CSRF base64url no canónica', () => {
    vi.stubEnv('CSRF_SECRET', `${'A'.repeat(42)}B`);

    expect(() => obtenerClaveCsrf()).toThrow(
      'CSRF_SECRET no tiene un formato válido',
    );
  });

  it('valida la configuración CSRF', () => {
    vi.stubEnv('CSRF_SECRET', secretoValido);

    expect(validarConfiguracionCsrf()).toBeUndefined();
  });

  it('genera una clave CSRF aleatoria de 32 bytes', () => {
    const primera = generarSecretoCsrf();
    const segunda = generarSecretoCsrf();

    expect(primera).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(primera, 'base64url')).toHaveLength(32);
    expect(segunda).not.toBe(primera);
  });
});
