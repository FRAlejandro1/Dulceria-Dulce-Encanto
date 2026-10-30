import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
}));

vi.mock('../../src/config/database.js', () => ({
  pool: { execute: mocks.execute },
}));

import {
  listarNotificacionesUsuario,
  marcarNotificacionLeida,
} from '../../src/modules/orders/orders-notifications-query.repository.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listarNotificacionesUsuario', () => {
  it('devuelve las notificaciones del usuario ordenadas y limitadas', async () => {
    const notificaciones = [{ id: '1', titulo: 'Pedido recibido' }];
    mocks.execute.mockResolvedValueOnce([notificaciones]);

    await expect(listarNotificacionesUsuario('20')).resolves.toEqual(notificaciones);
    expect(mocks.execute).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = ?'),
      ['20'],
    );
    expect(mocks.execute.mock.calls[0][0]).toContain('LIMIT 100');
    expect(mocks.execute.mock.calls[0][0]).toContain('ORDER BY created_at DESC, id DESC');
  });

  it('devuelve una lista vacía cuando no hay notificaciones', async () => {
    mocks.execute.mockResolvedValueOnce([[]]);

    await expect(listarNotificacionesUsuario('20')).resolves.toEqual([]);
  });

  it('propaga errores de consulta', async () => {
    mocks.execute.mockRejectedValueOnce(new Error('Error SQL'));

    await expect(listarNotificacionesUsuario('20')).rejects.toThrow('Error SQL');
  });
});

describe('marcarNotificacionLeida', () => {
  it('marca como leída una notificación pendiente del usuario', async () => {
    mocks.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

    await expect(marcarNotificacionLeida('20', '7')).resolves.toBe(true);
    expect(mocks.execute).toHaveBeenCalledOnce();
    expect(mocks.execute.mock.calls[0][0]).toContain('read_at IS NULL');
    expect(mocks.execute.mock.calls[0][1]).toEqual(['7', '20']);
  });

  it('devuelve true si ya estaba leída y pertenece al usuario', async () => {
    mocks.execute
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockResolvedValueOnce([[{ id: '7' }]]);

    await expect(marcarNotificacionLeida('20', '7')).resolves.toBe(true);
    expect(mocks.execute).toHaveBeenCalledTimes(2);
    expect(mocks.execute.mock.calls[1][1]).toEqual(['7', '20']);
  });

  it('devuelve false si la notificación no existe para ese usuario', async () => {
    mocks.execute
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockResolvedValueOnce([[]]);

    await expect(marcarNotificacionLeida('20', '7')).resolves.toBe(false);
  });

  it('propaga errores al actualizar', async () => {
    mocks.execute.mockRejectedValueOnce(new Error('Error al actualizar'));

    await expect(marcarNotificacionLeida('20', '7')).rejects.toThrow('Error al actualizar');
  });

  it('propaga errores al verificar una notificación existente', async () => {
    mocks.execute
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockRejectedValueOnce(new Error('Error al consultar'));

    await expect(marcarNotificacionLeida('20', '7')).rejects.toThrow('Error al consultar');
  });
});
