import { Router } from 'express';

import {
  cerrarSesion,
  iniciarSesion,
} from './auth.service.js';
import { generarTokenCsrf, protegerCsrf } from '../../shared/security/csrf.js';
import { COOKIE_SESION } from '../../shared/security/authentication.middleware.js';

const DURACION_SESION_MS = 8 * 60 * 60 * 1000;

export const autenticacionRouter = Router();

function opcionesCookie() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: DURACION_SESION_MS,
  };
}

autenticacionRouter.get('/csrf', (_req, res) => {
  res.status(200).json({
    csrfToken: generarTokenCsrf(),
  });
});

autenticacionRouter.post('/login', protegerCsrf, async (req, res, next) => {
  try {
    const resultado = await iniciarSesion(req.body);

    res.cookie(COOKIE_SESION, resultado.token, opcionesCookie());

    res.status(200).json({
      usuario: resultado.usuario,
      expiraEn: resultado.expiraEn.toISOString(),
    });
  } catch (error: unknown) {
    next(error);
  }
});

autenticacionRouter.post('/logout', protegerCsrf, async (req, res, next) => {
  try {
    await cerrarSesion(req.cookies?.[COOKIE_SESION]);

    res.clearCookie(COOKIE_SESION, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.status(204).end();
  } catch (error: unknown) {
    next(error);
  }
});
