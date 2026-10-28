import { describe, expect, it, vi } from 'vitest';
import multer from 'multer';

import {
  convertirErrorCargaImagen,
  manejarErrorCargaImagen,
} from '../../src/modules/admin/storage/image-upload.errors.js';
import { ErrorAplicacion } from '../../src/shared/http/app-error.js';

describe('convertirErrorCargaImagen', () => {
  it('conserva los errores de aplicación', () => {
    const error = new ErrorAplicacion(422, 'Error de aplicación');
    expect(convertirErrorCargaImagen(error)).toBe(error);
  });

  it('devuelve null para errores no reconocidos', () => {
    expect(convertirErrorCargaImagen(new Error('Error inesperado'))).toBeNull();
    expect(convertirErrorCargaImagen(null)).toBeNull();
  });

  it('convierte el límite de tamaño', () => {
    const resultado = convertirErrorCargaImagen(
      new multer.MulterError('LIMIT_FILE_SIZE'),
    );
    expect(resultado).toBeInstanceOf(ErrorAplicacion);
    expect(resultado?.message).toBe('La imagen no puede superar los 5 MB.');
  });

  it.each(['LIMIT_FILE_COUNT', 'LIMIT_UNEXPECTED_FILE'] as const)(
    'convierte %s',
    (codigo) => {
      const resultado = convertirErrorCargaImagen(new multer.MulterError(codigo));
      expect(resultado?.message).toBe(
        'Debe enviar un único archivo en el campo de imagen.',
      );
    },
  );

  it.each([
    'LIMIT_FIELD_COUNT',
    'LIMIT_PART_COUNT',
    'LIMIT_FIELD_KEY',
    'LIMIT_FIELD_VALUE',
  ] as const)('convierte %s', (codigo) => {
    const resultado = convertirErrorCargaImagen(new multer.MulterError(codigo));
    expect(resultado?.message).toBe(
      'La solicitud contiene demasiados campos o datos inválidos.',
    );
  });

  it('usa el mensaje genérico para códigos desconocidos de Multer', () => {
    const error = new multer.MulterError('LIMIT_FILE_SIZE');
    Object.defineProperty(error, 'code', { value: 'OTHER_ERROR' });

    expect(convertirErrorCargaImagen(error)?.message).toBe(
      'No se pudo procesar el archivo enviado.',
    );
  });
});

describe('manejarErrorCargaImagen', () => {
  it('pasa el error original a next cuando no se convierte', () => {
    const error = new Error('Error inesperado');
    const next = vi.fn();

    manejarErrorCargaImagen(error, {} as never, {} as never, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('pasa el error convertido a next', () => {
    const next = vi.fn();

    manejarErrorCargaImagen(
      new multer.MulterError('LIMIT_FILE_SIZE'),
      {} as never,
      {} as never,
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.any(ErrorAplicacion));
    expect(next.mock.calls[0]?.[0]?.message).toBe(
      'La imagen no puede superar los 5 MB.',
    );
  });
});
