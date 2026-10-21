import { z } from 'zod';

export const esquemaInicioSesion = z.object({
  correo: z.string()
    .trim()
    .email('El correo electrónico no es válido')
    .max(254, 'El correo no puede superar 254 caracteres')
    .transform((correo) => correo.toLowerCase()),
  contrasena: z.string()
    .min(1, 'La contraseña es obligatoria')
    .max(128, 'La contraseña no puede superar 128 caracteres'),
}).strict();

export type DatosInicioSesion = z.infer<typeof esquemaInicioSesion>;
