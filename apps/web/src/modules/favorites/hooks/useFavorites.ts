import { useCallback, useEffect, useRef, useState } from 'react'
import type { UsuarioAutenticado } from '../../auth/types/auth.types'
import {
  agregarFavorito,
  eliminarFavorito,
  obtenerFavoritos,
} from '../services/favorites.service'

type NotificarError = (mensaje: string) => void

export function useFavorites(
  usuario: UsuarioAutenticado | null,
  notificarError?: NotificarError,
) {
  const [favoritos, setFavoritos] = useState<string[]>([])
  const favoritosRef = useRef<string[]>([])
  const operacionesPendientesRef = useRef(new Set<string>())
  const identidadAnteriorRef = useRef<string | null>(null)

  const usuarioId =
    usuario?.rol === 'CLIENTE' ? usuario.id : null

  const actualizarFavoritos = useCallback((ids: string[]) => {
    favoritosRef.current = ids
    setFavoritos(ids)
  }, [])

  useEffect(() => {
    let activa = true

    const identidadActual = usuarioId ?? null
    const cambioIdentidad =
      identidadAnteriorRef.current !== identidadActual

    if (cambioIdentidad) {
      identidadAnteriorRef.current = identidadActual
      actualizarFavoritos([])
      operacionesPendientesRef.current.clear()
    }

    if (!usuarioId) {
      return () => {
        activa = false
      }
    }

    async function cargarFavoritos() {
      try {
        const favoritosRemotos = await obtenerFavoritos()

        if (!activa) {
          return
        }

        actualizarFavoritos(favoritosRemotos)
      } catch {
        if (activa) {
          notificarError?.('No se pudieron cargar tus favoritos.')
        }
      }
    }

    void cargarFavoritos()

    return () => {
      activa = false
    }
  }, [usuarioId, actualizarFavoritos, notificarError])

  const alternarFavorito = useCallback(
    async (productoId: string) => {
      if (operacionesPendientesRef.current.has(productoId)) {
        return
      }

      const actuales = favoritosRef.current
      const existe = actuales.includes(productoId)

      // Los favoritos anónimos no se guardan ni se sincronizan
      // con ninguna cuenta autenticada.
      if (!usuarioId) {
        const nuevos = existe
          ? actuales.filter((id) => id !== productoId)
          : [...actuales, productoId]

        actualizarFavoritos(nuevos)
        return
      }

      operacionesPendientesRef.current.add(productoId)

      try {
        if (existe) {
          await eliminarFavorito(productoId)
        } else {
          await agregarFavorito(productoId)
        }

        const nuevos = existe
          ? favoritosRef.current.filter((id) => id !== productoId)
          : favoritosRef.current.includes(productoId)
            ? favoritosRef.current
            : [...favoritosRef.current, productoId]

        actualizarFavoritos(nuevos)
      } catch {
        notificarError?.(
          'No se pudo actualizar tu lista de favoritos.',
        )
      } finally {
        operacionesPendientesRef.current.delete(productoId)
      }
    },
    [usuarioId, actualizarFavoritos, notificarError],
  )

  return {
    favoritos,
    alternarFavorito,
  }
}