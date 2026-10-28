import type { ErrorRequestHandler } from 'express';
import multer from 'multer';

import { ErrorAplicacion } from '../../../shared/http/app-error.js';

export function convertirErrorCargaImagen(
  error: unknown,
): ErrorAplicacion | null {
  if (error instanceof ErrorAplicacion) {
    return error;
  }

  if (!(error instanceof multer.MulterError)) {
    return null;
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    return new ErrorAplicacion(
      413,
      'La imagen no puede superar los 5 MB.',
    );
  }

  if (
    error.code === 'LIMIT_FILE_COUNT' ||
    error.code === 'LIMIT_UNEXPECTED_FILE'
  ) {
    return new ErrorAplicacion(
      400,
      'Debe enviar un único archivo en el campo de imagen.',
    );
  }

  if (
    error.code === 'LIMIT_FIELD_COUNT' ||
    error.code === 'LIMIT_PART_COUNT' ||
    error.code === 'LIMIT_FIELD_KEY' ||
    error.code === 'LIMIT_FIELD_VALUE'
  ) {
    return new ErrorAplicacion(
      400,
      'La solicitud contiene demasiados campos o datos inválidos.',
    );
  }

  return new ErrorAplicacion(
    400,
    'No se pudo procesar el archivo enviado.',
  );
}

export const manejarErrorCargaImagen: ErrorRequestHandler = (
  error: unknown,
  _req,
  _res,
  next,
): void => {
  const errorConvertido = convertirErrorCargaImagen(error);

  if (errorConvertido === null) {
    next(error);
    return;
  }

  next(errorConvertido);
};