import type { PoolConnection } from 'mysql2/promise';
import { describe, expect, it, vi } from 'vitest';

import { registrarAuditoria } from '../src/modules/audit/audit.repository.js';

describe('registrarAuditoria', () => {
  it('inserta la auditoría utilizando la conexión recibida', async () => {
    const execute = vi.fn().mockResolvedValue([{ affectedRows: 1 }, []]);
    const conexion = { execute } as unknown as PoolConnection;

    await registrarAuditoria(conexion, {
      actorUserId: '15',
      action: 'ORDER_CREATED',
      entityType: 'order',
      entityId: 'ORD-100',
      correlationId: '123e4567-e89b-42d3-a456-426614174000',
      details: { status: 'PENDIENTE_ENVIO', total: '25.50' },
    });

    expect(execute).toHaveBeenCalledOnce();

    const [sql, parametros] = execute.mock.calls[0] as [
      string,
      unknown[],
    ];

    expect(sql).toContain('INSERT INTO audit_logs');
    expect(parametros).toEqual([
      '15',
      'ORDER_CREATED',
      'order',
      'ORD-100',
      '123e4567-e89b-42d3-a456-426614174000',
      JSON.stringify({ status: 'PENDIENTE_ENVIO', total: '25.50' }),
    ]);
  });

  it('permite registrar acciones sin usuario ni metadatos', async () => {
    const execute = vi.fn().mockResolvedValue([{ affectedRows: 1 }, []]);
    const conexion = { execute } as unknown as PoolConnection;

    await registrarAuditoria(conexion, {
      actorUserId: null,
      action: 'SYSTEM_EVENT',
      entityType: 'reservation',
    });

    const parametros = execute.mock.calls[0]?.[1] as unknown[];

    expect(parametros).toEqual([
      null,
      'SYSTEM_EVENT',
      'reservation',
      null,
      null,
      null,
    ]);
  });

  it('rechaza acciones vacías antes de consultar la base de datos', async () => {
    const execute = vi.fn();
    const conexion = { execute } as unknown as PoolConnection;

    await expect(
      registrarAuditoria(conexion, {
        actorUserId: null,
        action: '   ',
        entityType: 'order',
      }),
    ).rejects.toThrow('La acción de auditoría es obligatoria');

    expect(execute).not.toHaveBeenCalled();
  });

  it('rechaza tipos de entidad vacíos', async () => {
    const execute = vi.fn();
    const conexion = { execute } as unknown as PoolConnection;

    await expect(
      registrarAuditoria(conexion, {
        actorUserId: null,
        action: 'ORDER_CREATED',
        entityType: ' ',
      }),
    ).rejects.toThrow('El tipo de entidad de auditoría es obligatorio');

    expect(execute).not.toHaveBeenCalled();
  });

  it('propaga los errores de la base de datos', async () => {
    const error = new Error('Error de inserción');
    const execute = vi.fn().mockRejectedValue(error);
    const conexion = { execute } as unknown as PoolConnection;

    await expect(
      registrarAuditoria(conexion, {
        actorUserId: null,
        action: 'ORDER_CREATED',
        entityType: 'order',
      }),
    ).rejects.toBe(error);
  });
});
