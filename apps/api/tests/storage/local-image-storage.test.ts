
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

import {
  AlmacenamientoImagenesLocal,
  ErrorImagenInvalida,
  obtenerDirectorioImagenes,
} from '../../src/modules/admin/storage/local-image-storage.js';

let directorioTemporal: string;
let almacenamiento: AlmacenamientoImagenesLocal;

async function crearImagen(
  formato: 'jpeg' | 'png' | 'webp' = 'jpeg',
): Promise<Buffer> {
  const imagen = sharp({
    create: {
      width: 4,
      height: 4,
      channels: 3,
      background: { r: 220, g: 80, b: 100 },
    },
  });

  if (formato === 'jpeg') return imagen.jpeg().toBuffer();
  if (formato === 'png') return imagen.png().toBuffer();
  return imagen.webp().toBuffer();
}

beforeEach(async () => {
  directorioTemporal = await mkdtemp(
    join(tmpdir(), 'dulceria-imagenes-test-'),
  );
  vi.stubEnv('UPLOADS_DIR', directorioTemporal);
  almacenamiento = new AlmacenamientoImagenesLocal();
});

afterEach(async () => {
  await rm(directorioTemporal, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

describe('obtenerDirectorioImagenes', () => {
  it('devuelve el directorio configurado', () => {
    expect(obtenerDirectorioImagenes()).toBe(resolve(directorioTemporal));
  });

  it('usa uploads si la configuración está vacía', () => {
    vi.stubEnv('UPLOADS_DIR', '   ');
    expect(obtenerDirectorioImagenes()).toBe(resolve('uploads'));
  });
});

describe('AlmacenamientoImagenesLocal.guardar', () => {
  it.each([
    ['jpeg', 'image/jpeg', 'jpg'],
    ['png', 'image/png', 'png'],
    ['webp', 'image/webp', 'webp'],
  ] as const)(
    'procesa imágenes %s válidas',
    async (formato, mime, extension) => {
      const contenido = await crearImagen(formato);
      const resultado = await almacenamiento.guardar(
        'product',
        contenido,
        mime,
      );

      expect(resultado.url).toMatch(
        new RegExp(
          `^/uploads/product/[0-9a-f-]{36}\\.${extension}$`,
        ),
      );
      expect(resultado.nombreArchivo).toMatch(
        new RegExp(`^product/[0-9a-f-]{36}\\.${extension}$`),
      );
      expect(resultado.mimeType).toBe(mime);
      expect(resultado.tamanoBytes).toBeGreaterThan(0);

      const ruta = join(
        directorioTemporal,
        resultado.nombreArchivo,
      );
      const guardado = await readFile(ruta);
      const metadata = await sharp(guardado).metadata();

      expect(metadata.format).toBe(formato);
    },
  );

  it('rechaza contenido vacío', async () => {
    await expect(
      almacenamiento.guardar('product', Buffer.alloc(0), 'image/jpeg'),
    ).rejects.toBeInstanceOf(ErrorImagenInvalida);
  });

  it('rechaza contenido que supera los 5 MB', async () => {
    await expect(
      almacenamiento.guardar(
        'product',
        Buffer.alloc(5 * 1024 * 1024 + 1),
        'image/jpeg',
      ),
    ).rejects.toThrow('La imagen debe ocupar entre 1 byte y 5 MB.');
  });

  it('rechaza tipos MIME no admitidos', async () => {
    await expect(
      almacenamiento.guardar(
        'product',
        Buffer.from('contenido'),
        'image/gif',
      ),
    ).rejects.toThrow('Formato de imagen no admitido.');
  });

  it('rechaza contenido que no es una imagen válida', async () => {
    await expect(
      almacenamiento.guardar(
        'product',
        Buffer.from('esto no es una imagen'),
        'image/jpeg',
      ),
    ).rejects.toBeInstanceOf(ErrorImagenInvalida);
  });

  it('rechaza imágenes que superan el límite de píxeles', async () => {
    const contenido = await sharp({
      create: {
        width: 5001,
        height: 5000,
        channels: 3,
        background: { r: 220, g: 80, b: 100 },
      },
    })
      .png()
      .toBuffer();

    await expect(
      almacenamiento.guardar('product', contenido, 'image/png'),
    ).rejects.toBeInstanceOf(ErrorImagenInvalida);
  });

  it('rechaza un MIME declarado que no coincide con el contenido', async () => {
    const contenido = await crearImagen('png');

    await expect(
      almacenamiento.guardar('product', contenido, 'image/jpeg'),
    ).rejects.toThrow(
      'El contenido no coincide con el tipo de imagen declarado.',
    );
  });
});

describe('AlmacenamientoImagenesLocal.obtenerReferenciaLocal', () => {
  it('devuelve null cuando la URL es null', () => {
    expect(almacenamiento.obtenerReferenciaLocal(null)).toBeNull();
  });

  it.each([
    '/uploads/product/550e8400-e29b-41d4-a716-446655440000.jpg',
    '/uploads/category/550e8400-e29b-41d4-a716-446655440000.png',
    '/uploads/variant/550e8400-e29b-41d4-a716-446655440000.webp',
  ])('reconoce una referencia local válida: %s', (url) => {
    expect(almacenamiento.obtenerReferenciaLocal(url)).toBe(
      url.replace('/uploads/', ''),
    );
  });

  it.each([
    'https://example.com/imagen.jpg',
    '/uploads/unknown/550e8400-e29b-41d4-a716-446655440000.jpg',
    '/uploads/product/imagen.jpg',
    '/uploads/product/550e8400-e29b-11d4-a716-446655440000.jpg',
    '/uploads/product/550e8400-e29b-41d4-a716-446655440000.gif',
    '/uploads/product/550e8400-e29b-41d4-a716-446655440000.jpg?x=1',
  ])('rechaza referencias inválidas: %s', (url) => {
    expect(almacenamiento.obtenerReferenciaLocal(url)).toBeNull();
  });
});

describe('AlmacenamientoImagenesLocal.eliminar', () => {
  it('rechaza referencias con formato inválido', async () => {
    await expect(
      almacenamiento.eliminar('../imagen.jpg'),
    ).rejects.toThrow('La referencia de imagen no es v' + String.fromCharCode(225) + 'lida.');
  });

  it('rechaza rutas que intentan salir del directorio permitido', async () => {
    await expect(
      almacenamiento.eliminar(
        'product/../../550e8400-e29b-41d4-a716-446655440000.jpg',
      ),
    ).rejects.toThrow('La referencia de imagen no es v' + String.fromCharCode(225) + 'lida.');
  });

  it('elimina un archivo existente', async () => {
    const contenido = await crearImagen('jpeg');
    const imagen = await almacenamiento.guardar(
      'product',
      contenido,
      'image/jpeg',
    );

    await expect(
      almacenamiento.eliminar(imagen.nombreArchivo),
    ).resolves.toBeUndefined();

    await expect(
      readFile(join(directorioTemporal, imagen.nombreArchivo)),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('no falla si el archivo ya no existe', async () => {
    await expect(
      almacenamiento.eliminar(
        'product/550e8400-e29b-41d4-a716-446655440000.jpg',
      ),
    ).resolves.toBeUndefined();
  });
});