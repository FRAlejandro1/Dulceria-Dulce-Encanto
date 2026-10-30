import { Router } from 'express';

import { autenticarUsuario } from '../../shared/security/authentication.middleware.js';
import type { SolicitudAutenticada } from '../../shared/security/authentication.middleware.js';
import { protegerCsrf } from '../../shared/security/csrf.js';
import {
  agregarFavorito,
  eliminarFavorito,
  listarFavoritos,
} from './favorites.repository.js';

export const favoritosRouter = Router();

favoritosRouter.use(autenticarUsuario);

favoritosRouter.get('/', async (req, res, next) => {
  try {
    const solicitud = req as SolicitudAutenticada;
    const favoritos = await listarFavoritos(solicitud.usuario.id);

    res.status(200).json({ favoritos });
  } catch (error) {
    next(error);
  }
});

favoritosRouter.post('/:productoId', protegerCsrf, async (req, res, next) => {
  try {
    const solicitud = req as SolicitudAutenticada;
    const { productoId } = req.params;

    if (typeof productoId !== 'string' || !/^\d+$/.test(productoId)) {
      res.status(400).json({ error: 'Identificador de producto no válido.' });
      return;
    }

    const agregado = await agregarFavorito(solicitud.usuario.id, productoId);

    if (!agregado) {
      res.status(404).json({ error: 'El producto no existe o no está disponible.' });
      return;
    }

    res.status(200).json({ mensaje: 'Producto agregado a favoritos.' });
  } catch (error) {
    next(error);
  }
});

favoritosRouter.delete('/:productoId', protegerCsrf, async (req, res, next) => {
  try {
    const solicitud = req as SolicitudAutenticada;
    const { productoId } = req.params;

    if (typeof productoId !== 'string' || !/^\d+$/.test(productoId)) {
      res.status(400).json({ error: 'Identificador de producto no válido.' });
      return;
    }

    await eliminarFavorito(solicitud.usuario.id, productoId);

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});
