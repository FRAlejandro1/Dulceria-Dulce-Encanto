export const ROLES_USUARIO = ['CLIENTE', 'ADMIN'] as const;

export type RolUsuario = (typeof ROLES_USUARIO)[number];

export function esRolUsuario(valor: unknown): valor is RolUsuario {
  return valor === 'CLIENTE' || valor === 'ADMIN';
}