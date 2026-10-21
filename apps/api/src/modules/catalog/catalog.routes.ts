import { Router } from 'express';
import { z } from 'zod';

import { listarProductosCatalogo } from './catalog.repository.js';

const filtrosCatalogoSchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  categoria: z.string().min(1).max(120).optional(),
  ordenarPrecio: z.enum(['asc', 'desc']).optional(),
});

export const catalogoRouter = Router();

catalogoRouter.get('/products', async (req, res, next) => {
  const validacion = filtrosCatalogoSchema.safeParse(req.query);

  if (!validacion.success) {
    res.status(400).json({ error: 'Solicitud inválida' });
    return;
  }

  const { q, categoria, ordenarPrecio } = validacion.data;

  try {
    const productos = await listarProductosCatalogo({
      ...(q === undefined ? {} : { busqueda: q }),
      ...(categoria === undefined ? {} : { categoria }),
      ...(ordenarPrecio === undefined ? {} : { ordenarPrecio }),
    });

    res.status(200).json({ productos });
  } catch (error) {
    next(error);
  }
});
