export type Variante = {
  id: string;
  nombre: string;
  sku: string;
  precio: string;
  imagenUrl: string | null;
  stockDisponible: number;
};

export type Producto = {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  categoria: {
    nombre: string;
    slug: string;
  };
  variantes: Variante[];
};

export type RespuestaCatalogo = {
  productos: Producto[];
};

export type EstadoCarga = 'cargando' | 'correcto' | 'error';
