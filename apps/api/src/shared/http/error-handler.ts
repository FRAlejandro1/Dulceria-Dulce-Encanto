import type {
  ErrorRequestHandler,
} from 'express';

import { registrarError } from '../logging/logger.js';

function obtenerEstado(error: unknown): number {
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

function obtenerMensajePublico(estado: number): string {
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
    error: obtenerMensajePublico(estado),
  });
};
