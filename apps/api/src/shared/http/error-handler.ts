import type { ErrorRequestHandler } from 'express';

import { ErrorAplicacion } from './app-error.js';
import { registrarError } from '../logging/logger.js';

/**
 * Obtiene un estado HTTP válido de un error no controlado.
 * Los errores sin estado válido se consideran fallos internos.
 */
function obtenerEstado(error: unknown): number {
  if (error instanceof ErrorAplicacion) {
    return error.status;
  }

  if (typeof error !== 'object' || error === null) {
    return 500;
  }

  const detalle = error as Record<string, unknown>;
  const estado = detalle.status ?? detalle.statusCode;

  if (
    typeof estado === 'number' &&
    Number.isInteger(estado) &&
    estado >= 400 &&
    estado <= 599
  ) {
    return estado;
  }

  return 500;
}

/**
 * Solo publica mensajes específicos de errores de aplicación.
 * Nunca expone el mensaje original de un error inesperado.
 */
function obtenerMensajePublico(
  error: unknown,
  estado: number,
): string {
  if (error instanceof ErrorAplicacion) {
    return error.mensajePublico;
  }

  if (estado === 400) {
    return 'Solicitud inválida';
  }

  if (estado === 413) {
    return 'El cuerpo de la solicitud excede el límite permitido';
  }

  if (estado >= 500) {
    return 'Error interno del servidor';
  }

  return 'No se pudo procesar la solicitud';
}

export const manejarError: ErrorRequestHandler = (
  error: unknown,
  req,
  res,
  next,
): void => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const estado = obtenerEstado(error);

  registrarError('http.request_failed', error, {
    method: req.method,
    path: req.path,
    status: estado,
  });

  res.status(estado).json({
    error: obtenerMensajePublico(error, estado),
  });
};
