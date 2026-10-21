import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listarProductosCatalogo } = vi.hoisted(() => ({
  listarProductosCatalogo: vi.fn(),
}));

vi.mock('../src/modules/catalog/catalog.repository.js', () => ({
  listarProductosCatalogo,
}));

import { crearAplicacion } from '../src/app.js';

beforeEach(() => {
  vi.clearAllMocks();
  listarProductosCatalogo.mockResolvedValue([]);
});

describe('GET /api/v1/catalog/products', () => {
  it('devuelve los productos en el formato público esperado', async () => {
    listarProductosCatalogo.mockResolvedValueOnce([
      {
        id: '1',
        nombre: 'Alfajores',
        descripcion: null,
        categoria: { nombre: 'Tradicionales', slug: 'tradicionales' },
        variantes: [],
      },
    ]);

    const respuesta = await request(crearAplicacion())
      .get('/api/v1/catalog/products')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(respuesta.body).toEqual({
      productos: [
        {
          id: '1',
          nombre: 'Alfajores',
          descripcion: null,
          categoria: { nombre: 'Tradicionales', slug: 'tradicionales' },
          variantes: [],
        },
      ],
    });
    expect(listarProductosCatalogo).toHaveBeenCalledWith({});
  });

  it('limpia la búsqueda y transmite todos los filtros válidos', async () => {
    await request(crearAplicacion())
      .get('/api/v1/catalog/products?q=%20alfajor%20&categoria=tradicionales&ordenarPrecio=asc')
      .expect(200);

    expect(listarProductosCatalogo).toHaveBeenCalledWith({
      busqueda: 'alfajor',
      categoria: 'tradicionales',
      ordenarPrecio: 'asc',
    });
  });

  it('acepta el ordenamiento descendente', async () => {
    await request(crearAplicacion())
      .get('/api/v1/catalog/products?ordenarPrecio=desc')
      .expect(200);

    expect(listarProductosCatalogo).toHaveBeenCalledWith({
      ordenarPrecio: 'desc',
    });
  });

  it('rechaza un ordenamiento no permitido', async () => {
    const respuesta = await request(crearAplicacion())
      .get('/api/v1/catalog/products?ordenarPrecio=aleatorio')
      .expect(400);

    expect(respuesta.body).toEqual({ error: 'Solicitud inválida' });
    expect(listarProductosCatalogo).not.toHaveBeenCalled();
  });

  it('rechaza una búsqueda vacía después de eliminar espacios', async () => {
    const respuesta = await request(crearAplicacion())
      .get('/api/v1/catalog/products?q=%20%20')
      .expect(400);

    expect(respuesta.body).toEqual({ error: 'Solicitud inválida' });
    expect(listarProductosCatalogo).not.toHaveBeenCalled();
  });

  it('rechaza una búsqueda que excede 100 caracteres', async () => {
    const busquedaLarga = 'a'.repeat(101);

    const respuesta = await request(crearAplicacion())
      .get(`/api/v1/catalog/products?q=${busquedaLarga}`)
      .expect(400);

    expect(respuesta.body).toEqual({ error: 'Solicitud inválida' });
    expect(listarProductosCatalogo).not.toHaveBeenCalled();
  });

  it('rechaza una categoría vacía', async () => {
    const respuesta = await request(crearAplicacion())
      .get('/api/v1/catalog/products?categoria=')
      .expect(400);

    expect(respuesta.body).toEqual({ error: 'Solicitud inválida' });
    expect(listarProductosCatalogo).not.toHaveBeenCalled();
  });

  it('devuelve una lista vacía cuando no existen productos', async () => {
    const respuesta = await request(crearAplicacion())
      .get('/api/v1/catalog/products')
      .expect(200);

    expect(respuesta.body).toEqual({ productos: [] });
  });

  it('delega los errores de consulta al manejador global', async () => {
    listarProductosCatalogo.mockRejectedValueOnce(
      new Error('Detalle interno de la base de datos'),
    );

    const respuesta = await request(crearAplicacion())
      .get('/api/v1/catalog/products')
      .expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
    expect(JSON.stringify(respuesta.body)).not.toContain(
      'Detalle interno de la base de datos',
    );
  });
});
