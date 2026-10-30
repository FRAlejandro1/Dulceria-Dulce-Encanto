import { useCallback, useEffect, useState } from 'react'
import {
  actualizarEstadoPedidoAdmin,
  obtenerClientesPedidosAdmin,
  obtenerDashboardPedidosAdmin,
  obtenerDetallePedidoAdmin,
  obtenerVentasPeriodoAdmin,
} from '../services/orders-admin.service'
import type {
  DashboardPedidosAdmin,
  DetallePedidoAdmin,
  EstadoPedidoAdmin,
  PeriodoVentasAdmin,
  RespuestaClientesPedidosAdmin,
  VentaPeriodoAdmin,
} from '../types/orders.types'

const LIMITE_CLIENTES = 8

function fechaLocal(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

function calcularRangoVentas(
  periodo: PeriodoVentasAdmin,
  anio: number,
  mes: number,
  fechaDesde: string,
  fechaHasta: string,
) {
  const hoy = new Date()

  if (periodo === 'dia') {
    const fecha = fechaLocal(hoy)
    return { desde: fecha, hasta: fecha }
  }

  if (periodo === 'semana') {
    const lunes = new Date(hoy)
    const diaSemana = (lunes.getDay() + 6) % 7
    lunes.setDate(lunes.getDate() - diaSemana)

    const domingo = new Date(lunes)
    domingo.setDate(lunes.getDate() + 6)

    return {
      desde: fechaLocal(lunes),
      hasta: fechaLocal(domingo),
    }
  }

  if (periodo === 'mes') {
    const inicio = new Date(anio, mes - 1, 1)
    const fin = new Date(anio, mes, 0)

    return {
      desde: fechaLocal(inicio),
      hasta: fechaLocal(fin),
    }
  }

  if (periodo === 'anio') {
    return {
      desde: `${anio}-01-01`,
      hasta: `${anio}-12-31`,
    }
  }

  return {
    desde: fechaDesde,
    hasta: fechaHasta,
  }
}

export function useAdminOrders() {
  const hoy = fechaLocal(new Date())

  const [estado, setEstado] = useState<EstadoPedidoAdmin | ''>('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)

  const [periodoVentas, setPeriodoVentas] =
    useState<PeriodoVentasAdmin>('anio')
  const [anioVentas, setAnioVentas] =
    useState(new Date().getFullYear())
  const [mesVentas, setMesVentas] =
    useState(new Date().getMonth() + 1)
  const [fechaDesdeVentas, setFechaDesdeVentas] = useState(hoy)
  const [fechaHastaVentas, setFechaHastaVentas] = useState(hoy)

  const [estadoDashboard, setEstadoDashboard] = useState<EstadoPedidoAdmin | ''>('')

  const [dashboard, setDashboard] =
    useState<DashboardPedidosAdmin | null>(null)
  const [ventasPeriodo, setVentasPeriodo] =
    useState<VentaPeriodoAdmin[]>([])
  const [respuesta, setRespuesta] =
    useState<RespuestaClientesPedidosAdmin | null>(null)
  const [pedidoSeleccionado, setPedidoSeleccionado] =
    useState<DetallePedidoAdmin | null>(null)

  const [cargandoDashboard, setCargandoDashboard] = useState(true)
  const [cargandoVentas, setCargandoVentas] = useState(true)
  const [cargandoClientes, setCargandoClientes] = useState(true)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [actualizando, setActualizando] = useState(false)
  const [error, setError] = useState('')
  const [errorDashboard, setErrorDashboard] = useState('')
  const [errorVentas, setErrorVentas] = useState('')
  const [errorDetalle, setErrorDetalle] = useState('')

  const rangoVentas = calcularRangoVentas(
    periodoVentas,
    anioVentas,
    mesVentas,
    fechaDesdeVentas,
    fechaHastaVentas,
  )

  const cargarDashboard = useCallback(async () => {
    setCargandoDashboard(true)
    setErrorDashboard('')

    try {
      setDashboard(await obtenerDashboardPedidosAdmin({
        periodo: periodoVentas,
        desde: rangoVentas.desde,
        hasta: rangoVentas.hasta,

      }))
    } catch (errorCarga) {
      setErrorDashboard(
        errorCarga instanceof Error
          ? errorCarga.message
          : 'No se pudo cargar el resumen de pedidos.',
      )
    } finally {
      setCargandoDashboard(false)
    }
  }, [periodoVentas, rangoVentas.desde, rangoVentas.hasta])

  const cargarVentasPeriodo = useCallback(async () => {
    setCargandoVentas(true)
    setErrorVentas('')

    if (!rangoVentas.desde || !rangoVentas.hasta) {
      setErrorVentas('Selecciona las fechas del período.')
      setCargandoVentas(false)
      return
    }

    if (rangoVentas.desde > rangoVentas.hasta) {
      setErrorVentas('La fecha inicial no puede superar la fecha final.')
      setCargandoVentas(false)
      return
    }

    try {
      setVentasPeriodo(
        await obtenerVentasPeriodoAdmin(
          periodoVentas,
          rangoVentas.desde,
          rangoVentas.hasta,
        ),
      )
    } catch (errorCarga) {
      setErrorVentas(
        errorCarga instanceof Error
          ? errorCarga.message
          : 'No se pudieron cargar las ventas del período.',
      )
    } finally {
      setCargandoVentas(false)
    }
  }, [
    periodoVentas,
    rangoVentas.desde,
    rangoVentas.hasta,
  ])

  const cargarClientes = useCallback(async () => {
    setCargandoClientes(true)
    setError('')

    try {
      const resultado = await obtenerClientesPedidosAdmin({
        estado: estado || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        busqueda: busqueda.trim() || undefined,
        pagina,
        limite: LIMITE_CLIENTES,
      })

      setRespuesta(resultado)
    } catch (errorCarga) {
      setError(
        errorCarga instanceof Error
          ? errorCarga.message
          : 'No se pudieron cargar los clientes y sus pedidos.',
      )
    } finally {
      setCargandoClientes(false)
    }
  }, [estado, desde, hasta, busqueda, pagina])

  useEffect(() => {
    void Promise.resolve().then(cargarDashboard)
  }, [cargarDashboard])

  useEffect(() => {
    void Promise.resolve().then(cargarVentasPeriodo)
  }, [cargarVentasPeriodo])

  useEffect(() => {
    void Promise.resolve().then(cargarClientes)
  }, [cargarClientes])

  const abrirDetalle = useCallback(async (pedidoId: string) => {
    setPedidoSeleccionado(null)
    setCargandoDetalle(true)
    setErrorDetalle('')

    try {
      const resultado = await obtenerDetallePedidoAdmin(pedidoId)
      setPedidoSeleccionado(resultado.pedido)
    } catch (errorCarga) {
      setErrorDetalle(
        errorCarga instanceof Error
          ? errorCarga.message
          : 'No se pudo consultar el detalle del pedido.',
      )
    } finally {
      setCargandoDetalle(false)
    }
  }, [])

  const cambiarEstado = useCallback(
    async (
      pedidoId: string,
      nuevoEstado: Extract<
        EstadoPedidoAdmin,
        'CONFIRMADO' | 'RECHAZADO' | 'CANCELADO'
      >,
    ) => {
      setActualizando(true)
      setErrorDetalle('')

      try {
        await actualizarEstadoPedidoAdmin(pedidoId, nuevoEstado)
        await Promise.all([
          cargarClientes(),
          cargarDashboard(),
          cargarVentasPeriodo(),
        ])
        await abrirDetalle(pedidoId)
      } catch (errorActualizacion) {
        setErrorDetalle(
          errorActualizacion instanceof Error
            ? errorActualizacion.message
            : 'No se pudo actualizar el estado del pedido.',
        )
      } finally {
        setActualizando(false)
      }
    },
    [cargarClientes, cargarDashboard, cargarVentasPeriodo, abrirDetalle],
  )

  const cambiarEstadoFiltro = (valor: EstadoPedidoAdmin | '') => {
    setEstado(valor)
    setPagina(1)
  }

  const cambiarDesde = (valor: string) => {
    setDesde(valor)
    setPagina(1)
  }

  const cambiarHasta = (valor: string) => {
    setHasta(valor)
    setPagina(1)
  }

  const cambiarBusqueda = (valor: string) => {
    setBusqueda(valor)
    setPagina(1)
  }

  return {
    estado,
    desde,
    hasta,
    busqueda,
    pagina,
    periodoVentas,
    anioVentas,
    mesVentas,
    fechaDesdeVentas,
    fechaHastaVentas,
    rangoVentas,
    dashboard,
    ventasPeriodo,
    respuesta,
    pedidoSeleccionado,
    cargandoDashboard,
    cargandoVentas,
    cargandoClientes,
    cargandoDetalle,
    actualizando,
    error,
    errorDashboard,
    errorVentas,
    errorDetalle,
    cambiarEstadoFiltro,
    cambiarDesde,
    cambiarHasta,
    cambiarBusqueda,
    cambiarPagina: setPagina,
    cambiarPeriodoVentas: setPeriodoVentas,
    estadoDashboard,
    cambiarEstadoDashboard: setEstadoDashboard,
    cambiarAnioVentas: setAnioVentas,
    cambiarMesVentas: setMesVentas,
    cambiarFechaDesdeVentas: setFechaDesdeVentas,
    cambiarFechaHastaVentas: setFechaHastaVentas,
    cargarDashboard,
    cargarVentasPeriodo,
    cargarClientes,
    abrirDetalle,
    cerrarDetalle: () => {
      setPedidoSeleccionado(null)
      setErrorDetalle('')
    },
    cambiarEstado,
  }
}
