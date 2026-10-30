import { describe, expect, it } from 'vitest';

import { esRolUsuario, ROLES_USUARIO } from '../../src/shared/security/roles.js';

describe('roles de usuario', () => {
  it('define exclusivamente los roles CLIENTE y ADMIN', () => {
    expect(ROLES_USUARIO).toEqual(['CLIENTE', 'ADMIN']);
  });

  it('acepta el rol CLIENTE', () => {
    expect(esRolUsuario('CLIENTE')).toBe(true);
  });

  it('acepta el rol ADMIN', () => {
    expect(esRolUsuario('ADMIN')).toBe(true);
  });

  it.each([
    ['INVITADO', 'un rol no persistido'],
    ['', 'una cadena vacía'],
    [null, 'null'],
    [undefined, 'undefined'],
    [1, 'un número'],
    [{}, 'un objeto'],
  ])('rechaza %s porque es %s', (valor) => {
    expect(esRolUsuario(valor)).toBe(false);
  });
});
