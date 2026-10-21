import { describe, expect, it } from 'vitest';

import { esquemaRegistroUsuario } from '../src/modules/users/users.schemas.js';

const datosValidos = {
  nombre: 'Cliente de prueba',
  correo: ' CLIENTE@EXAMPLE.COM ',
  contrasena: 'UnaContrasenaSegura123',
};

describe('esquemaRegistroUsuario', () => {
  it('recorta el nombre y normaliza el correo', () => {
    const resultado = esquemaRegistroUsuario.safeParse(datosValidos);

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;

    expect(resultado.data).toEqual({
      nombre: 'Cliente de prueba',
      correo: 'cliente@example.com',
      contrasena: 'UnaContrasenaSegura123',
    });
  });

  it('rechaza un nombre demasiado corto', () => {
    const resultado = esquemaRegistroUsuario.safeParse({
      ...datosValidos,
      nombre: ' A ',
    });

    expect(resultado.success).toBe(false);
  });

  it('rechaza un nombre que supera el máximo permitido', () => {
    const resultado = esquemaRegistroUsuario.safeParse({
      ...datosValidos,
      nombre: 'N'.repeat(121),
    });

    expect(resultado.success).toBe(false);
  });

  it('rechaza un correo con formato inválido', () => {
    const resultado = esquemaRegistroUsuario.safeParse({
      ...datosValidos,
      correo: 'correo-invalido',
    });

    expect(resultado.success).toBe(false);
  });

  it('rechaza un correo que supera el máximo permitido', () => {
    const resultado = esquemaRegistroUsuario.safeParse({
      ...datosValidos,
      correo: `${'a'.repeat(245)}@example.com`,
    });

    expect(resultado.success).toBe(false);
  });

  it('rechaza una contraseña demasiado corta', () => {
    const resultado = esquemaRegistroUsuario.safeParse({
      ...datosValidos,
      contrasena: 'Corta123',
    });

    expect(resultado.success).toBe(false);
  });

  it('rechaza una contraseña que supera el máximo permitido', () => {
    const resultado = esquemaRegistroUsuario.safeParse({
      ...datosValidos,
      contrasena: 'A'.repeat(129),
    });

    expect(resultado.success).toBe(false);
  });

  it('rechaza propiedades adicionales como rol', () => {
    const resultado = esquemaRegistroUsuario.safeParse({
      ...datosValidos,
      rol: 'ADMIN',
    });

    expect(resultado.success).toBe(false);
  });
});
