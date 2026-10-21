
interface AuthMessageProps {
  mensaje: string
  tipo?: 'error' | 'exito' | 'informacion'
}

export default function AuthMessage({
  mensaje,
  tipo = 'informacion',
}: AuthMessageProps) {
  if (!mensaje) return null

  return (
    <p
      className={`auth-message auth-message--${tipo}`}
      role={tipo === 'error' ? 'alert' : 'status'}
    >
      {mensaje}
    </p>
  )
}
