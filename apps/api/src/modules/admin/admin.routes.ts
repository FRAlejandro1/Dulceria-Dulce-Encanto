
import { Router } from 'express';

import {
  actualizarCategoria,
  actualizarProducto,
  actualizarVariante,
  crearCategoria,
  crearProducto,
  crearVariante,
  listarCategoriasAdmin,
  listarProductosAdmin,
} from './admin.service.js';

import {
  actualizarCategoriaSchema,
  actualizarProductoSchema,
  actualizarVarianteSchema,
  crearCategoriaSchema,
  crearProductoSchema,
  crearVarianteSchema,
  idAdminParamsSchema,
} from './admin.schemas.js';

import { autenticarUsuario } from '../../shared/security/authentication.middleware.js';
import { autorizarRoles } from '../../shared/security/authorization.middleware.js';
import { protegerCsrf } from '../../shared/security/csrf.js';
import type { SolicitudAutenticada } from '../../shared/security/authentication.middleware.js';

export const adminRouter = Router();

adminRouter.use(autenticarUsuario, autorizarRoles('ADMIN'));

adminRouter.get('/categories', async (_req, res, next) => {
  try {
    res.status(200).json({ categorias: await listarCategoriasAdmin() });
  } catch (error: unknown) {
    next(error);
  }
});

adminRouter.get('/products', async (_req, res, next) => {
  try {
    res.status(200).json({ productos: await listarProductosAdmin() });
  } catch (error: unknown) {
    next(error);
  }
});

adminRouter.post('/categories', protegerCsrf, async (req, res, next) => {
  try {
    const validacion = crearCategoriaSchema.safeParse(req.body);

    if (!validacion.success) {
      res.status(400).json({ error: 'Solicitud inválida' });
      return;
    }

    const solicitud = req as SolicitudAutenticada;
    const categoria = await crearCategoria(solicitud.usuario.id, validacion.data);

    res.status(201).json({ categoria });
  } catch (error: unknown) {
    next(error);
  }
});

adminRouter.patch('/categories/:id', protegerCsrf, async (req, res, next) => {
  try {
    const parametros = idAdminParamsSchema.safeParse(req.params);
    const validacion = actualizarCategoriaSchema.safeParse(req.body);

    if (!parametros.success || !validacion.success) {
      res.status(400).json({ error: 'Solicitud inválida' });
      return;
    }

    const solicitud = req as SolicitudAutenticada;
    await actualizarCategoria(
      solicitud.usuario.id,
      parametros.data.id,
      validacion.data,
    );

    res.status(200).json({ mensaje: 'Categoría actualizada' });
  } catch (error: unknown) {
    next(error);
  }
});

adminRouter.post('/products', protegerCsrf, async (req, res, next) => {
  try {
    const validacion = crearProductoSchema.safeParse(req.body);

    if (!validacion.success) {
      res.status(400).json({ error: 'Solicitud inválida' });
      return;
    }

    const solicitud = req as SolicitudAutenticada;
    const producto = await crearProducto(solicitud.usuario.id, validacion.data);

    res.status(201).json({ producto });
  } catch (error: unknown) {
    next(error);
  }
});

adminRouter.patch('/products/:id', protegerCsrf, async (req, res, next) => {
  try {
    const parametros = idAdminParamsSchema.safeParse(req.params);
    const validacion = actualizarProductoSchema.safeParse(req.body);

    if (!parametros.success || !validacion.success) {
      res.status(400).json({ error: 'Solicitud inválida' });
      return;
    }

    const solicitud = req as SolicitudAutenticada;
    await actualizarProducto(
      solicitud.usuario.id,
      parametros.data.id,
      validacion.data,
    );

    res.status(200).json({ mensaje: 'Producto actualizado' });
  } catch (error: unknown) {
    next(error);
  }
});

adminRouter.post(
  '/products/:id/variants',
  protegerCsrf,
  async (req, res, next) => {
    try {
      const parametros = idAdminParamsSchema.safeParse(req.params);
      const validacion = crearVarianteSchema.safeParse(req.body);

      if (!parametros.success || !validacion.success) {
        res.status(400).json({ error: 'Solicitud inválida' });
        return;
      }

      const solicitud = req as SolicitudAutenticada;
      const variante = await crearVariante(
        solicitud.usuario.id,
        parametros.data.id,
        validacion.data,
      );

      res.status(201).json({ variante });
    } catch (error: unknown) {
      next(error);
    }
  },
);

adminRouter.patch('/variants/:id', protegerCsrf, async (req, res, next) => {
  try {
    const parametros = idAdminParamsSchema.safeParse(req.params);
    const validacion = actualizarVarianteSchema.safeParse(req.body);

    if (!parametros.success || !validacion.success) {
      res.status(400).json({ error: 'Solicitud inválida' });
      return;
    }

    const solicitud = req as SolicitudAutenticada;
    await actualizarVariante(
      solicitud.usuario.id,
      parametros.data.id,
      validacion.data,
    );

    res.status(200).json({ mensaje: 'Variante actualizada' });
  } catch (error: unknown) {
    next(error);
  }
});
