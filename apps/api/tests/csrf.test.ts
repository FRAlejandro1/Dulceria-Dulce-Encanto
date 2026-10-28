
import { createHmac, hkdfSync } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  generarTokenCsrf,
  protegerCsrf,
  verificarTokenCsrf,
} from '../src/shared/security/csrf.js';

import { ErrorAplicacion } from '../src/shared/http/app-error.js';

const clave = Buffer.from('0123456789abcdef0123456789abcdef');
const secretoCsrf = clave.toString('base64url');
const origen = 'http://localhost:5173';

function crearSolicitud(
  cabeceras: Record<string, string> = {},
): Request {
  return {
    get: vi.fn((nombre: string) => {
      const claveCabecera = Object.keys(cabeceras).find(
        (claveCabecera) => (
          claveCabecera.toLowerCase() === nombre.toLowerCase()
        ),
      );

      return claveCabecera === undefined
        ? undefined
        : cabeceras[claveCabecera];
    }),
  } as unknown as Request;
}

function crearFirma(nonce: string): string {
  const claveCsrf = Buffer.from(
    hkdfSync(
      'sha256',
      clave,
      'dulceria-dulce-encanto-csrf-v1',
      'csrf-token-signature-v1',
      32,
    ),
  );

  return createHmac('sha256', claveCsrf)
    .update(nonce, 'utf8')
    .digest('base64url');
}

function crearTokenValido(): string {
  const nonce = Buffer.alloc(32, 1).toString('base64url');

  return `${nonce}.${crearFirma(nonce)}`;
}

function crearSiguiente() {
  return vi.fn<NextFunction>();
}

beforeEach(() => {
  vi.stubEnv('CSRF_SECRET', secretoCsrf);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('generarTokenCsrf', () => {
  it('genera un token con nonce y firma', () => {
    const token = generarTokenCsrf();
    const partes = token.split('.');

    expect(partes).toHaveLength(2);
    expect(partes[0]).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(partes[1]).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(verificarTokenCsrf(token)).toBe(true);
  });

  it('rechaza generar un token cuando falta la clave CSRF', () => {
    vi.stubEnv('CSRF_SECRET', '');

    expect(() => generarTokenCsrf()).toThrow('CSRF_SECRET');
  });
});

describe('verificarTokenCsrf', () => {
  it.each([
    undefined,
    null,
    123,
    {},
    '',
    'sin-separador',
    'a.b.c',
    `${'x'.repeat(42)}.${'y'.repeat(43)}`,
    `${'x'.repeat(43)}.${'y'.repeat(42)}`,
    `${'x'.repeat(43)}.${'!'.repeat(43)}`,
  ])('rechaza un token malformado: %s', (token) => {
    expect(verificarTokenCsrf(token)).toBe(false);
  });

  it('rechaza una firma incorrecta', () => {
    const nonce = Buffer.alloc(32, 2).toString('base64url');
    const firmaIncorrecta = Buffer.alloc(32, 3).toString('base64url');

    expect(
      verificarTokenCsrf(`${nonce}.${firmaIncorrecta}`),
    ).toBe(false);
  });

  it('rechaza el token si falta la configuración de firma', () => {
    vi.stubEnv('CSRF_SECRET', '');

    expect(verificarTokenCsrf(crearTokenValido())).toBe(false);
  });
});

describe('protegerCsrf', () => {
  it('rechaza una solicitud sin Origin', () => {
    const next = crearSiguiente();

    protegerCsrf(crearSolicitud(), {} as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ErrorAplicacion);
    expect(next.mock.calls[0]?.[0]).toMatchObject({
      status: 403,
      mensajePublico: 'El origen de la solicitud no está permitido',
    });
  });

  it('rechaza un origen distinto al configurado', () => {
    const next = crearSiguiente();

    protegerCsrf(
      crearSolicitud({ origin: 'https://sitio-malicioso.example' }),
      {} as Response,
      next,
    );

    expect(next.mock.calls[0]?.[0]).toMatchObject({ status: 403 });
  });

  it('rechaza un Origin con ruta adicional', () => {
    const next = crearSiguiente();

    protegerCsrf(
      crearSolicitud({ origin: `${origen}/ruta` }),
      {} as Response,
      next,
    );

    expect(next.mock.calls[0]?.[0]).toMatchObject({ status: 403 });
  });

  it('rechaza un Origin con formato inválido', () => {
    const next = crearSiguiente();

    protegerCsrf(
      crearSolicitud({ origin: 'no-es-una-url' }),
      {} as Response,
      next,
    );

    expect(next.mock.calls[0]?.[0]).toMatchObject({ status: 403 });
  });

  it('rechaza un token CSRF ausente', () => {
    const next = crearSiguiente();

    protegerCsrf(
      crearSolicitud({ origin: origen }),
      {} as Response,
      next,
    );

    expect(next.mock.calls[0]?.[0]).toMatchObject({
      status: 403,
      mensajePublico: 'El token CSRF es inválido o falta',
    });
  });

  it('permite una solicitud con origen y token válidos', () => {
    const next = crearSiguiente();

    protegerCsrf(
      crearSolicitud({
        origin: origen,
        'X-CSRF-Token': crearTokenValido(),
      }),
      {} as Response,
      next,
    );

    expect(next).toHaveBeenCalledWith();
  });

  it('usa WEB_ORIGIN cuando está configurado', () => {
    vi.stubEnv('WEB_ORIGIN', 'https://frontend.example');
    const next = crearSiguiente();

    protegerCsrf(
      crearSolicitud({
        origin: 'https://frontend.example',
        'X-CSRF-Token': crearTokenValido(),
      }),
      {} as Response,
      next,
    );

    expect(next).toHaveBeenCalledWith();
  });
});
