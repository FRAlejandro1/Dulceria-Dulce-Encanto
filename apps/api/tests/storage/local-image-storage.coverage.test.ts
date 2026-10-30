import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sharpMock, metadataMock, toBufferMock, processor } = vi.hoisted(() => {
  const metadataMock = vi.fn();
  const toBufferMock = vi.fn();
  const processor = {
    metadata: metadataMock,
    rotate: vi.fn(),
    jpeg: vi.fn(),
    png: vi.fn(),
    webp: vi.fn(),
    toBuffer: toBufferMock,
  };

  return {
    sharpMock: vi.fn(() => processor),
    metadataMock,
    toBufferMock,
    processor,
  };
});

vi.mock('sharp', () => ({ default: sharpMock }));

import {
  AlmacenamientoImagenesLocal,
  ErrorImagenInvalida,
} from '../../src/modules/admin/storage/local-image-storage.js';

describe('Cobertura adicional del almacenamiento de imagenes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('UPLOADS_DIR', 'uploads-coverage-test');

    sharpMock.mockReturnValue(processor);
    processor.rotate.mockReturnValue(processor);
    processor.jpeg.mockReturnValue(processor);
    processor.png.mockReturnValue(processor);
    processor.webp.mockReturnValue(processor);

    metadataMock.mockResolvedValue({
      format: 'jpeg',
      width: 4,
      height: 4,
    });
    toBufferMock.mockResolvedValue(Buffer.from('imagen-procesada'));
  });

  it('rechaza un nombre de archivo que no cumple el formato UUID', async () => {
    const almacenamiento = new AlmacenamientoImagenesLocal();

    await expect(
      almacenamiento.eliminar('product/imagen.jpg'),
    ).rejects.toThrow('El nombre del archivo no es válido.');
  });

  it('rechaza metadatos de un formato no admitido', async () => {
    metadataMock.mockResolvedValue({
      format: 'gif',
      width: 4,
      height: 4,
    });

    await expect(
      new AlmacenamientoImagenesLocal().guardar(
        'product',
        Buffer.from('contenido'),
        'image/jpeg',
      ),
    ).rejects.toBeInstanceOf(ErrorImagenInvalida);
  });

  it('propaga errores inesperados del procesamiento', async () => {
    const error = new Error('fallo externo inesperado');
    toBufferMock.mockRejectedValue(error);

    await expect(
      new AlmacenamientoImagenesLocal().guardar(
        'product',
        Buffer.from('contenido'),
        'image/jpeg',
      ),
    ).rejects.toBe(error);
  });

  it('rechaza una imagen procesada que supera los 5 MB', async () => {
    toBufferMock.mockResolvedValue(Buffer.alloc(5 * 1024 * 1024 + 1));

    await expect(
      new AlmacenamientoImagenesLocal().guardar(
        'product',
        Buffer.from('contenido'),
        'image/jpeg',
      ),
    ).rejects.toThrow('La imagen procesada supera el límite de 5 MB.');
  });
});