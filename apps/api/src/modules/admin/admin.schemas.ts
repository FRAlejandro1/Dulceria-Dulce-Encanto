import { z } from 'zod';

const identificadorSchema = z
  .string()
  .regex(/^[1-9]\d{0,19}$/, 'El identificador no es válido');

const nombreCategoriaSchema = z
  .string()
  .trim()
  .min(1, 'El nombre es obligatorio')
  .max(100, 'El nombre no puede superar 100 caracteres');

const nombreProductoSchema = z
  .string()
  .trim()
  .min(1, 'El nombre es obligatorio')
  .max(150, 'El nombre no puede superar 150 caracteres');

const nombreVarianteSchema = z
  .string()
  .trim()
  .min(1, 'El nombre de la variante es obligatorio')
  .max(100, 'El nombre no puede superar 100 caracteres');

const skuSchema = z
  .string()
  .trim()
  .min(1, 'El SKU es obligatorio')
  .max(64, 'El SKU no puede superar 64 caracteres');

const imagenUrlSchema = z
  .string()
  .trim()
  .max(2048, 'La URL de imagen es demasiado larga')
  .url('La URL de imagen no es válida')
  .refine(
    (valor) => {
      try {
        const protocolo = new URL(valor).protocol;
        return protocolo === 'https:' || protocolo === 'http:';
      } catch {
        return false;
      }
    },
    'La imagen debe utilizar HTTP o HTTPS',
  )
  .nullable();

const descripcionSchema = z
  .string()
  .trim()
  .max(65535, 'La descripción es demasiado larga')
  .nullable();

const precioSchema = z
  .string()
  .regex(
    /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/,
    'El precio debe ser un importe válido de hasta dos decimales',
  );

const slugSchema = z
  .string()
  .trim()
  .min(1, 'El slug es obligatorio')
  .max(120, 'El slug no puede superar 120 caracteres')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'El slug solo admite letras minúsculas, números y guiones',
  );

export const idAdminParamsSchema = z.object({
  id: identificadorSchema,
}).strict();

export const imagenVarianteParamsSchema = z.object({
  id: identificadorSchema,
  imageId: identificadorSchema,
}).strict();

export const posicionImagenSchema = z
  .string()
  .regex(/^[1-3]$/, 'La posición debe ser 1, 2 o 3')
  .transform(Number);

export const ajustarStockSchema = z.object({
  cantidad: z
    .number()
    .int('La cantidad debe ser un número entero')
    .min(0, 'El stock no puede ser negativo')
    .max(
      4_294_967_295,
      'La cantidad supera el máximo permitido',
    ),
  motivo: z
    .string()
    .trim()
    .min(3, 'El motivo debe tener al menos 3 caracteres')
    .max(500, 'El motivo no puede superar 500 caracteres'),
}).strict();

export type AjustarStock = z.infer<typeof ajustarStockSchema>;

export const crearCategoriaSchema = z.object({
  nombre: nombreCategoriaSchema,
  slug: slugSchema.optional(),
}).strict();

export const actualizarCategoriaSchema = z.object({
  nombre: nombreCategoriaSchema.optional(),
  slug: slugSchema.optional(),
  activa: z.boolean().optional(),
}).strict().refine(
  (datos) => Object.keys(datos).length > 0,
  'Debe proporcionar al menos un campo para actualizar',
);

export const crearVarianteSchema = z.object({
  nombre: nombreVarianteSchema,
  sku: skuSchema,
  precio: precioSchema,
  imagenUrl: imagenUrlSchema.optional(),
  activa: z.boolean().optional(),
}).strict();

export const actualizarVarianteSchema = z.object({
  nombre: nombreVarianteSchema.optional(),
  sku: skuSchema.optional(),
  precio: precioSchema.optional(),
  imagenUrl: imagenUrlSchema.optional(),
  activa: z.boolean().optional(),
}).strict().refine(
  (datos) => Object.keys(datos).length > 0,
  'Debe proporcionar al menos un campo para actualizar',
);

export const crearProductoSchema = z.object({
  nombre: nombreProductoSchema,
  descripcion: descripcionSchema.optional(),
  imagenUrl: imagenUrlSchema.optional(),
  categoriaId: identificadorSchema,
  activo: z.boolean().optional(),
  variantes: z.array(crearVarianteSchema).min(1).max(100),
}).strict();

export const actualizarProductoSchema = z.object({
  nombre: nombreProductoSchema.optional(),
  descripcion: descripcionSchema.optional(),
  imagenUrl: imagenUrlSchema.optional(),
  categoriaId: identificadorSchema.optional(),
  activo: z.boolean().optional(),
}).strict().refine(
  (datos) => Object.keys(datos).length > 0,
  'Debe proporcionar al menos un campo para actualizar',
);

export type CrearCategoria = z.infer<typeof crearCategoriaSchema>;
export type ActualizarCategoria = z.infer<
  typeof actualizarCategoriaSchema
>;
export type CrearProducto = z.infer<typeof crearProductoSchema>;
export type ActualizarProducto = z.infer<
  typeof actualizarProductoSchema
>;
export type CrearVariante = z.infer<typeof crearVarianteSchema>;
export type ActualizarVariante = z.infer<
  typeof actualizarVarianteSchema
>;
