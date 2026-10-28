import { describe, expect, it } from 'vitest';

import { esquemaInicioSesion } from '../../src/modules/auth/auth.schemas.js';

describe('esquemaInicioSesion', () => {
  it('recorta espacios y convierte el correo a minúsculas', () => {
    expect(esquemaInicioSesion.parse({
      correo: '  CLIENTE@EXAMPLE.COM  ',
      contrasena: 'ContrasenaSegura123',
    })).toEqual({
      correo: 'cliente@example.com',
      contrasena: 'ContrasenaSegura123',
    });
  });

  it('rechaza un correo con formato inválido', () => {
    expect(esquemaInicioSesion.safeParse({
      correo: 'correo-invalido',
      contrasena: 'ContrasenaSegura123',
    }).success).toBe(false);
  });

  it('rechaza un correo que supera los 254 caracteres', () => {
    const correo = `${'a'.repeat(245)}@example.com`;

    expect(correo.length).toBeGreaterThan(254);
    expect(esquemaInicioSesion.safeParse({
      correo,
      contrasena: 'ContrasenaSegura123',
    }).success).toBe(false);
  });

  it('rechaza una contraseña vacía', () => {
    expect(esquemaInicioSesion.safeParse({
      correo: 'cliente@example.com',
      contrasena: '',
    }).success).toBe(false);
  });

  it('rechaza una contraseña que supera los 128 caracteres', () => {
    expect(esquemaInicioSesion.safeParse({
      correo: 'cliente@example.com',
      contrasena: 'a'.repeat(129),
    }).success).toBe(false);
  });

  it('rechaza propiedades adicionales', () => {
    expect(esquemaInicioSesion.safeParse({
      correo: 'cliente@example.com',
      contrasena: 'ContrasenaSegura123',
      rol: 'ADMIN',
    }).success).toBe(false);
  });

  it('rechaza la ausencia de correo o contraseña', () => {
    expect(esquemaInicioSesion.safeParse({
      contrasena: 'ContrasenaSegura123',
    }).success).toBe(false);

    expect(esquemaInicioSesion.safeParse({
      correo: 'cliente@example.com',
    }).success).toBe(false);
  });

  it('acepta los límites permitidos de longitud', () => {
    const resultado = esquemaInicioSesion.safeParse({
      correo: `${'a'.repeat(242)}@example.com`,
      contrasena: 'a'.repeat(128),
    });

    expect(resultado.success).toBe(true);
  });
});
