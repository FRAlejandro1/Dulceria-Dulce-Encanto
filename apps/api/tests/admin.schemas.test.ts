import { describe, expect, it } from 'vitest';

import {
  actualizarCategoriaSchema,
  actualizarProductoSchema,
  actualizarVarianteSchema,
  crearCategoriaSchema,
  crearProductoSchema,
  crearVarianteSchema,
  idAdminParamsSchema,
} from '../src/modules/admin/admin.schemas.js';

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

describe('idAdminParamsSchema', () => {
  it.each(['1', '20', '99999999999999999999'])(
    'acepta el identificador %s',
    (id) => {
      expect(idAdminParamsSchema.safeParse({ id }).success).toBe(true);
    },
  );

  it.each(['0', '01', '-1', '1.5', 'abc', '', ' 1', '1 '])(
    'rechaza el identificador %s',
    (id) => {
      expect(idAdminParamsSchema.safeParse({ id }).success).toBe(false);
    },
  );

  it('rechaza propiedades adicionales', () => {
    expect(
      idAdminParamsSchema.safeParse({ id: '1', extra: true }).success,
    ).toBe(false);
  });
});

describe('crearCategoriaSchema', () => {
  it('acepta una categoría con nombre y slug', () => {
    expect(
      crearCategoriaSchema.safeParse({
        nombre: 'Tradicionales',
        slug: 'tradicionales',
      }).success,
    ).toBe(true);
  });

  it('permite omitir el slug para generarlo desde el nombre', () => {
    expect(
      crearCategoriaSchema.safeParse({ nombre: 'Tradicionales' }).success,
    ).toBe(true);
  });

  it('recorta espacios en nombre y slug', () => {
    const resultado = crearCategoriaSchema.parse({
      nombre: '  Tradicionales  ',
      slug: '  tradicionales  ',
    });

    expect(resultado).toEqual({
      nombre: 'Tradicionales',
      slug: 'tradicionales',
    });
  });

  it.each([
    { nombre: '' },
    { nombre: '   ' },
    { nombre: 'x'.repeat(101) },
    { nombre: 'Tradicionales', slug: '' },
    { nombre: 'Tradicionales', slug: 'Con-Mayúsculas' },
    { nombre: 'Tradicionales', slug: '-inicio' },
    { nombre: 'Tradicionales', slug: 'final-' },
    { nombre: 'Tradicionales', slug: 'dos--guiones' },
    { nombre: 'Tradicionales', slug: 'slug con espacios' },
    { nombre: 'Tradicionales', propiedad: true },
  ])('rechaza datos de categoría no válidos: %o', (datos) => {
    expect(crearCategoriaSchema.safeParse(datos).success).toBe(false);
  });

  it('acepta los límites máximos de nombre y slug', () => {
    expect(
      crearCategoriaSchema.safeParse({
        nombre: 'N'.repeat(100),
        slug: `a${'b'.repeat(119)}`,
      }).success,
    ).toBe(true);
  });

  it('rechaza un slug que supera 120 caracteres', () => {
    expect(
      crearCategoriaSchema.safeParse({
        nombre: 'Tradicionales',
        slug: 'a'.repeat(121),
      }).success,
    ).toBe(false);
  });
});

describe('actualizarCategoriaSchema', () => {
  it.each([
    { nombre: 'Tradicionales' },
    { slug: 'tradicionales' },
    { activa: true },
    { activa: false },
    { nombre: 'Tradicionales', slug: 'tradicionales', activa: false },
  ])('acepta cambios válidos: %o', (datos) => {
    expect(actualizarCategoriaSchema.safeParse(datos).success).toBe(true);
  });

  it.each([
    {},
    { nombre: '' },
    { slug: '' },
    { activa: 'sí' },
    { desconocido: true },
  ])('rechaza cambios no válidos: %o', (datos) => {
    expect(actualizarCategoriaSchema.safeParse(datos).success).toBe(false);
  });
});

describe('crearVarianteSchema', () => {
  it('acepta una variante sin imagen ni estado explícito', () => {
    expect(crearVarianteSchema.safeParse(varianteValida).success).toBe(true);
  });

  it.each(['http://ejemplo.com/imagen.png', 'https://ejemplo.com/imagen.png'])(
    'acepta imágenes con protocolo permitido: %s',
    (imagenUrl) => {
      expect(
        crearVarianteSchema.safeParse({
          ...varianteValida,
          imagenUrl,
        }).success,
      ).toBe(true);
    },
  );

  it('acepta una imagen nula', () => {
    expect(
      crearVarianteSchema.safeParse({
        ...varianteValida,
        imagenUrl: null,
      }).success,
    ).toBe(true);
  });

  it.each([
    'ftp://ejemplo.com/imagen.png',
    'javascript:alert(1)',
    'no-es-una-url',
    '',
  ])('rechaza una URL de imagen no permitida: %s', (imagenUrl) => {
    expect(
      crearVarianteSchema.safeParse({
        ...varianteValida,
        imagenUrl,
      }).success,
    ).toBe(false);
  });

  it.each(['0', '1', '12.5', '99999999.99'])(
    'acepta el precio %s',
    (precio) => {
      expect(
        crearVarianteSchema.safeParse({
          ...varianteValida,
          precio,
        }).success,
      ).toBe(true);
    },
  );

  it.each([
    '',
    '-1',
    '-0.50',
    '01',
    '1.234',
    '100000000',
    '1,50',
    ' 2.50',
  ])('rechaza el precio %s', (precio) => {
    expect(
      crearVarianteSchema.safeParse({
        ...varianteValida,
        precio,
      }).success,
    ).toBe(false);
  });

  it.each([
    { nombre: '' },
    { nombre: 'x'.repeat(101) },
    { sku: '' },
    { sku: 'x'.repeat(65) },
    { activa: 'sí' },
    { campoDesconocido: true },
  ])('rechaza datos de variante no válidos: %o', (cambios) => {
    expect(
      crearVarianteSchema.safeParse({
        ...varianteValida,
        ...cambios,
      }).success,
    ).toBe(false);
  });

  it('acepta los límites máximos del nombre y SKU', () => {
    expect(
      crearVarianteSchema.safeParse({
        nombre: 'V'.repeat(100),
        sku: 'S'.repeat(64),
        precio: '1.00',
      }).success,
    ).toBe(true);
  });
});

