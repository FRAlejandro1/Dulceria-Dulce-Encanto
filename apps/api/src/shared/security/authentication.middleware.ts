import type { Request, RequestHandler } from 'express';

import { buscarUsuarioPorId } from '../../modules/users/users.repository.js';
import { buscarSesionActivaPorHash } from '../../modules/auth/sessions.repository.js';
import { ErrorAplicacion } from '../http/app-error.js';
import {
  calcularHashTokenSesion,
} from './session-token.js';
import type { RolUsuario } from './roles.js';

export const COOKIE_SESION = 'dulceria_session';

export interface IdentidadAutenticada {
  id: string;
  rol: RolUsuario;
}

export interface SolicitudAutenticada extends Request {
  usuario: IdentidadAutenticada;
}

function adjuntarIdentidad(
  req: Request,
  identidad: IdentidadAutenticada,
): asserts req is SolicitudAutenticada {
  Object.assign(req, { usuario: identidad });
}

export const autenticarUsuario: RequestHandler = async (
  req,
  _res,
  next,
): Promise<void> => {
  const token = req.cookies?.[COOKIE_SESION] as
    | string
    | undefined;

  if (
    token === undefined
    || token.length === 0
    || !/^[A-Za-z0-9_-]{43}$/.test(token)
  ) {
    next(new ErrorAplicacion(401, 'Se requiere autenticación'));
    return;
  }

  try {
    const hashToken = calcularHashTokenSesion(token);
    const sesion = await buscarSesionActivaPorHash(hashToken);

    if (sesion === null) {
      next(new ErrorAplicacion(401, 'La sesión es inválida o ha expirado'));
      return;
    }

    const usuario = await buscarUsuarioPorId(sesion.userId);

    if (usuario === null || !usuario.activo) {
      next(new ErrorAplicacion(401, 'La sesión es inválida o ha expirado'));
      return;
    }

    adjuntarIdentidad(req, {
      id: usuario.id,
      rol: usuario.rol,
    });

    next();
  } catch {
    next(
      new ErrorAplicacion(
        500,
        'No se pudo validar la sesión',
      ),
    );
  }
};
