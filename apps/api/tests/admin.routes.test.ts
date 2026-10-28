import request from 'supertest';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const {
  listarCategoriasAdmin,
  listarProductosAdmin,
  crearCategoria,
  actualizarCategoria,
  crearProducto,
  actualizarProducto,
  crearVariante,
  actualizarVariante,
  ajustarStock,
  cargarImagenCategoria,
  eliminarImagenCategoria,
  cargarImagenProducto,
  eliminarImagenProducto,
  cargarImagenVariante,
  eliminarImagenVariante,
  cargarImagenPrincipalVariante,
  eliminarImagenPrincipalVariante,
  listarImagenesAdicionalesVariante,
  buscarUsuarioPorId,
  buscarSesionActivaPorHash,
} = vi.hoisted(() => ({
  listarCategoriasAdmin: vi.fn(),
  listarProductosAdmin: vi.fn(),
  crearCategoria: vi.fn(),
  actualizarCategoria: vi.fn(),
  crearProducto: vi.fn(),
  actualizarProducto: vi.fn(),
  crearVariante: vi.fn(),
  actualizarVariante: vi.fn(),
  ajustarStock: vi.fn(),
  cargarImagenCategoria: vi.fn(),
  eliminarImagenCategoria: vi.fn(),
  cargarImagenProducto: vi.fn(),
  eliminarImagenProducto: vi.fn(),
  cargarImagenVariante: vi.fn(),
  eliminarImagenVariante: vi.fn(),
  cargarImagenPrincipalVariante: vi.fn(),
  eliminarImagenPrincipalVariante: vi.fn(),
  listarImagenesAdicionalesVariante: vi.fn(),
  buscarUsuarioPorId: vi.fn(),
  buscarSesionActivaPorHash: vi.fn(),
}));

vi.mock('../src/modules/admin/admin.service.js', () => ({
  listarCategoriasAdmin,
  listarProductosAdmin,
  crearCategoria,
  actualizarCategoria,
  crearProducto,
  actualizarProducto,
  crearVariante,
  actualizarVariante,
  ajustarStock,
}));

vi.mock('../src/modules/admin/admin-images.service.js', () => ({
  cargarImagenCategoria,
  eliminarImagenCategoria,
  cargarImagenProducto,
  eliminarImagenProducto,
  cargarImagenVariante,
  eliminarImagenVariante,
  cargarImagenPrincipalVariante,
  eliminarImagenPrincipalVariante,
  listarImagenesAdicionalesVariante,
}));

vi.mock('../src/modules/users/users.repository.js', () => ({
  buscarUsuarioPorId,
}));

vi.mock('../src/modules/auth/sessions.repository.js', () => ({
  buscarSesionActivaPorHash,
}));

import { crearAplicacion } from '../src/app.js';
import { COOKIE_SESION } from '../src/shared/security/authentication.middleware.js';
import { generarTokenCsrf } from '../src/shared/security/csrf.js';

const tokenSesion = 'A'.repeat(43);
const origenWeb = 'http://localhost:5173';

function prepararAutenticacion(rol: 'ADMIN' | 'CLIENTE' = 'ADMIN') {
  buscarSesionActivaPorHash.mockResolvedValue({
    id: '7',
    userId: '20',
    expiraEn: '2099-12-31 23:59:59.000',
  });

  buscarUsuarioPorId.mockResolvedValue({
    id: '20',
    nombre: 'Usuario de prueba',
    correo: 'usuario@example.com',
    hashContrasena: 'hash',
    rol,
    activo: true,
  });
}

function solicitudAdmin(
  metodo: 'get' | 'post' | 'patch' | 'delete',
  ruta: string,
) {
  const agente = request(crearAplicacion());

  return agente[metodo](ruta)
    .set('Cookie', `${COOKIE_SESION}=${tokenSesion}`);
}

function agregarCsrf<T extends request.Test>(solicitud: T): T {
  return solicitud
    .set('Origin', origenWeb)
    .set('X-CSRF-Token', generarTokenCsrf());
}

function cuerpoProducto() {
  return {
    nombre: 'Caja de alfajores',
    categoriaId: '1',
    variantes: [
      {
        nombre: 'Caja pequeña',
        sku: 'CAJA-PEQ',
        precio: '2.50',
      },
    ],
  };
}

