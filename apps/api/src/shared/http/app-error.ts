/**
 * Error controlado de aplicación con estado HTTP y mensaje público.
 * Permite comunicar errores de negocio sin exponer detalles internos.
 */
export class ErrorAplicacion extends Error {
  constructor(
    public readonly status: number,
    public readonly mensajePublico: string,
  ) {
    super(mensajePublico);
    this.name = 'ErrorAplicacion';
  }
}
