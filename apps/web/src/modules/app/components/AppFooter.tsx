interface AppFooterProps {
  onVolverAlInicio: () => void
}

export default function AppFooter({
  onVolverAlInicio,
}: AppFooterProps) {
  return (
    <footer className="footer">
      <span className="brand__mark footer__mark">DE</span>

      <p>
        © Dulce Encanto · Hecho para compartir momentos dulces.
      </p>

      <a
        href="#inicio"
        onClick={(evento) => {
          evento.preventDefault()
          onVolverAlInicio()
        }}
      >
        Volver arriba ↑
      </a>
    </footer>
  )
}