function cuerpoVariante() {
  return {
    nombre: 'Caja pequeña',
    sku: 'CAJA-PEQ',
    precio: '2.50',
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  vi.stubEnv(
    'CSRF_SECRET',
    Buffer.from('0123456789abcdef0123456789abcdef').toString('base64url'),
  );

  prepararAutenticacion();

  listarCategoriasAdmin.mockResolvedValue([]);
  listarProductosAdmin.mockResolvedValue([]);
  crearCategoria.mockResolvedValue({ id: '1' });
  actualizarCategoria.mockResolvedValue(undefined);
  crearProducto.mockResolvedValue({ id: '2' });
  actualizarProducto.mockResolvedValue(undefined);
  crearVariante.mockResolvedValue({ id: '3' });
  actualizarVariante.mockResolvedValue(undefined);

  ajustarStock.mockResolvedValue({
    varianteId: '3',
    stockFisicoAnterior: 5,
    stockFisico: 8,
    stockReservado: 2,
    stockDisponible: 6,
    diferencia: 3,
  });

  cargarImagenCategoria.mockResolvedValue({
    imagenUrl: '/uploads/categoria.png',
  });
  eliminarImagenCategoria.mockResolvedValue(undefined);

  cargarImagenVariante.mockResolvedValue({
    id: '9',
    imagenUrl: '/uploads/variante.png',
    posicion: 1,
  });
  eliminarImagenVariante.mockResolvedValue(undefined);

  cargarImagenProducto.mockResolvedValue({
    imagenUrl: '/uploads/producto.png',
  });

  eliminarImagenProducto.mockResolvedValue(undefined);

  cargarImagenPrincipalVariante.mockResolvedValue({
    imagenUrl: '/uploads/variante-principal.png',
  });

  eliminarImagenPrincipalVariante.mockResolvedValue(undefined);

  listarImagenesAdicionalesVariante.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('autorización de las rutas administrativas', () => {
  it('rechaza una solicitud sin sesión', async () => {
    const respuesta = await request(crearAplicacion())
      .get('/api/v1/admin/categories')
      .expect(401);

    expect(respuesta.body).toEqual({
      error: 'Se requiere autenticación',
    });
    expect(listarCategoriasAdmin).not.toHaveBeenCalled();
  });

  it('rechaza a un usuario con rol CLIENTE', async () => {
    prepararAutenticacion('CLIENTE');

    const respuesta = await solicitudAdmin(
      'get',
      '/api/v1/admin/categories',
    ).expect(403);

    expect(respuesta.body).toEqual({
      error: 'No tiene permisos para realizar esta operación',
    });
    expect(listarCategoriasAdmin).not.toHaveBeenCalled();
  });

  it('permite a ADMIN consultar las categorías', async () => {
    listarCategoriasAdmin.mockResolvedValueOnce([
      {
        id: '1',
        nombre: 'Tradicionales',
        slug: 'tradicionales',
        activa: true,
      },
    ]);

    const respuesta = await solicitudAdmin(
      'get',
      '/api/v1/admin/categories',
    ).expect(200);

    expect(respuesta.body).toEqual({
      categorias: [
        {
          id: '1',
          nombre: 'Tradicionales',
          slug: 'tradicionales',
          activa: true,
        },
      ],
    });
    expect(listarCategoriasAdmin).toHaveBeenCalledOnce();
  });

  it('permite a ADMIN consultar los productos', async () => {
    listarProductosAdmin.mockResolvedValueOnce([]);

    const respuesta = await solicitudAdmin(
      'get',
      '/api/v1/admin/products',
    ).expect(200);

    expect(respuesta.body).toEqual({ productos: [] });
    expect(listarProductosAdmin).toHaveBeenCalledOnce();
  });
});

describe('protección CSRF y validación de las rutas administrativas', () => {
  it('rechaza crear una categoría sin token CSRF válido', async () => {
    const respuesta = await solicitudAdmin(
      'post',
      '/api/v1/admin/categories',
    )
      .set('Origin', origenWeb)
      .send({ nombre: 'Tradicionales' })
      .expect(403);

    expect(respuesta.body).toHaveProperty('error');
    expect(crearCategoria).not.toHaveBeenCalled();
  });

  it('rechaza datos inválidos al crear una categoría', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/categories'),
    )
      .send({})
      .expect(400);

    expect(respuesta.body).toHaveProperty('error');
    expect(crearCategoria).not.toHaveBeenCalled();
  });

  it('crea una categoría válida y registra el identificador del administrador', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/categories'),
    )
      .send({
        nombre: 'Tradicionales',
        slug: 'tradicionales',
      })
      .expect(201);

    expect(respuesta.body).toEqual({
      categoria: { id: '1' },
    });
    expect(crearCategoria).toHaveBeenCalledWith('20', {
      nombre: 'Tradicionales',
      slug: 'tradicionales',
    });
  });

  it('permite crear una categoría sin especificar slug', async () => {
    await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/categories'),
    )
      .send({ nombre: 'Temporada' })
      .expect(201);

    expect(crearCategoria).toHaveBeenCalledWith('20', {
      nombre: 'Temporada',
    });
  });

  it('rechaza un identificador de categoría inválido', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('patch', '/api/v1/admin/categories/0'),
    )
      .send({ nombre: 'Actualizada' })
      .expect(400);

    expect(respuesta.body).toHaveProperty('error');
    expect(actualizarCategoria).not.toHaveBeenCalled();
  });

  it('rechaza actualizar una categoría con un cuerpo vacío', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('patch', '/api/v1/admin/categories/1'),
    )
      .send({})
      .expect(400);

    expect(respuesta.body).toHaveProperty('error');
    expect(actualizarCategoria).not.toHaveBeenCalled();
  });

  it('actualiza una categoría y devuelve el mensaje correspondiente', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('patch', '/api/v1/admin/categories/1'),
    )
      .send({ activa: false })
      .expect(200);

    expect(respuesta.body).toEqual({
      mensaje: 'Categoría actualizada',
    });
    expect(actualizarCategoria).toHaveBeenCalledWith(
      '20',
      '1',
      { activa: false },
    );
  });

  it('rechaza crear un producto sin variantes', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/products'),
    )
      .send({
        nombre: 'Caja de alfajores',
        categoriaId: '1',
        variantes: [],
      })
      .expect(400);

    expect(respuesta.body).toHaveProperty('error');
    expect(crearProducto).not.toHaveBeenCalled();
  });

  it('rechaza crear un producto con una categoría inválida', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/products'),
    )
      .send({
        ...cuerpoProducto(),
        categoriaId: '0',
      })
      .expect(400);

    expect(respuesta.body).toHaveProperty('error');
    expect(crearProducto).not.toHaveBeenCalled();
  });

  it('crea un producto válido y registra el identificador del administrador', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/products'),
    )
      .send(cuerpoProducto())
      .expect(201);

    expect(respuesta.body).toEqual({
      producto: { id: '2' },
    });
    expect(crearProducto).toHaveBeenCalledWith(
      '20',
      cuerpoProducto(),
    );
  });

  it('rechaza un identificador inválido al actualizar un producto', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('patch', '/api/v1/admin/products/0'),
    )
      .send({ nombre: 'Producto actualizado' })
      .expect(400);

    expect(respuesta.body).toHaveProperty('error');
    expect(actualizarProducto).not.toHaveBeenCalled();
  });

  it('rechaza actualizar un producto con un cuerpo vacío', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('patch', '/api/v1/admin/products/2'),
    )
      .send({})
      .expect(400);

    expect(respuesta.body).toHaveProperty('error');
    expect(actualizarProducto).not.toHaveBeenCalled();
  });

  it('actualiza un producto válido', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('patch', '/api/v1/admin/products/2'),
    )
      .send({ activo: false })
      .expect(200);

    expect(respuesta.body).toEqual({
      mensaje: 'Producto actualizado',
    });
    expect(actualizarProducto).toHaveBeenCalledWith(
      '20',
      '2',
      { activo: false },
    );
  });

  it('rechaza un identificador inválido al crear una variante', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/products/0/variants'),
    )
      .send(cuerpoVariante())
      .expect(400);

    expect(respuesta.body).toHaveProperty('error');
    expect(crearVariante).not.toHaveBeenCalled();
  });

  it('rechaza una variante con precio inválido', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/products/2/variants'),
    )
      .send({
        ...cuerpoVariante(),
        precio: '-1',
      })
      .expect(400);

    expect(respuesta.body).toHaveProperty('error');
    expect(crearVariante).not.toHaveBeenCalled();
  });

  it('crea una variante válida', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/products/2/variants'),
    )
      .send(cuerpoVariante())
      .expect(201);

    expect(respuesta.body).toEqual({
      variante: { id: '3' },
    });
    expect(crearVariante).toHaveBeenCalledWith(
      '20',
      '2',
      cuerpoVariante(),
    );
  });

  it('rechaza un identificador inválido al actualizar una variante', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('patch', '/api/v1/admin/variants/0'),
    )
      .send({ precio: '2.50' })
      .expect(400);

    expect(respuesta.body).toHaveProperty('error');
    expect(actualizarVariante).not.toHaveBeenCalled();
  });

  it('rechaza actualizar una variante con un cuerpo vacío', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('patch', '/api/v1/admin/variants/3'),
    )
      .send({})
      .expect(400);

    expect(respuesta.body).toHaveProperty('error');
    expect(actualizarVariante).not.toHaveBeenCalled();
  });

  it('actualiza una variante válida', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('patch', '/api/v1/admin/variants/3'),
    )
      .send({ precio: '2.50' })
      .expect(200);

    expect(respuesta.body).toEqual({
      mensaje: 'Variante actualizada',
    });
    expect(actualizarVariante).toHaveBeenCalledWith(
      '20',
      '3',
      { precio: '2.50' },
    );
  });

  it('ajusta el stock de una variante', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('patch', '/api/v1/admin/variants/3/stock'),
    )
      .send({
        cantidad: 8,
        motivo: 'Reposición de productos',
      })
      .expect(200);

    expect(respuesta.body.inventario).toEqual({
      varianteId: '3',
      stockFisicoAnterior: 5,
      stockFisico: 8,
      stockReservado: 2,
      stockDisponible: 6,
      diferencia: 3,
    });
    expect(ajustarStock).toHaveBeenCalledWith(
      '20',
      '3',
      {
        cantidad: 8,
        motivo: 'Reposición de productos',
      },
    );
  });

  it('rechaza un ajuste de stock inválido', async () => {
    await agregarCsrf(
      solicitudAdmin('patch', '/api/v1/admin/variants/3/stock'),
    )
      .send({
        cantidad: -1,
        motivo: 'x',
      })
      .expect(400);

    expect(ajustarStock).not.toHaveBeenCalled();
  });

  it('carga una imagen de categoría', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/categories/2/image'),
    )
      .attach('imagen', Buffer.from('imagen'), {
        filename: 'categoria.png',
        contentType: 'image/png',
      })
      .expect(200);

    expect(respuesta.body.categoria).toEqual({
      imagenUrl: '/uploads/categoria.png',
    });
    expect(cargarImagenCategoria).toHaveBeenCalledWith(
      '20',
      '2',
      expect.objectContaining({
        originalname: 'categoria.png',
      }),
    );
  });

  it('rechaza un identificador inválido al cargar imagen de categoría', async () => {
    await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/categories/0/image'),
    )
      .attach('imagen', Buffer.from('imagen'), {
        filename: 'categoria.png',
        contentType: 'image/png',
      })
      .expect(400);

    expect(cargarImagenCategoria).not.toHaveBeenCalled();
  });

  it('rechaza un identificador inválido al eliminar una imagen de categoría', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('delete', '/api/v1/admin/categories/0/image'),
    ).expect(400);

    expect(respuesta.body).toEqual({
      error: 'Identificador de categoría inválido',
    });
    expect(eliminarImagenCategoria).not.toHaveBeenCalled();
  });
  it('elimina una imagen de categoría', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('delete', '/api/v1/admin/categories/2/image'),
    ).expect(200);

    expect(respuesta.body).toEqual({
      mensaje: 'Imagen de categoría eliminada',
    });
    expect(eliminarImagenCategoria).toHaveBeenCalledWith('20', '2');
  });

  it('carga una imagen de variante', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/variants/3/images'),
    )
      .field('posicion', '1')
      .attach('imagen', Buffer.from('imagen'), {
        filename: 'variante.png',
        contentType: 'image/png',
      })
      .expect(200);

    expect(respuesta.body.imagen).toEqual({
      id: '9',
      imagenUrl: '/uploads/variante.png',
      posicion: 1,
    });
    expect(cargarImagenVariante).toHaveBeenCalledWith(
      '20',
      '3',
      expect.objectContaining({
        originalname: 'variante.png',
      }),
      1,
    );
  });

  it('rechaza una posición inválida para una imagen de variante', async () => {
    await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/variants/3/images'),
    )
      .field('posicion', '4')
      .attach('imagen', Buffer.from('imagen'), {
        filename: 'variante.png',
        contentType: 'image/png',
      })
      .expect(400);

    expect(cargarImagenVariante).not.toHaveBeenCalled();
  });

  it('rechaza un tipo MIME no permitido', async () => {
    await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/categories/2/image'),
    )
      .attach('imagen', Buffer.from('texto'), {
        filename: 'documento.txt',
        contentType: 'text/plain',
      })
      .expect(400);

    expect(cargarImagenCategoria).not.toHaveBeenCalled();
  });

  it('elimina una imagen de variante', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('delete', '/api/v1/admin/variants/3/images/9'),
    ).expect(200);

    expect(respuesta.body).toEqual({
      mensaje: 'Imagen de variante eliminada',
    });
    expect(eliminarImagenVariante).toHaveBeenCalledWith(
      '20',
      '3',
      '9',
    );
  });

  it('rechaza identificadores inválidos al eliminar una imagen de variante', async () => {
    await agregarCsrf(
      solicitudAdmin('delete', '/api/v1/admin/variants/0/images/9'),
    ).expect(400);

    expect(eliminarImagenVariante).not.toHaveBeenCalled();
  });

  it('rechaza un identificador inválido al cargar la imagen principal de una variante', async () => {
    await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/variants/0/image'),
    )
      .attach('imagen', Buffer.from('imagen'), {
        filename: 'variante.png',
        contentType: 'image/png',
      })
      .expect(400);

    expect(cargarImagenPrincipalVariante).not.toHaveBeenCalled();
  });

  it('rechaza un identificador inválido al eliminar la imagen de un producto', async () => {
    await agregarCsrf(
      solicitudAdmin('delete', '/api/v1/admin/products/0/image'),
    ).expect(400);

    expect(eliminarImagenProducto).not.toHaveBeenCalled();
  });

  it('rechaza un identificador inválido al eliminar la imagen principal de una variante', async () => {
    await agregarCsrf(
      solicitudAdmin('delete', '/api/v1/admin/variants/0/image'),
    ).expect(400);

    expect(eliminarImagenPrincipalVariante).not.toHaveBeenCalled();
  });

  it('rechaza un identificador inválido al consultar imágenes adicionales de una variante', async () => {
    await solicitudAdmin(
      'get',
      '/api/v1/admin/variants/0/images',
    ).expect(400);

    expect(listarImagenesAdicionalesVariante).not.toHaveBeenCalled();
  });
});

