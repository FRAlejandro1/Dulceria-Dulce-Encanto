import { describe, expect, it } from 'vitest';

import {
  generarHashContrasena,
  verificarContrasena,
} from '../../src/shared/security/password.js';

describe('servicio de contraseñas', () => {
  it('genera un hash Argon2id que no expone la contraseña', async () => {
    const contrasena = 'Contrasena-de-prueba-2026';
    const hash = await generarHashContrasena(contrasena);

    expect(hash).not.toBe(contrasena);
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verificarContrasena(hash, contrasena)).toBe(true);
  });

  it('genera hashes diferentes para la misma contraseña', async () => {
    const contrasena = 'Contrasena-de-prueba-2026';

    const primero = await generarHashContrasena(contrasena);
    const segundo = await generarHashContrasena(contrasena);

    expect(primero).not.toBe(segundo);
    expect(await verificarContrasena(primero, contrasena)).toBe(true);
    expect(await verificarContrasena(segundo, contrasena)).toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await generarHashContrasena('Contrasena-correcta');

    expect(await verificarContrasena(hash, 'Contrasena-incorrecta')).toBe(false);
  });

  it('rechaza un hash malformado sin propagar el error', async () => {
    expect(await verificarContrasena('hash-invalido', 'cualquier-valor')).toBe(false);
  });
});
