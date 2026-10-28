import { useEffect } from 'react'
import { DURACION_AVISO_MS } from './notification.constants'

interface ToastProps {
  mensaje: string
  duracion?: number
  onCerrar: () => void
}

export default function Toast({
  mensaje,
  duracion = DURACION_AVISO_MS,
  onCerrar,
}: ToastProps) {
  useEffect(() => {
    if (!mensaje) return

    const temporizador = window.setTimeout(onCerrar, duracion)

    return () => window.clearTimeout(temporizador)
  }, [mensaje, duracion, onCerrar])

  if (!mensaje) return null

  return (
    <div className="toast" role="status">
      <span className="toast__message">{mensaje}</span>
      <button
        type="button"
        className="toast__close"
        onClick={onCerrar}
        aria-label="Cerrar aviso"
      >
        ×
      </button>
    </div>
  )
}
