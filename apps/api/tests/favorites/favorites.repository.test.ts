import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ejecutarConsulta } = vi.hoisted(() => ({
  ejecutarConsulta: vi.fn(),
}));

vi.mock('../../src/config/database.js', () => ({
  pool: { execute: ejecutarConsulta },
}));

import {
  agregarFavorito,
  eliminarFavorito,
  listarFavoritos,
} from '../../src/modules/favorites/favorites.repository.js';

beforeEach(() => {
  vi.clearAllMocks();
  ejecutarConsulta.mockResolvedValue([[], []]);
});

describe('listarFavoritos', () => {
  it('devuelve los identificadores como cadenas', async () => {
    ejecutarConsulta.mockResolvedValueOnce([
      [{ productoId: 3 }, { productoId: '8' }],
      [],
    ]);

    await expect(listarFavoritos('20')).resolves.toEqual(['3', '8']);

    expect(ejecutarConsulta).toHaveBeenCalledWith(
      expect.stringContaining('WHERE f.user_id = ?'),
      ['20'],
    );
  });

  it('devuelve una lista vacía cuando no hay favoritos', async () => {
    await expect(listarFavoritos('20')).resolves.toEqual([]);
  });

  it('propaga los errores de base de datos', async () => {
    ejecutarConsulta.mockRejectedValueOnce(new Error('Fallo SQL'));

    await expect(listarFavoritos('20')).rejects.toThrow('Fallo SQL');
  });
});

describe('agregarFavorito', () => {
  it('inserta el favorito si el producto está activo', async () => {
    ejecutarConsulta.mockResolvedValueOnce([[{ id: 5 }], []]);

    await expect(agregarFavorito('20', '5')).resolves.toBe(true);

    expect(ejecutarConsulta).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('is_active = 1'),
      ['5'],
    );
    expect(ejecutarConsulta).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT IGNORE INTO favorites'),
      ['20', '5'],
    );
  });

  it('no inserta cuando el producto no existe o está inactivo', async () => {
    await expect(agregarFavorito('20', '99')).resolves.toBe(false);

    expect(ejecutarConsulta).toHaveBeenCalledOnce();
  });

  it('propaga errores al consultar el producto', async () => {
    ejecutarConsulta.mockRejectedValueOnce(new Error('Fallo SQL'));

    await expect(agregarFavorito('20', '5')).rejects.toThrow('Fallo SQL');
  });

  it('propaga errores al insertar el favorito', async () => {
    ejecutarConsulta
      .mockResolvedValueOnce([[{ id: 5 }], []])
      .mockRejectedValueOnce(new Error('Fallo SQL'));

    await expect(agregarFavorito('20', '5')).rejects.toThrow('Fallo SQL');
  });
});

describe('eliminarFavorito', () => {
  it('elimina únicamente el favorito del usuario indicado', async () => {
    await eliminarFavorito('20', '5');

    expect(ejecutarConsulta).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM favorites'),
      ['20', '5'],
    );
  });

  it('propaga los errores de base de datos', async () => {
    ejecutarConsulta.mockRejectedValueOnce(new Error('Fallo SQL'));

    await expect(eliminarFavorito('20', '5')).rejects.toThrow('Fallo SQL');
  });
});
