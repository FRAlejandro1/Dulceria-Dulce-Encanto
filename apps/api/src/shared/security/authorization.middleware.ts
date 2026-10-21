import type { RequestHandler } from 'express';

import { ErrorAplicacion } from '../http/app-error.js';
import type { SolicitudAutenticada } from './authentication.middleware.js';
import type { RolUsuario } from './roles.js';

/**
 * Permite continuar únicamente si el usuario autenticado
 * tiene uno de los roles autorizados para la operación.
 */
export function autorizarRoles(
  ...rolesPermitidos: RolUsuario[]
): RequestHandler {
  return (req, _res, next): void => {
    if (!('usuario' in req) || req.usuario === undefined) {
      next(new ErrorAplicacion(401, 'Se requiere autenticación'));
      return;
    }

    const solicitud = req as SolicitudAutenticada;

    if (!rolesPermitidos.includes(solicitud.usuario.rol)) {
      next(
        new ErrorAplicacion(
          403,
          'No tiene permisos para realizar esta operación',
        ),
      );
      return;
    }

    next();
  };
}
