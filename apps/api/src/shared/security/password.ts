import argon2 from 'argon2';

export async function generarHashContrasena(contrasena: string): Promise<string> {
  return argon2.hash(contrasena, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verificarContrasena(
  hash: string,
  contrasena: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, contrasena);
  } catch {
    return false;
  }
}
