export type TipoImagenAdmin = 'category' | 'product' | 'variant';

export interface ImagenAlmacenada {
  nombreArchivo: string;
  url: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  tamanoBytes: number;
}

export interface AlmacenamientoImagenes {
  guardar(
    tipo: TipoImagenAdmin,
    contenido: Buffer,
    mimeTypeDeclarado: string,
  ): Promise<ImagenAlmacenada>;

  eliminar(nombreArchivo: string): Promise<void>;

  obtenerReferenciaLocal(url: string | null): string | null;
}
