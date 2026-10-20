import { Router } from 'express';

import { registrarUsuario } from './users.service.js';

export const usuariosRouter = Router();

usuariosRouter.post('/', async (req, res, next) => {
  try {
    const usuario = await registrarUsuario(req.body);
    res.status(201).json({ usuario });
  } catch (error: unknown) {
    next(error);
  }
});
