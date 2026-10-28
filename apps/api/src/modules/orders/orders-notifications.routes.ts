import { Router } from 'express';

import { autenticarUsuario } from '../../shared/security/authentication.middleware.js';
import type { SolicitudAutenticada } from '../../shared/security/authentication.middleware.js';
import { protegerCsrf } from '../../shared/security/csrf.js';
import {
  listarNotificacionesUsuario,
  marcarNotificacionLeida,
} from './orders-notifications-query.repository.js';

export const ordersNotificationsRouter = Router();

ordersNotificationsRouter.use(autenticarUsuario);

ordersNotificationsRouter.get('/', async (req, res) => {
  const solicitud = req as SolicitudAutenticada;
  const notificaciones = await listarNotificacionesUsuario(solicitud.usuario.id);

  res.status(200).json({ notificaciones });
});

ordersNotificationsRouter.patch('/:id/read', protegerCsrf, async (req, res) => {
  const solicitud = req as SolicitudAutenticada;
  const id = req.params.id;

  if (typeof id !== 'string' || !/^\d+$/.test(id)) {
    res.status(400).json({ error: 'Identificador de notificación no válido.' });
    return;
  }

  const actualizada = await marcarNotificacionLeida(solicitud.usuario.id, id);

  if (!actualizada) {
    res.status(404).json({ error: 'La notificación no existe.' });
    return;
  }

  res.status(200).json({ mensaje: 'Notificación marcada como leída.' });
});
