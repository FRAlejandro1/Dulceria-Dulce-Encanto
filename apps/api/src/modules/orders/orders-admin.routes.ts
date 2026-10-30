import { Router } from 'express';

import {
  cambiarEstadoPedidoAdmin,
  consultarPedidosAdmin,
  consultarDetallePedidoAdmin,
  consultarVentasMensualesAdmin,
  consultarDashboardPedidosAdmin,
  consultarClientesPedidosAdmin,
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

ordersAdminRouter.get('/dashboard', async (req, res) => {
  const resultado = await consultarDashboardPedidosAdmin(req.query);
  res.status(200).json(resultado);
});

ordersAdminRouter.get('/customers', async (req, res) => {
  const resultado = await consultarClientesPedidosAdmin(req.query);
  res.status(200).json(resultado);
});
ordersAdminRouter.get('/:id', async (req, res) => {
  const id = req.params.id;

  if (typeof id !== 'string' || !/^\d+$/.test(id)) {
    res.status(400).json({ error: 'Identificador de pedido no vÃ¡lido.' });
    return;
  }

  const pedido = await consultarDetallePedidoAdmin(id);
  res.status(200).json({ pedido });
});
ordersAdminRouter.patch('/:id/status', protegerCsrf, async (req, res) => {
  const solicitud = req as SolicitudAutenticada;
  const id = req.params.id;
  const { estado } = req.body as { estado?: unknown };

  if (typeof id !== 'string' || !/^\d+$/.test(id)) {
    res.status(400).json({ error: 'Identificador de pedido no vÃ¡lido.' });
    return;
  }

  if (typeof estado !== 'string') {
    res.status(400).json({ error: 'El estado solicitado no es vÃ¡lido.' });
    return;
  }

  const pedido = await cambiarEstadoPedidoAdmin(
    solicitud.usuario.id,
    id,
    estado,
  );

  res.status(200).json({ pedido });
});
