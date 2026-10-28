import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { unlinkMock } = vi.hoisted(() => ({
  unlinkMock: vi.fn(),
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...original,
    unlink: unlinkMock,
  };
});

import { AlmacenamientoImagenesLocal } from '../../src/modules/admin/storage/local-image-storage.js';

describe('AlmacenamientoImagenesLocal.eliminar: errores del sistema', () => {
  beforeEach(() => {
    unlinkMock.mockReset();
    vi.stubEnv('UPLOADS_DIR', 'uploads-test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('propaga errores de eliminación distintos de ENOENT', async () => {
    const error = Object.assign(new Error('Permiso denegado'), {
      code: 'EACCES',
    });
    unlinkMock.mockRejectedValue(error);

    await expect(
      new AlmacenamientoImagenesLocal().eliminar(
        'product/550e8400-e29b-41d4-a716-446655440000.jpg',
      ),
    ).rejects.toBe(error);
  });

  it('propaga errores que no son objetos con código ENOENT', async () => {
    const error = 'error inesperado';
    unlinkMock.mockRejectedValue(error);

    await expect(
      new AlmacenamientoImagenesLocal().eliminar(
        'product/550e8400-e29b-41d4-a716-446655440000.jpg',
      ),
    ).rejects.toBe(error);
  });
});
