import multer from 'multer';

import { ErrorAplicacion } from '../../../shared/http/app-error.js';

const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

const cargaImagen = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: TAMANO_MAXIMO_BYTES,
    files: 1,
    fields: 5,
    parts: 6,
  },
  fileFilter: (_req, archivo, callback) => {
    const formatosAdmitidos = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
    ]);

    if (!formatosAdmitidos.has(archivo.mimetype)) {
      callback(
        new ErrorAplicacion(
          400,
          'Solo se admiten imágenes JPEG, PNG o WebP.',
        ),
      );
      return;
    }

    callback(null, true);
  },
});

export const recibirImagen = cargaImagen.single('imagen');