describe('actualizarVarianteSchema', () => {
  it.each([
    { nombre: 'Caja grande' },
    { sku: 'CAJA-GRANDE' },
    { precio: '10.00' },
    { imagenUrl: null },
    { imagenUrl: 'https://ejemplo.com/imagen.png' },
    { activa: true },
    { activa: false },
  ])('acepta cambios válidos: %o', (datos) => {
    expect(actualizarVarianteSchema.safeParse(datos).success).toBe(true);
  });

  it.each([
    {},
    { nombre: '' },
    { sku: '' },
    { precio: '-1' },
    { imagenUrl: 'ftp://ejemplo.com/imagen.png' },
    { activa: 'sí' },
    { propiedad: true },
  ])('rechaza cambios no válidos: %o', (datos) => {
    expect(actualizarVarianteSchema.safeParse(datos).success).toBe(false);
  });
});

describe('crearProductoSchema', () => {
  it('acepta un producto con una variante', () => {
    expect(crearProductoSchema.safeParse(productoValido).success).toBe(true);
  });

  it('acepta valores nulos de descripción e imagen', () => {
    expect(
      crearProductoSchema.safeParse({
        ...productoValido,
        descripcion: null,
        imagenUrl: null,
      }).success,
    ).toBe(true);
  });

  it('acepta imagen HTTPS y campos opcionales', () => {
    expect(
      crearProductoSchema.safeParse({
        ...productoValido,
        descripcion: 'Caja surtida',
        imagenUrl: 'https://ejemplo.com/producto.png',
        activo: false,
      }).success,
    ).toBe(true);
  });

  it('rechaza productos sin variantes', () => {
    expect(
      crearProductoSchema.safeParse({
        nombre: 'Caja de alfajores',
        categoriaId: '1',
        variantes: [],
      }).success,
    ).toBe(false);
  });

  it('rechaza más de 100 variantes', () => {
    expect(
      crearProductoSchema.safeParse({
        ...productoValido,
        variantes: Array.from({ length: 101 }, (_, indice) => ({
          ...varianteValida,
          sku: `SKU-${indice}`,
        })),
      }).success,
    ).toBe(false);
  });

  it.each([
    { nombre: '' },
    { nombre: 'x'.repeat(151) },
    { categoriaId: '0' },
    { categoriaId: 'abc' },
    { descripcion: 'x'.repeat(65536) },
    { imagenUrl: 'javascript:alert(1)' },
    { activo: 'sí' },
    { campoDesconocido: true },
  ])('rechaza datos de producto no válidos: %o', (cambios) => {
    expect(
      crearProductoSchema.safeParse({
        ...productoValido,
        ...cambios,
      }).success,
    ).toBe(false);
  });

  it('acepta los límites máximos del nombre y descripción', () => {
    expect(
      crearProductoSchema.safeParse({
        ...productoValido,
        nombre: 'P'.repeat(150),
        descripcion: 'D'.repeat(65535),
      }).success,
    ).toBe(true);
  });
});

describe('actualizarProductoSchema', () => {
  it.each([
    { nombre: 'Caja nueva' },
    { descripcion: null },
    { descripcion: 'Nueva descripción' },
    { imagenUrl: null },
    { imagenUrl: 'https://ejemplo.com/producto.png' },
    { categoriaId: '2' },
    { activo: true },
    { activo: false },
  ])('acepta cambios válidos: %o', (datos) => {
    expect(actualizarProductoSchema.safeParse(datos).success).toBe(true);
  });

  it.each([
    {},
    { nombre: '' },
    { nombre: 'x'.repeat(151) },
    { categoriaId: '0' },
    { descripcion: 'x'.repeat(65536) },
    { imagenUrl: 'ftp://ejemplo.com/producto.png' },
    { activo: 'sí' },
    { propiedad: true },
  ])('rechaza cambios no válidos: %o', (datos) => {
    expect(actualizarProductoSchema.safeParse(datos).success).toBe(false);
  });
});
