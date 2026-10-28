import { z } from 'zod';

/**
 * Define y normaliza los datos aceptados durante el registro público.
 * El rol no forma parte del esquema: el cliente no puede asignarse permisos.
 */
export const esquemaRegistroUsuario = z.object({
  nombre: z.string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(120, 'El nombre no puede superar 120 caracteres'),
  correo: z.string()
    .trim()
    .email('El correo electrónico no es válido')
    .max(254, 'El correo no puede superar 254 caracteres')
    .transform((correo) => correo.toLowerCase()),
  contrasena: z.string()
    .min(12, 'La contraseña debe tener al menos 12 caracteres')
    .max(128, 'La contraseña no puede superar 128 caracteres'),
}).strict();

export type DatosRegistroUsuario = z.infer<
  typeof esquemaRegistroUsuario
>;
