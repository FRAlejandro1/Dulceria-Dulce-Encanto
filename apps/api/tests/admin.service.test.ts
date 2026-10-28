import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  ejecutarTransaccion: vi.fn(),
  registrarAuditoria: vi.fn(),
  actualizarCategoriaRepo: vi.fn(),
  actualizarProductoRepo: vi.fn(),
  actualizarStockFisico: vi.fn(),
  obtenerInventarioParaAjuste: vi.fn(),
  registrarMovimientoAjuste: vi.fn(),
  actualizarVarianteRepo: vi.fn(),
  crearCategoriaRepo: vi.fn(),
  crearProductoRepo: vi.fn(),
  crearVarianteRepo: vi.fn(),
  existeCategoria: vi.fn(),
  existeProducto: vi.fn(),
  existeVariante: vi.fn(),
  listarCategoriasAdmin: vi.fn(),
  listarProductosAdmin: vi.fn(),
}));

vi.mock('../src/shared/database/transaction.js', () => ({
  ejecutarTransaccion: mocks.ejecutarTransaccion,
}));

vi.mock('../src/modules/audit/audit.repository.js', () => ({
  registrarAuditoria: mocks.registrarAuditoria,
}));

vi.mock('../src/modules/admin/admin.repository.js', () => ({
  actualizarCategoria: mocks.actualizarCategoriaRepo,
  actualizarProducto: mocks.actualizarProductoRepo,
  actualizarStockFisico: mocks.actualizarStockFisico,
  actualizarVariante: mocks.actualizarVarianteRepo,
  crearCategoria: mocks.crearCategoriaRepo,
  crearProducto: mocks.crearProductoRepo,
  crearVariante: mocks.crearVarianteRepo,
  existeCategoria: mocks.existeCategoria,
  existeProducto: mocks.existeProducto,
  existeVariante: mocks.existeVariante,
  listarCategoriasAdmin: mocks.listarCategoriasAdmin,
  listarProductosAdmin: mocks.listarProductosAdmin,
  obtenerInventarioParaAjuste: mocks.obtenerInventarioParaAjuste,
  registrarMovimientoAjuste: mocks.registrarMovimientoAjuste,
}));

import {
  actualizarCategoria,
  actualizarProducto,
  actualizarVariante,
  ajustarStock,
  crearCategoria,
  crearProducto,
  crearVariante,
  listarCategoriasAdmin,
  listarProductosAdmin,
} from '../src/modules/admin/admin.service.js';

const conexion = {} as Parameters<
  Parameters<typeof mocks.ejecutarTransaccion>[0]
>[0];

const errorDuplicado = () =>
  Object.assign(new Error('Duplicate entry'), {
    code: 'ER_DUP_ENTRY',
  });

const categoriaValida = {
  nombre: 'Categoría tradicional',
};

const varianteValida = {
  nombre: 'Caja pequeña',
  sku: 'CAJA-PEQ',
  precio: '2.50',
};

const productoValido = {
  nombre: 'Caja de alfajores',
  categoriaId: '1',
  variantes: [varianteValida],
};

beforeEach(() => {
  vi.resetAllMocks();

  mocks.ejecutarTransaccion.mockImplementation(
    async (
      operacion: (conexionMock: typeof conexion) => Promise<unknown>,
    ) => operacion(conexion),
  );

  mocks.registrarAuditoria.mockResolvedValue(undefined);

  mocks.crearCategoriaRepo.mockResolvedValue('10');
  mocks.crearProductoRepo.mockResolvedValue('20');
  mocks.crearVarianteRepo.mockResolvedValue('30');

  mocks.actualizarCategoriaRepo.mockResolvedValue(undefined);
  mocks.actualizarProductoRepo.mockResolvedValue(undefined);
  mocks.actualizarVarianteRepo.mockResolvedValue(undefined);
  mocks.actualizarStockFisico.mockResolvedValue(undefined);
  mocks.obtenerInventarioParaAjuste.mockResolvedValue({
    stockFisico: 5,
    stockReservado: 2,
  });
  mocks.registrarMovimientoAjuste.mockResolvedValue(undefined);

  mocks.existeCategoria.mockResolvedValue(true);
  mocks.existeProducto.mockResolvedValue(true);
  mocks.existeVariante.mockResolvedValue(true);

  mocks.listarCategoriasAdmin.mockResolvedValue([]);
  mocks.listarProductosAdmin.mockResolvedValue([]);
});

