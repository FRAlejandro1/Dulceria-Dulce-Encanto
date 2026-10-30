import { z } from 'zod';

export const crearPedidoSchema = z.object({
  metodoPago: z.enum(['CASH', 'TRANSFER']),
  notas: z.string().trim().max(1000).optional(),
  items: z
    .array(
      z.object({
        varianteId: z.string().regex(/^\d+$/),
        cantidad: z.number().int().positive().max(1000),
      }),
    )
    .min(1)
    .max(100),
}).strict().superRefine((datos, contexto) => {
  const variantes = datos.items.map((item) => item.varianteId);

  if (new Set(variantes).size !== variantes.length) {
    contexto.addIssue({
      code: 'custom',
      message: 'No se puede repetir una variante en el pedido.',
      path: ['items'],
    });
  }
});

export type CrearPedido = z.infer<typeof crearPedidoSchema>;