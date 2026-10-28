import { Router } from 'express';

import {
  ajustarStock,
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
  ajustarStockSchema,
  actualizarCategoriaSchema,
  actualizarProductoSchema,
  actualizarVarianteSchema,
  crearCategoriaSchema,
  crearProductoSchema,
  crearVarianteSchema,
  idAdminParamsSchema,
  imagenVarianteParamsSchema,
  posicionImagenSchema,
} from './admin.schemas.js';

import {
  cargarImagenCategoria,
  cargarImagenProducto,
  cargarImagenPrincipalVariante,
  cargarImagenVariante,
  listarImagenesAdicionalesVariante,
  eliminarImagenCategoria,
  eliminarImagenProducto,
  eliminarImagenPrincipalVariante,
  eliminarImagenVariante,
} from './admin-images.service.js';

import { recibirImagen } from './storage/image-upload.middleware.js';
import { autenticarUsuario } from '../../shared/security/authentication.middleware.js';
import { autorizarRoles } from '../../shared/security/authorization.middleware.js';
import { protegerCsrf } from '../../shared/security/csrf.js';
import type { SolicitudAutenticada } from '../../shared/security/authentication.middleware.js';

export const adminRouter = Router();

adminRouter.use(autenticarUsuario, autorizarRoles('ADMIN'));

adminRouter.get('/categories', async (_req, res) => {
  res.status(200).json({ categorias: await listarCategoriasAdmin() });
});

adminRouter.get('/products', async (_req, res) => {
  res.status(200).json({ productos: await listarProductosAdmin() });
});

adminRouter.post('/categories', protegerCsrf, async (req, res) => {
  const validacion = crearCategoriaSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({ error: 'Solicitud inválida' });
    return;
  }

  const solicitud = req as SolicitudAutenticada;
  const categoria = await crearCategoria(
    solicitud.usuario.id,
    validacion.data,
  );

  res.status(201).json({ categoria });
});

adminRouter.patch('/categories/:id', protegerCsrf, async (req, res) => {
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
});

adminRouter.post(
  '/categories/:id/image',
  protegerCsrf,
  recibirImagen,
  async (req, res) => {
    const parametros = idAdminParamsSchema.safeParse(req.params);

    if (!parametros.success) {
      res.status(400).json({
        error: 'Identificador de categoría inválido',
      });
      return;
    }

    const solicitud = req as SolicitudAutenticada;
    const categoria = await cargarImagenCategoria(
      solicitud.usuario.id,
      parametros.data.id,
      req.file,
    );

    res.status(200).json({ categoria });
  },
);

adminRouter.delete(
  '/categories/:id/image',
  protegerCsrf,
  async (req, res) => {
    const parametros = idAdminParamsSchema.safeParse(req.params);

    if (!parametros.success) {
      res.status(400).json({
        error: 'Identificador de categoría inválido',
      });
      return;
    }

    const solicitud = req as SolicitudAutenticada;
    await eliminarImagenCategoria(
      solicitud.usuario.id,
      parametros.data.id,
    );

    res.status(200).json({
      mensaje: 'Imagen de categoría eliminada',
    });
  },
);

adminRouter.post(
  '/products/:id/image',
  protegerCsrf,
  recibirImagen,
  async (req, res) => {
    const parametros = idAdminParamsSchema.safeParse(req.params);

    if (!parametros.success) {
      res.status(400).json({ error: 'Identificador de producto inválido' });
      return;
    }

    const solicitud = req as SolicitudAutenticada;
    const imagen = await cargarImagenProducto(
      solicitud.usuario.id,
      parametros.data.id,
      req.file,
    );

    res.status(200).json({ imagen });
  },
);

adminRouter.delete(
  '/products/:id/image',
  protegerCsrf,
  async (req, res) => {
    const parametros = idAdminParamsSchema.safeParse(req.params);

    if (!parametros.success) {
      res.status(400).json({ error: 'Identificador de producto inválido' });
      return;
    }

    const solicitud = req as SolicitudAutenticada;
    await eliminarImagenProducto(
      solicitud.usuario.id,
      parametros.data.id,
    );

    res.status(200).json({ mensaje: 'Imagen de producto eliminada' });
  },
);

