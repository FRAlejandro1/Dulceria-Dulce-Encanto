import type { PoolConnection } from 'mysql2/promise';

export interface EntradaAuditoria {
  actorUserId: string | number | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  correlationId?: string | null;
  details?: Record<string, unknown> | null;
}

export async function registrarAuditoria(
  conexion: PoolConnection,
  entrada: EntradaAuditoria,
): Promise<void> {
  if (!entrada.action.trim()) {
    throw new Error('La acción de auditoría es obligatoria');
  }

  if (!entrada.entityType.trim()) {
    throw new Error('El tipo de entidad de auditoría es obligatorio');
  }

  const details = entrada.details ?? null;

  await conexion.execute(
    `INSERT INTO audit_logs (
      actor_user_id,
      action,
      entity_type,
      entity_id,
      correlation_id,
      details
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      entrada.actorUserId,
      entrada.action,
      entrada.entityType,
      entrada.entityId == null ? null : String(entrada.entityId),
      entrada.correlationId ?? null,
      details === null ? null : JSON.stringify(details),
    ],
  );
}