describe('errores de las rutas administrativas', () => {
  it('propaga el error de consulta de categorías al manejador global', async () => {
    listarCategoriasAdmin.mockRejectedValueOnce(
      new Error('Detalle interno de la base de datos'),
    );

    const respuesta = await solicitudAdmin(
      'get',
      '/api/v1/admin/categories',
    ).expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
    expect(JSON.stringify(respuesta.body)).not.toContain(
      'Detalle interno de la base de datos',
    );
  });

  it('propaga el error de consulta de productos al manejador global', async () => {
    listarProductosAdmin.mockRejectedValueOnce(
      new Error('Error interno de productos'),
    );

    const respuesta = await solicitudAdmin(
      'get',
      '/api/v1/admin/products',
    ).expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
  });

  it('propaga el error al crear una categoría', async () => {
    crearCategoria.mockRejectedValueOnce(
      new Error('Error al crear categoría'),
    );

    const respuesta = await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/categories'),
    )
      .send({ nombre: 'Tradicionales' })
      .expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
  });

  it('propaga el error al actualizar una categoría', async () => {
    actualizarCategoria.mockRejectedValueOnce(
      new Error('Error al actualizar categoría'),
    );

    const respuesta = await agregarCsrf(
      solicitudAdmin('patch', '/api/v1/admin/categories/1'),
    )
      .send({ activa: false })
      .expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
  });

  it('propaga el error al crear un producto', async () => {
    crearProducto.mockRejectedValueOnce(
      new Error('Error al crear producto'),
    );

    const respuesta = await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/products'),
    )
      .send(cuerpoProducto())
      .expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
  });

  it('propaga el error al actualizar un producto', async () => {
    actualizarProducto.mockRejectedValueOnce(
      new Error('Error al actualizar producto'),
    );

    const respuesta = await agregarCsrf(
      solicitudAdmin('patch', '/api/v1/admin/products/2'),
    )
      .send({ activo: false })
      .expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
  });

  it('propaga el error al crear una variante', async () => {
    crearVariante.mockRejectedValueOnce(
      new Error('Error al crear variante'),
    );

    const respuesta = await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/products/2/variants'),
    )
      .send(cuerpoVariante())
      .expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
  });

  it('propaga el error al actualizar una variante', async () => {
    actualizarVariante.mockRejectedValueOnce(
      new Error('Error al actualizar variante'),
    );

    const respuesta = await agregarCsrf(
      solicitudAdmin('patch', '/api/v1/admin/variants/3'),
    )
      .send({ precio: '2.50' })
      .expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
  });

  it('propaga errores al ajustar stock', async () => {
    ajustarStock.mockRejectedValueOnce(
      new Error('Error de stock'),
    );

    const respuesta = await agregarCsrf(
      solicitudAdmin('patch', '/api/v1/admin/variants/3/stock'),
    )
      .send({
        cantidad: 8,
        motivo: 'Reposición de productos',
      })
      .expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
  });

  it('propaga errores al cargar una imagen de categoría', async () => {
    cargarImagenCategoria.mockRejectedValueOnce(
      new Error('Error al cargar imagen de categoría'),
    );

    const respuesta = await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/categories/2/image'),
    )
      .attach('imagen', Buffer.from('imagen'), {
        filename: 'categoria.png',
        contentType: 'image/png',
      })
      .expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
  });

  it('propaga errores al eliminar una imagen de categoría', async () => {
    eliminarImagenCategoria.mockRejectedValueOnce(
      new Error('Error al eliminar imagen de categoría'),
    );

    const respuesta = await agregarCsrf(
      solicitudAdmin('delete', '/api/v1/admin/categories/2/image'),
    ).expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
  });

  it('propaga errores al cargar una imagen de variante', async () => {
    cargarImagenVariante.mockRejectedValueOnce(
      new Error('Error al cargar imagen de variante'),
    );

    const respuesta = await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/variants/3/images'),
    )
      .field('posicion', '1')
      .attach('imagen', Buffer.from('imagen'), {
        filename: 'variante.png',
        contentType: 'image/png',
      })
      .expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
  });

  it('propaga errores al eliminar una imagen de variante', async () => {
    eliminarImagenVariante.mockRejectedValueOnce(
      new Error('Error al eliminar imagen de variante'),
    );

    const respuesta = await agregarCsrf(
      solicitudAdmin('delete', '/api/v1/admin/variants/3/images/9'),
    ).expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
  });

  it('propaga errores al eliminar la imagen de un producto', async () => {
    eliminarImagenProducto.mockRejectedValueOnce(
      new Error('Error al eliminar imagen de producto'),
    );

    const respuesta = await agregarCsrf(
      solicitudAdmin('delete', '/api/v1/admin/products/2/image'),
    ).expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
  });

  it('propaga errores al cargar la imagen principal de una variante', async () => {
    cargarImagenPrincipalVariante.mockRejectedValueOnce(
      new Error('Error al cargar imagen principal de variante'),
    );

    const respuesta = await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/variants/3/image'),
    )
      .attach('imagen', Buffer.from('imagen'), {
        filename: 'variante.png',
        contentType: 'image/png',
      })
      .expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
  });

  it('propaga errores al eliminar la imagen principal de una variante', async () => {
    eliminarImagenPrincipalVariante.mockRejectedValueOnce(
      new Error('Error al eliminar imagen principal de variante'),
    );

    const respuesta = await agregarCsrf(
      solicitudAdmin('delete', '/api/v1/admin/variants/3/image'),
    ).expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
  });

  it('propaga errores al consultar imágenes adicionales de una variante', async () => {
    listarImagenesAdicionalesVariante.mockRejectedValueOnce(
      new Error('Error al consultar imágenes adicionales'),
    );

    const respuesta = await solicitudAdmin(
      'get',
      '/api/v1/admin/variants/3/images',
    ).expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
  });


  it('carga una imagen de producto', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/products/2/image'),
    )
      .attach('imagen', Buffer.from('imagen'), {
        filename: 'producto.png',
        contentType: 'image/png',
      })
      .expect(200);

    expect(respuesta.body.imagen).toEqual({
      imagenUrl: '/uploads/producto.png',
    });
    expect(cargarImagenProducto).toHaveBeenCalledWith(
      '20',
      '2',
      expect.objectContaining({ originalname: 'producto.png' }),
    );
  });

  it('rechaza un identificador inválido al cargar una imagen de producto', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/products/0/image'),
    )
      .attach('imagen', Buffer.from('imagen'), {
        filename: 'producto.png',
        contentType: 'image/png',
      })
      .expect(400);

    expect(respuesta.body).toEqual({
      error: 'Identificador de producto inválido',
    });
    expect(cargarImagenProducto).not.toHaveBeenCalled();
  });
  it('elimina una imagen de producto', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('delete', '/api/v1/admin/products/2/image'),
    ).expect(200);

    expect(respuesta.body).toEqual({
      mensaje: 'Imagen de producto eliminada',
    });
    expect(eliminarImagenProducto).toHaveBeenCalledWith('20', '2');
  });

  it('carga la imagen principal de una variante', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/variants/3/image'),
    )
      .attach('imagen', Buffer.from('imagen'), {
        filename: 'variante.png',
        contentType: 'image/png',
      })
      .expect(200);

    expect(respuesta.body.imagen).toEqual({
      imagenUrl: '/uploads/variante-principal.png',
    });
    expect(cargarImagenPrincipalVariante).toHaveBeenCalledWith(
      '20',
      '3',
      expect.objectContaining({ originalname: 'variante.png' }),
    );
  });

  it('elimina la imagen principal de una variante', async () => {
    const respuesta = await agregarCsrf(
      solicitudAdmin('delete', '/api/v1/admin/variants/3/image'),
    ).expect(200);

    expect(respuesta.body).toEqual({
      mensaje: 'Imagen principal de variante eliminada',
    });
    expect(eliminarImagenPrincipalVariante).toHaveBeenCalledWith('20', '3');
  });

  it('consulta las imágenes adicionales de una variante', async () => {
    listarImagenesAdicionalesVariante.mockResolvedValueOnce([
      { id: '9', imagenUrl: '/uploads/variante-extra.png', posicion: 1 },
    ]);

    const respuesta = await solicitudAdmin(
      'get',
      '/api/v1/admin/variants/3/images',
    ).expect(200);

    expect(respuesta.body.imagenes).toEqual([
      { id: '9', imagenUrl: '/uploads/variante-extra.png', posicion: 1 },
    ]);
    expect(listarImagenesAdicionalesVariante).toHaveBeenCalledWith('3');
  });

  it('propaga errores al cargar una imagen de producto', async () => {
    cargarImagenProducto.mockRejectedValueOnce(
      new Error('Error al cargar imagen de producto'),
    );

    const respuesta = await agregarCsrf(
      solicitudAdmin('post', '/api/v1/admin/products/2/image'),
    )
      .attach('imagen', Buffer.from('imagen'), {
        filename: 'producto.png',
        contentType: 'image/png',
      })
      .expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });
  });
});