adminRouter.post('/products', protegerCsrf, async (req, res) => {
  const validacion = crearProductoSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({ error: 'Solicitud inválida' });
    return;
  }

  const solicitud = req as SolicitudAutenticada;
  const producto = await crearProducto(
    solicitud.usuario.id,
    validacion.data,
  );

  res.status(201).json({ producto });
});

adminRouter.patch('/products/:id', protegerCsrf, async (req, res) => {
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
});

adminRouter.post(
  '/products/:id/variants',
  protegerCsrf,
  async (req, res) => {
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
  },
);

adminRouter.post(
  '/variants/:id/image',
  protegerCsrf,
  recibirImagen,
  async (req, res) => {
    const parametros = idAdminParamsSchema.safeParse(req.params);

    if (!parametros.success) {
      res.status(400).json({ error: 'Identificador de variante inválido' });
      return;
    }

    const solicitud = req as SolicitudAutenticada;
    const imagen = await cargarImagenPrincipalVariante(
      solicitud.usuario.id,
      parametros.data.id,
      req.file,
    );

    res.status(200).json({ imagen });
  },
);

adminRouter.delete(
  '/variants/:id/image',
  protegerCsrf,
  async (req, res) => {
    const parametros = idAdminParamsSchema.safeParse(req.params);

    if (!parametros.success) {
      res.status(400).json({ error: 'Identificador de variante inválido' });
      return;
    }

    const solicitud = req as SolicitudAutenticada;
    await eliminarImagenPrincipalVariante(
      solicitud.usuario.id,
      parametros.data.id,
    );

    res.status(200).json({
      mensaje: 'Imagen principal de variante eliminada',
    });
  },
);

adminRouter.patch('/variants/:id', protegerCsrf, async (req, res) => {
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
});

adminRouter.patch(
  '/variants/:id/stock',
  protegerCsrf,
  async (req, res) => {
    const parametros = idAdminParamsSchema.safeParse(req.params);
    const validacion = ajustarStockSchema.safeParse(req.body);

    if (!parametros.success || !validacion.success) {
      res.status(400).json({
        error: 'Los datos del ajuste de stock no son válidos.',
      });
      return;
    }

    const solicitud = req as SolicitudAutenticada;
    const inventario = await ajustarStock(
      solicitud.usuario.id,
      parametros.data.id,
      validacion.data,
    );

    res.status(200).json({
      mensaje: 'Stock actualizado correctamente.',
      inventario,
    });
  },
);

adminRouter.get('/variants/:id/images', async (req, res) => {
  const parametros = idAdminParamsSchema.safeParse(req.params);

  if (!parametros.success) {
    res.status(400).json({ error: 'Identificador de variante inválido' });
    return;
  }

  const imagenes = await listarImagenesAdicionalesVariante(
    parametros.data.id,
  );

  res.status(200).json({ imagenes });
});

adminRouter.post(
  '/variants/:id/images',
  protegerCsrf,
  recibirImagen,
  async (req, res) => {
    const parametros = idAdminParamsSchema.safeParse(req.params);
    const posicion = posicionImagenSchema.safeParse(req.body.posicion);

    if (!parametros.success || !posicion.success) {
      res.status(400).json({
        error: 'Debe indicar un identificador válido y una posición de 1 a 3',
      });
      return;
    }

    const solicitud = req as SolicitudAutenticada;
    const imagen = await cargarImagenVariante(
      solicitud.usuario.id,
      parametros.data.id,
      req.file,
      posicion.data,
    );

    res.status(200).json({ imagen });
  },
);

adminRouter.delete(
  '/variants/:id/images/:imageId',
  protegerCsrf,
  async (req, res) => {
    const parametros = imagenVarianteParamsSchema.safeParse(req.params);

    if (!parametros.success) {
      res.status(400).json({
        error: 'Los identificadores no son válidos',
      });
      return;
    }

    const solicitud = req as SolicitudAutenticada;
    await eliminarImagenVariante(
      solicitud.usuario.id,
      parametros.data.id,
      parametros.data.imageId,
    );

    res.status(200).json({
      mensaje: 'Imagen de variante eliminada',
    });
  },
);
