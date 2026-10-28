import { Router } from 'express';

import {
  cambiarEstadoPedidoAdmin,
  consultarPedidosAdmin,
  consultarVentasMensualesAdmin,
} from './orders-admin.service.js';
import { autenticarUsuario } from '../../shared/security/authentication.middleware.js';
import type { SolicitudAutenticada } from '../../shared/security/authentication.middleware.js';
import { autorizarRoles } from '../../shared/security/authorization.middleware.js';
import { protegerCsrf } from '../../shared/security/csrf.js';

export const ordersAdminRouter = Router();

ordersAdminRouter.use(autenticarUsuario, autorizarRoles('ADMIN'));

ordersAdminRouter.get('/', async (req, res) => {
  const resultado = await consultarPedidosAdmin(req.query);
  res.status(200).json(resultado);
});

ordersAdminRouter.get('/sales/monthly', async (req, res) => {
  const resultado = await consultarVentasMensualesAdmin(req.query);
  res.status(200).json({ ventasMensuales: resultado });
});

ordersAdminRouter.patch('/:id/status', protegerCsrf, async (req, res) => {
  const solicitud = req as SolicitudAutenticada;
  const id = req.params.id;
  const { estado } = req.body as { estado?: unknown };

  if (typeof id !== 'string' || !/^\d+$/.test(id)) {
    res.status(400).json({ error: 'Identificador de pedido no válido.' });
    return;
  }

  if (typeof estado !== 'string') {
    res.status(400).json({ error: 'El estado solicitado no es válido.' });
    return;
  }

  const pedido = await cambiarEstadoPedidoAdmin(
    solicitud.usuario.id,
    id,
    estado,
  );

  res.status(200).json({ pedido });
});
