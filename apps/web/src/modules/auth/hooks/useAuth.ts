
import { useCallback, useState } from 'react'

import {
  cerrarSesion as solicitarCierreSesion,
  iniciarSesion as solicitarInicioSesion,
  registrarUsuario as solicitarRegistro,
} from '../services/auth.service'
import type {
  DatosInicioSesion,
  DatosRegistro,
  UsuarioAutenticado,
} from '../types/auth.types'
import { obtenerMensajeError } from '../utils/auth.utils'

interface EstadoAutenticacion {
  usuario: UsuarioAutenticado | null
  procesando: boolean
  error: string
}

export function useAuth() {
  const [estado, setEstado] = useState<EstadoAutenticacion>({
    usuario: null,
    procesando: false,
    error: '',
  })

  const iniciarSesion = useCallback(
    async (datos: DatosInicioSesion): Promise<boolean> => {
      setEstado((actual) => ({
        ...actual,
        procesando: true,
        error: '',
      }))

      try {
        const respuesta = await solicitarInicioSesion(datos)

        setEstado({
          usuario: respuesta.usuario,
          procesando: false,
          error: '',
        })

        return true
      } catch (error: unknown) {
        setEstado((actual) => ({
          ...actual,
          procesando: false,
          error: obtenerMensajeError(error),
        }))

        return false
      }
    },
    [],
  )

  const registrarUsuario = useCallback(
    async (datos: DatosRegistro): Promise<boolean> => {
      setEstado((actual) => ({
        ...actual,
        procesando: true,
        error: '',
      }))

      try {
        await solicitarRegistro(datos)

        setEstado((actual) => ({
          ...actual,
          procesando: false,
          error: '',
        }))

        return true
      } catch (error: unknown) {
        setEstado((actual) => ({
          ...actual,
          procesando: false,
          error: obtenerMensajeError(error),
        }))

        return false
      }
    },
    [],
  )

  const cerrarSesion = useCallback(async (): Promise<boolean> => {
    setEstado((actual) => ({
      ...actual,
      procesando: true,
      error: '',
    }))

    try {
      await solicitarCierreSesion()

      setEstado({
        usuario: null,
        procesando: false,
        error: '',
      })

      return true
    } catch (error: unknown) {
      setEstado((actual) => ({
        ...actual,
        procesando: false,
        error: obtenerMensajeError(error),
      }))

      return false
    }
  }, [])

  const limpiarError = useCallback(() => {
    setEstado((actual) => ({ ...actual, error: '' }))
  }, [])

  return {
    usuario: estado.usuario,
    autenticado: estado.usuario !== null,
    procesando: estado.procesando,
    error: estado.error,
    iniciarSesion,
    registrarUsuario,
    cerrarSesion,
    limpiarError,
  }
}
