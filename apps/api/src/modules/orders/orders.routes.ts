import { Router } from 'express';
import type { Request } from 'express';

import { crearPedido } from './orders.service.js';
import {
  obtenerDetallePedido,
  obtenerHistorialPedidos,
} from './orders-history.service.js';
import { crearPedidoSchema } from './orders.schemas.js';
import { autenticarUsuario } from '../../shared/security/authentication.middleware.js';
import type { SolicitudAutenticada } from '../../shared/security/authentication.middleware.js';
import { protegerCsrf } from '../../shared/security/csrf.js';

export const ordersRouter = Router();

ordersRouter.use(autenticarUsuario);

ordersRouter.get('/', async (req, res) => {
  const solicitud = req as SolicitudAutenticada;
  const pedidos = await obtenerHistorialPedidos(solicitud.usuario.id);

  res.status(200).json({ pedidos });
});

ordersRouter.get('/:id', async (req: Request<{ id: string }>, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    res.status(400).json({ error: 'Identificador de pedido no válido.' });
    return;
  }

  const solicitud = req as unknown as SolicitudAutenticada;
  const pedido = await obtenerDetallePedido(
    solicitud.usuario.id,
    req.params.id,
  );

  res.status(200).json({ pedido });
});

ordersRouter.post('/', protegerCsrf, async (req, res) => {
  const validacion = crearPedidoSchema.safeParse(req.body);

  if (!validacion.success) {
    res.status(400).json({ error: 'Los datos del pedido no son válidos.' });
    return;
  }

  const solicitud = req as SolicitudAutenticada;
  const pedido = await crearPedido(
    solicitud.usuario.id,
    validacion.data,
  );

  res.status(201).json({ pedido });
});
