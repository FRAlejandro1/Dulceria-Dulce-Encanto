import { useCallback, useState } from 'react'
import type { UsuarioAutenticado } from '../../auth/types/auth.types'

interface UseAppSessionParams {
  setAviso: (mensaje: string) => void
  setVistaCarrito: (visible: boolean) => void
  setPanel: (panel: 'ninguno' | 'notificaciones' | 'perfil') => void
}

export function useAppSession({
  setAviso,
  setVistaCarrito,
  setPanel,
}: UseAppSessionParams) {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null)
  const [authAbierta, setAuthAbierta] = useState(false)
  const [vistaAdministracion, setVistaAdministracion] = useState(false)

  const abrirAutenticacion = useCallback(() => {
    setPanel('ninguno')
    setAuthAbierta(true)
  }, [setPanel])

  const cerrarAutenticacion = useCallback(() => {
    setAuthAbierta(false)
  }, [])

  const manejarAutenticacion = useCallback(
    (usuarioAutenticado: UsuarioAutenticado) => {
      setUsuario(usuarioAutenticado)
      setAuthAbierta(false)
      setPanel('ninguno')
      setVistaCarrito(false)

      const esAdministrador = usuarioAutenticado.rol === 'ADMIN'
      setVistaAdministracion(esAdministrador)

      setAviso(
        esAdministrador
          ? `Sesión administrativa iniciada como ${usuarioAutenticado.nombre}.`
          : `Sesión iniciada como ${usuarioAutenticado.nombre}.`,
      )
    },
    [setAviso, setPanel, setVistaCarrito],
  )

  const manejarCierreSesion = useCallback(() => {
    setUsuario(null)
    setVistaAdministracion(false)
    setVistaCarrito(false)
    setPanel('ninguno')
    setAuthAbierta(false)
    setAviso(
      'Has cerrado sesión. Tus favoritos y carrito siguen siendo temporales.',
    )
  }, [setAviso, setPanel, setVistaCarrito])

  const abrirAdministracion = useCallback(() => {
    if (usuario?.rol !== 'ADMIN') {
      setAviso('No tienes permisos para acceder a la administración.')
      return
    }

    setVistaAdministracion(true)
    setVistaCarrito(false)
    setPanel('ninguno')
    setAuthAbierta(false)
  }, [usuario, setAviso, setPanel, setVistaCarrito])

  const volverATienda = useCallback(() => {
    setVistaAdministracion(false)
    setVistaCarrito(false)
    setPanel('ninguno')
  }, [setPanel, setVistaCarrito])

  return {
    usuario,
    authAbierta,
    vistaAdministracion,
    abrirAutenticacion,
    cerrarAutenticacion,
    manejarAutenticacion,
    manejarCierreSesion,
    abrirAdministracion,
    volverATienda,
  }
}
