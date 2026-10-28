import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, resolve, sep } from 'node:path';
import sharp, { type Metadata } from 'sharp';

import type {
  AlmacenamientoImagenes,
  ImagenAlmacenada,
  TipoImagenAdmin,
} from './image-storage.types.js';

const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;
const PIXELES_MAXIMOS = 25_000_000;
const FORMATOS_ADMITIDOS = new Set(['jpeg', 'png', 'webp']);

export class ErrorImagenInvalida extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorImagenInvalida';
  }
}

export function obtenerDirectorioImagenes(): string {
  const configurado = process.env.UPLOADS_DIR?.trim();

  return resolve(
    configurado && configurado.length > 0 ? configurado : 'uploads',
  );
}

function obtenerRutaSegura(
  tipo: TipoImagenAdmin,
  nombreBase: string,
): string {
  if (
    basename(nombreBase) !== nombreBase ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/.test(
      nombreBase,
    )
  ) {
    throw new Error('El nombre del archivo no es válido.');
  }

  const directorio = resolve(obtenerDirectorioImagenes(), tipo);
  const ruta = resolve(directorio, nombreBase);

  if (!ruta.startsWith(`${directorio}${sep}`)) {
    throw new Error('La ruta del archivo no es válida.');
  }

  return ruta;
}

function analizarMime(
  mimeType: string,
): 'image/jpeg' | 'image/png' | 'image/webp' {
  if (
    mimeType !== 'image/jpeg' &&
    mimeType !== 'image/png' &&
    mimeType !== 'image/webp'
  ) {
    throw new ErrorImagenInvalida('Formato de imagen no admitido.');
  }

  return mimeType;
}

function esErrorImagenProcesamiento(error: unknown): boolean {
  return error instanceof ErrorImagenInvalida ||
    (error instanceof Error &&
      /sharp|input buffer|unsupported image|invalid image|corrupt|pixellimit/i.test(
        error.message,
      ));
}

export class AlmacenamientoImagenesLocal implements AlmacenamientoImagenes {
  async guardar(
    tipo: TipoImagenAdmin,
    contenido: Buffer,
    mimeTypeDeclarado: string,
  ): Promise<ImagenAlmacenada> {
    if (contenido.length === 0 || contenido.length > TAMANO_MAXIMO_BYTES) {
      throw new ErrorImagenInvalida(
        'La imagen debe ocupar entre 1 byte y 5 MB.',
      );
    }

    const mimeDeclarado = analizarMime(mimeTypeDeclarado);

    let metadata: Metadata;
    let salida: Buffer;

    try {
      const imagen = sharp(contenido, {
        failOn: 'error',
        limitInputPixels: PIXELES_MAXIMOS,
        animated: false,
      });

      metadata = await imagen.metadata();

      if (
        metadata.format === undefined ||
        !FORMATOS_ADMITIDOS.has(metadata.format) ||
        metadata.width === undefined ||
        metadata.height === undefined ||
        metadata.width < 1 ||
        metadata.height < 1 ||
        metadata.width * metadata.height > PIXELES_MAXIMOS
      ) {
        throw new ErrorImagenInvalida(
          'El archivo no es una imagen válida o supera las dimensiones permitidas.',
        );
      }

      const mimePorFormato = {
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
      } as const;

      const mimeReal = mimePorFormato[
        metadata.format as keyof typeof mimePorFormato
      ];

      if (mimeReal === undefined || mimeReal !== mimeDeclarado) {
        throw new ErrorImagenInvalida(
          'El contenido no coincide con el tipo de imagen declarado.',
        );
      }

      let procesador = sharp(contenido, {
        failOn: 'error',
        limitInputPixels: PIXELES_MAXIMOS,
      }).rotate();

      if (metadata.format === 'jpeg') {
        procesador = procesador.jpeg({ quality: 85, mozjpeg: true });
      } else if (metadata.format === 'png') {
        procesador = procesador.png({ compressionLevel: 9 });
      } else {
        procesador = procesador.webp({ quality: 85 });
      }

      salida = await procesador.toBuffer();
    } catch (error: unknown) {
      if (error instanceof ErrorImagenInvalida) {
        throw error;
      }

      if (esErrorImagenProcesamiento(error)) {
        throw new ErrorImagenInvalida(
          'El archivo no es una imagen válida o no se pudo procesar.',
        );
      }

      throw error;
    }

    if (salida.length === 0 || salida.length > TAMANO_MAXIMO_BYTES) {
      throw new ErrorImagenInvalida(
        'La imagen procesada supera el límite de 5 MB.',
      );
    }

    const formato = metadata.format;
    const nombreBase = `${randomUUID()}.${formato === 'jpeg' ? 'jpg' : formato}`;

    const directorio = resolve(obtenerDirectorioImagenes(), tipo);
    const ruta = obtenerRutaSegura(tipo, nombreBase);

    await mkdir(directorio, { recursive: true });
    await writeFile(ruta, salida, { flag: 'wx' });

    const mimePorFormato = {
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    } as const;

    return {
      nombreArchivo: `${tipo}/${nombreBase}`,
      url: `/uploads/${tipo}/${nombreBase}`,
      mimeType: mimePorFormato[formato as keyof typeof mimePorFormato],
      tamanoBytes: salida.length,
    };
  }

  obtenerReferenciaLocal(url: string | null): string | null {
    if (url === null) {
      return null;
    }

    const coincidencia =
      /^\/uploads\/(category|product|variant)\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp))$/.exec(
        url,
      );

    if (coincidencia === null) {
      return null;
    }

    const tipo = coincidencia[1];
    const nombreBase = coincidencia[2];

    if (
      (tipo !== 'category' &&
        tipo !== 'product' &&
        tipo !== 'variant') ||
      nombreBase === undefined
    ) {
      return null;
    }

    return `${tipo}/${nombreBase}`;
  }

  async eliminar(nombreArchivo: string): Promise<void> {
    const partes = nombreArchivo.split('/');
    const tipo = partes[0];
    const nombreBase = partes[1];

    if (
      partes.length !== 2 ||
      (tipo !== 'category' &&
        tipo !== 'product' &&
        tipo !== 'variant') ||
      nombreBase === undefined
    ) {
      throw new Error('La referencia de imagen no es válida.');
    }

    const ruta = obtenerRutaSegura(tipo, nombreBase);

    try {
      await unlink(ruta);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return;
      }

      throw error;
    }
  }
}
