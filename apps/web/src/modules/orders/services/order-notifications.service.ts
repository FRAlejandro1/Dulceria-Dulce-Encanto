export interface NotificacionPedido {
  id: string
  pedidoId: string | null
  titulo: string
  mensaje: string
  leidaEn: string | null
  creadaEn: string
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null
}

function validarNotificacion(valor: unknown): NotificacionPedido {
  if (
    !esObjeto(valor) ||
    (typeof valor.id !== 'string' && typeof valor.id !== 'number') ||
    typeof valor.titulo !== 'string' ||
    typeof valor.mensaje !== 'string' ||
    typeof valor.creadaEn !== 'string' ||
    (valor.pedidoId !== null &&
      typeof valor.pedidoId !== 'string' &&
      typeof valor.pedidoId !== 'number') ||
    (valor.leidaEn !== null && typeof valor.leidaEn !== 'string')
  ) {
    throw new Error('El servidor devolvió una notificación inválida.')
  }

  return {
    id: String(valor.id),
    pedidoId: valor.pedidoId == null ? null : String(valor.pedidoId),
    titulo: valor.titulo,
    mensaje: valor.mensaje,
    leidaEn: typeof valor.leidaEn === 'string' ? valor.leidaEn : null,
    creadaEn: valor.creadaEn,
  }
}

export async function listarNotificaciones(): Promise<NotificacionPedido[]> {
  const respuesta = await fetch('/api/v1/orders/notifications', {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  const { comprobarRespuesta } = await import('../../../services/http.service')
  const datos = await comprobarRespuesta(respuesta)

  if (!esObjeto(datos) || !Array.isArray(datos.notificaciones)) {
    throw new Error('No se pudieron interpretar las notificaciones.')
  }

  return datos.notificaciones.map(validarNotificacion)
}

export async function marcarNotificacionLeida(id: string): Promise<void> {
  const { enviarSolicitudProtegida } = await import('../../../services/http.service')

  await enviarSolicitudProtegida(
    `/api/v1/orders/notifications/${encodeURIComponent(id)}/read`,
    { metodo: 'PATCH' },
  )
}
