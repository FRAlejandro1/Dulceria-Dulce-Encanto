import { useCallback, useEffect, useState } from 'react'
import type { UsuarioAutenticado } from '../../auth/types/auth.types'
import {
  listarNotificaciones,
  marcarNotificacionLeida,
} from '../services/order-notifications.service'
import type { NotificacionPedido } from '../services/order-notifications.service'

export function useOrderNotifications(usuario: UsuarioAutenticado | null) {
  const [notificaciones, setNotificaciones] = useState<NotificacionPedido[]>([])
  const [cargandoNotificaciones, setCargandoNotificaciones] = useState(false)
  const [errorNotificaciones, setErrorNotificaciones] = useState('')

  const cargarNotificaciones = useCallback(async () => {
    if (!usuario) {
      setNotificaciones([])
      setErrorNotificaciones('')
      setCargandoNotificaciones(false)
      return
    }

    setCargandoNotificaciones(true)
    setErrorNotificaciones('')

    try {
      const resultado = await listarNotificaciones()
      setNotificaciones(resultado)
    } catch (error) {
      setErrorNotificaciones(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar las notificaciones.',
      )
    } finally {
      setCargandoNotificaciones(false)
    }
  }, [usuario])

  useEffect(() => {
    void cargarNotificaciones()
  }, [cargarNotificaciones])

  const marcarComoLeida = useCallback(async (id: string) => {
    try {
      await marcarNotificacionLeida(id)
      setNotificaciones((actuales) =>
        actuales.map((notificacion) =>
          notificacion.id === id
            ? { ...notificacion, leidaEn: new Date().toISOString() }
            : notificacion,
        ),
      )
    } catch (error) {
      setErrorNotificaciones(
        error instanceof Error
          ? error.message
          : 'No se pudo marcar la notificación como leída.',
      )
    }
  }, [])

  const pendientes = notificaciones.filter(
    (notificacion) => notificacion.leidaEn === null,
  ).length

  return {
    notificaciones,
    pendientes,
    cargandoNotificaciones,
    errorNotificaciones,
    cargarNotificaciones,
    marcarComoLeida,
  }
}