describe('listarCategoriasAdmin y listarProductosAdmin', () => {
  it('delega el listado de categorías al repositorio', async () => {
    const resultado = [{ id: '1', nombre: 'Tradicionales' }];
    mocks.listarCategoriasAdmin.mockResolvedValue(resultado);

    await expect(listarCategoriasAdmin()).resolves.toEqual(resultado);
    expect(mocks.listarCategoriasAdmin).toHaveBeenCalledOnce();
  });

  it('delega el listado de productos al repositorio', async () => {
    const resultado = [{ id: '2', nombre: 'Alfajores' }];
    mocks.listarProductosAdmin.mockResolvedValue(resultado);

    await expect(listarProductosAdmin()).resolves.toEqual(resultado);
    expect(mocks.listarProductosAdmin).toHaveBeenCalledOnce();
  });
});

describe('crearCategoria', () => {
  it('crea una categoría normalizando el slug desde el nombre', async () => {
    await expect(
      crearCategoria('5', { nombre: '  Categoría Tradicional  ' }),
    ).resolves.toEqual({ id: '10' });

    expect(mocks.crearCategoriaRepo).toHaveBeenCalledWith(conexion, {
      nombre: '  Categoría Tradicional  ',
      slug: 'categoria-tradicional',
    });

    expect(mocks.registrarAuditoria).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        actorUserId: '5',
        action: 'ADMIN_CATEGORY_CREATED',
        entityType: 'category',
        entityId: '10',
        details: { slug: 'categoria-tradicional' },
      }),
    );
  });

  it('normaliza un slug proporcionado', async () => {
    await crearCategoria('5', {
      nombre: 'Bebidas',
      slug: '  BEBIDAS FRIAS  ',
    });

    expect(mocks.crearCategoriaRepo).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({ slug: 'bebidas-frias' }),
    );
  });

  it('elimina tildes, signos y guiones sobrantes al normalizar', async () => {
    await expect(
      crearCategoria('5', {
        nombre: 'Productos',
        slug: '---',
      }),
    ).rejects.toMatchObject({ status: 400 });

    expect(mocks.crearCategoriaRepo).not.toHaveBeenCalled();

    await crearCategoria('5', {
      nombre: 'Productos',
      slug: '---Productos---',
    });

    expect(mocks.crearCategoriaRepo).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({ slug: 'productos' }),
    );
  });

  it('rechaza un slug que queda vacío después de normalizar', async () => {
    await expect(
      crearCategoria('5', { nombre: '!!!', slug: '---' }),
    ).rejects.toMatchObject({
      status: 400,
    });

    expect(mocks.crearCategoriaRepo).not.toHaveBeenCalled();
    expect(mocks.registrarAuditoria).not.toHaveBeenCalled();
  });

  it('limita el slug normalizado a 120 caracteres', async () => {
    await crearCategoria('5', {
      nombre: 'Categoría',
      slug: `${'a'.repeat(119)}!!!`,
    });

    expect(mocks.crearCategoriaRepo).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({ slug: 'a'.repeat(119) }),
    );
  });

  it('convierte conflictos de unicidad en error 409', async () => {
    mocks.crearCategoriaRepo.mockRejectedValue(errorDuplicado());

    await expect(
      crearCategoria('5', categoriaValida),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('propaga errores que no son conflictos de unicidad', async () => {
    const error = new Error('Fallo de base de datos');
    mocks.crearCategoriaRepo.mockRejectedValue(error);

    await expect(
      crearCategoria('5', categoriaValida),
    ).rejects.toBe(error);
  });

  it('registra y propaga errores de auditoría', async () => {
    const error = new Error('Fallo de auditoría');
    mocks.registrarAuditoria.mockRejectedValue(error);

    await expect(
      crearCategoria('5', categoriaValida),
    ).rejects.toBe(error);
  });
});

describe('actualizarCategoria', () => {
  it('actualiza los campos y registra la auditoría', async () => {
    const cambios = {
      nombre: 'Nueva categoría',
      slug: 'NUEVA Categoria',
      activa: false,
    };

    await expect(
      actualizarCategoria('5', '10', cambios),
    ).resolves.toBeUndefined();

    expect(mocks.actualizarCategoriaRepo).toHaveBeenCalledWith(
      conexion,
      '10',
      {
        nombre: 'Nueva categoría',
        slug: 'nueva-categoria',
        activa: false,
      },
    );

    expect(mocks.registrarAuditoria).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        action: 'ADMIN_CATEGORY_UPDATED',
        entityId: '10',
        details: { campos: ['nombre', 'slug', 'activa'] },
      }),
    );
  });

  it('permite actualizar sin modificar el slug', async () => {
    await actualizarCategoria('5', '10', { activa: true });

    expect(mocks.actualizarCategoriaRepo).toHaveBeenCalledWith(
      conexion,
      '10',
      { activa: true },
    );
  });

  it('responde 404 cuando la categoría no existe', async () => {
    mocks.existeCategoria.mockResolvedValue(false);

    await expect(
      actualizarCategoria('5', '999', { activa: false }),
    ).rejects.toMatchObject({ status: 404 });

    expect(mocks.actualizarCategoriaRepo).not.toHaveBeenCalled();
    expect(mocks.registrarAuditoria).not.toHaveBeenCalled();
  });

  it('rechaza un slug que no puede normalizarse', async () => {
    await expect(
      actualizarCategoria('5', '10', { slug: '---' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('convierte conflictos de unicidad en error 409', async () => {
    mocks.actualizarCategoriaRepo.mockRejectedValue(errorDuplicado());

    await expect(
      actualizarCategoria('5', '10', { nombre: 'Repetida' }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('crearProducto', () => {
  it('crea el producto y sus variantes con valores predeterminados', async () => {
    await expect(
      crearProducto('5', productoValido),
    ).resolves.toEqual({ id: '20' });

    expect(mocks.crearProductoRepo).toHaveBeenCalledWith(conexion, {
      nombre: 'Caja de alfajores',
      descripcion: null,
      imagenUrl: null,
      categoriaId: '1',
      activo: true,
    });

    expect(mocks.crearVarianteRepo).toHaveBeenCalledWith(conexion, '20', {
      nombre: 'Caja pequeña',
      sku: 'CAJA-PEQ',
      precio: '2.50',
      imagenUrl: null,
      activa: true,
    });

    expect(mocks.registrarAuditoria).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        action: 'ADMIN_PRODUCT_CREATED',
        entityId: '20',
        details: { cantidadVariantes: 1 },
      }),
    );
  });

  it('preserva los campos opcionales y crea varias variantes', async () => {
    await crearProducto('5', {
      nombre: 'Caja surtida',
      descripcion: 'Surtido especial',
      imagenUrl: 'https://ejemplo.com/caja.png',
      categoriaId: '1',
      activo: false,
      variantes: [
        {
          ...varianteValida,
          imagenUrl: 'https://ejemplo.com/pequena.png',
          activa: false,
        },
        { ...varianteValida, nombre: 'Caja grande', sku: 'CAJA-GRA' },
      ],
    });

    expect(mocks.crearProductoRepo).toHaveBeenCalledWith(conexion, {
      nombre: 'Caja surtida',
      descripcion: 'Surtido especial',
      imagenUrl: 'https://ejemplo.com/caja.png',
      categoriaId: '1',
      activo: false,
    });

    expect(mocks.crearVarianteRepo).toHaveBeenCalledTimes(2);
    expect(mocks.crearVarianteRepo).toHaveBeenNthCalledWith(
      1,
      conexion,
      '20',
      expect.objectContaining({
        imagenUrl: 'https://ejemplo.com/pequena.png',
        activa: false,
      }),
    );
    expect(mocks.crearVarianteRepo).toHaveBeenNthCalledWith(
      2,
      conexion,
      '20',
      expect.objectContaining({ nombre: 'Caja grande' }),
    );
  });

  it('responde 404 cuando la categoría no existe', async () => {
    mocks.existeCategoria.mockResolvedValue(false);

    await expect(
      crearProducto('5', productoValido),
    ).rejects.toMatchObject({ status: 404 });

    expect(mocks.crearProductoRepo).not.toHaveBeenCalled();
  });

  it('convierte conflictos de unicidad en error 409', async () => {
    mocks.crearProductoRepo.mockRejectedValue(errorDuplicado());

    await expect(
      crearProducto('5', productoValido),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('propaga errores al crear una variante del producto', async () => {
    const error = new Error('No se pudo crear la variante');
    mocks.crearVarianteRepo.mockRejectedValue(error);

    await expect(
      crearProducto('5', productoValido),
    ).rejects.toBe(error);
  });
});

describe('actualizarProducto', () => {
  it('actualiza un producto y registra los campos modificados', async () => {
    const cambios = { nombre: 'Caja nueva', activo: false };

    await expect(
      actualizarProducto('5', '20', cambios),
    ).resolves.toBeUndefined();

    expect(mocks.actualizarProductoRepo).toHaveBeenCalledWith(
      conexion,
      '20',
      cambios,
    );

    expect(mocks.registrarAuditoria).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        action: 'ADMIN_PRODUCT_UPDATED',
        entityId: '20',
        details: { campos: ['nombre', 'activo'] },
      }),
    );
  });

  it('valida la categoría cuando se cambia la relación', async () => {
    mocks.existeCategoria.mockResolvedValue(false);

    await expect(
      actualizarProducto('5', '20', { categoriaId: '999' }),
    ).rejects.toMatchObject({ status: 404 });

    expect(mocks.actualizarProductoRepo).not.toHaveBeenCalled();
  });

  it('responde 404 cuando el producto no existe', async () => {
    mocks.existeProducto.mockResolvedValue(false);

    await expect(
      actualizarProducto('5', '999', { nombre: 'Caja' }),
    ).rejects.toMatchObject({ status: 404 });

    expect(mocks.existeCategoria).not.toHaveBeenCalled();
  });

  it('convierte conflictos de unicidad en error 409', async () => {
    mocks.actualizarProductoRepo.mockRejectedValue(errorDuplicado());

    await expect(
      actualizarProducto('5', '20', { nombre: 'Repetido' }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('crearVariante', () => {
  it('crea una variante y registra la auditoría', async () => {
    await expect(
      crearVariante('5', '20', varianteValida),
    ).resolves.toEqual({ id: '30' });

    expect(mocks.crearVarianteRepo).toHaveBeenCalledWith(
      conexion,
      '20',
      {
        nombre: 'Caja pequeña',
        sku: 'CAJA-PEQ',
        precio: '2.50',
        imagenUrl: null,
        activa: true,
      },
    );

    expect(mocks.registrarAuditoria).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        action: 'ADMIN_VARIANT_CREATED',
        entityType: 'product_variant',
        entityId: '30',
        details: { productoId: '20' },
      }),
    );
  });

  it('responde 404 si el producto no existe', async () => {
    mocks.existeProducto.mockResolvedValue(false);

    await expect(
      crearVariante('5', '999', varianteValida),
    ).rejects.toMatchObject({ status: 404 });

    expect(mocks.crearVarianteRepo).not.toHaveBeenCalled();
  });

  it('preserva imagen y estado explícitos', async () => {
    await crearVariante('5', '20', {
      ...varianteValida,
      imagenUrl: 'https://ejemplo.com/variante.png',
      activa: false,
    });

    expect(mocks.crearVarianteRepo).toHaveBeenCalledWith(
      conexion,
      '20',
      expect.objectContaining({
        imagenUrl: 'https://ejemplo.com/variante.png',
        activa: false,
      }),
    );
  });

  it('convierte conflictos de unicidad en error 409', async () => {
    mocks.crearVarianteRepo.mockRejectedValue(errorDuplicado());

    await expect(
      crearVariante('5', '20', varianteValida),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('actualizarVariante', () => {
  it('actualiza los campos y registra la auditoría', async () => {
    const cambios = { nombre: 'Caja mediana', activa: false };

    await expect(
      actualizarVariante('5', '30', cambios),
    ).resolves.toBeUndefined();

    expect(mocks.actualizarVarianteRepo).toHaveBeenCalledWith(
      conexion,
      '30',
      cambios,
    );

    expect(mocks.registrarAuditoria).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        action: 'ADMIN_VARIANT_UPDATED',
        entityId: '30',
        details: { campos: ['nombre', 'activa'] },
      }),
    );
  });

  it('responde 404 si la variante no existe', async () => {
    mocks.existeVariante.mockResolvedValue(false);

    await expect(
      actualizarVariante('5', '999', { activa: false }),
    ).rejects.toMatchObject({ status: 404 });

    expect(mocks.actualizarVarianteRepo).not.toHaveBeenCalled();
  });

  it('convierte conflictos de unicidad en error 409', async () => {
    mocks.actualizarVarianteRepo.mockRejectedValue(errorDuplicado());

    await expect(
      actualizarVariante('5', '30', { sku: 'REPETIDO' }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('ajustarStock', () => {
  const datos = {
    cantidad: 8,
    motivo: 'Reposición de productos',
  };

  it('ajusta el stock y registra el movimiento y la auditoría', async () => {
    await expect(
      ajustarStock('20', '30', datos),
    ).resolves.toEqual({
      varianteId: '30',
      stockFisicoAnterior: 5,
      stockFisico: 8,
      stockReservado: 2,
      stockDisponible: 6,
      diferencia: 3,
    });

    expect(mocks.actualizarStockFisico).toHaveBeenCalledWith(
      conexion,
      '30',
      8,
    );

    expect(mocks.registrarMovimientoAjuste).toHaveBeenCalledWith(
      conexion,
      {
        varianteId: '30',
        cantidad: 3,
        stockFisicoAnterior: 5,
        stockFisicoNuevo: 8,
        stockReservado: 2,
        motivo: datos.motivo,
        actorId: '20',
      },
    );

    expect(mocks.registrarAuditoria).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        actorUserId: '20',
        action: 'ADMIN_STOCK_ADJUSTED',
        entityType: 'product_variant',
        entityId: '30',
        details: {
          stockFisicoAnterior: 5,
          stockFisicoNuevo: 8,
          stockReservado: 2,
          diferencia: 3,
          motivo: datos.motivo,
        },
      }),
    );
  });

  it('responde 404 cuando la variante no existe', async () => {
    mocks.obtenerInventarioParaAjuste.mockResolvedValue(null);
    mocks.existeVariante.mockResolvedValue(false);

    await expect(
      ajustarStock('20', '30', datos),
    ).rejects.toMatchObject({
      status: 404,
      message: 'La variante no existe.',
    });
  });

  it('responde 409 cuando la variante no tiene inventario', async () => {
    mocks.obtenerInventarioParaAjuste.mockResolvedValue(null);
    mocks.existeVariante.mockResolvedValue(true);

    await expect(
      ajustarStock('20', '30', datos),
    ).rejects.toMatchObject({
      status: 409,
      message: 'La variante no tiene un registro de inventario.',
    });
  });

  it('rechaza un ajuste que no cambia el stock', async () => {
    await expect(
      ajustarStock('20', '30', { ...datos, cantidad: 5 }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'La cantidad nueva debe ser diferente al stock actual.',
    });

    expect(mocks.actualizarStockFisico).not.toHaveBeenCalled();
    expect(mocks.registrarMovimientoAjuste).not.toHaveBeenCalled();
  });

  it('rechaza un stock inferior al reservado', async () => {
    await expect(
      ajustarStock('20', '30', { ...datos, cantidad: 1 }),
    ).rejects.toMatchObject({
      status: 409,
    });

    expect(mocks.actualizarStockFisico).not.toHaveBeenCalled();
    expect(mocks.registrarMovimientoAjuste).not.toHaveBeenCalled();
  });

  it('registra la diferencia absoluta al reducir el stock', async () => {
    await expect(
      ajustarStock('20', '30', { ...datos, cantidad: 3 }),
    ).resolves.toMatchObject({
      stockFisicoAnterior: 5,
      stockFisico: 3,
      stockReservado: 2,
      stockDisponible: 1,
      diferencia: -2,
    });

    expect(mocks.registrarMovimientoAjuste).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        cantidad: 2,
        stockFisicoAnterior: 5,
        stockFisicoNuevo: 3,
      }),
    );
  });
});

describe('manejo de errores y transacciones', () => {
  it('propaga errores con un código distinto de duplicado', async () => {
    const error = Object.assign(new Error('Otro error'), {
      code: 'ER_BAD_FIELD_ERROR',
    });
    mocks.crearCategoriaRepo.mockRejectedValue(error);

    await expect(
      crearCategoria('5', categoriaValida),
    ).rejects.toBe(error);
  });

  it('propaga valores de error que no son objetos', async () => {
    mocks.crearCategoriaRepo.mockRejectedValue('error inesperado');

    await expect(
      crearCategoria('5', categoriaValida),
    ).rejects.toBe('error inesperado');
  });

  it('propaga un objeto sin código de error', async () => {
    const error = { message: 'Error sin código' };
    mocks.crearCategoriaRepo.mockRejectedValue(error);

    await expect(
      crearCategoria('5', categoriaValida),
    ).rejects.toBe(error);
  });

  it('no audita una categoría si falla su creación', async () => {
    mocks.crearCategoriaRepo.mockRejectedValue(
      new Error('Error de persistencia'),
    );

    await expect(
      crearCategoria('5', categoriaValida),
    ).rejects.toThrow('Error de persistencia');

    expect(mocks.registrarAuditoria).not.toHaveBeenCalled();
  });
});
