import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  calcularHashTokenSesion,
  generarTokenSesion,
} from '../../src/shared/security/session-token.js';

describe('generarTokenSesion', () => {
  it('genera un token aleatorio de 43 caracteres y su hash SHA-256', () => {
    const resultado = generarTokenSesion();

    expect(resultado.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(resultado.hash).toBe(
      createHash('sha256')
        .update(resultado.token, 'utf8')
        .digest('hex'),
    );
    expect(resultado.hash).toHaveLength(64);
  });

  it('genera tokens distintos en llamadas sucesivas', () => {
    const primero = generarTokenSesion();
    const segundo = generarTokenSesion();

    expect(segundo.token).not.toBe(primero.token);
    expect(segundo.hash).not.toBe(primero.hash);
  });
});

describe('calcularHashTokenSesion', () => {
  it('calcula el hash SHA-256 hexadecimal del token', () => {
    const token = 'token-de-prueba';

    expect(calcularHashTokenSesion(token)).toBe(
      createHash('sha256').update(token, 'utf8').digest('hex'),
    );
  });

  it('produce el mismo hash para el mismo token', () => {
    const token = 'token-estable';

    expect(calcularHashTokenSesion(token)).toBe(
      calcularHashTokenSesion(token),
    );
  });

  it('produce hashes distintos para tokens diferentes', () => {
    expect(calcularHashTokenSesion('token-a')).not.toBe(
      calcularHashTokenSesion('token-b'),
    );
  });
});
