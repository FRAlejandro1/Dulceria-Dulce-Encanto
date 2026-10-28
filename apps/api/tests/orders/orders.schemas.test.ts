import { describe, expect, it } from 'vitest';

import { crearPedidoSchema } from '../../src/modules/orders/orders.schemas.js';

const pedidoValido = {
  metodoPago: 'CASH',
  items: [{ varianteId: '5', cantidad: 2 }],
};

describe('crearPedidoSchema', () => {
  it.each(['CASH', 'TRANSFER'])('acepta el método de pago %s', (metodoPago) => {
    expect(crearPedidoSchema.safeParse({
      ...pedidoValido,
      metodoPago,
    }).success).toBe(true);
  });

  it('acepta notas opcionales y las recorta', () => {
    const resultado = crearPedidoSchema.safeParse({
      ...pedidoValido,
      notas: '  Entregar por la tarde  ',
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.notas).toBe('Entregar por la tarde');
    }
  });

  it('acepta un pedido con 100 artículos', () => {
    const items = Array.from({ length: 100 }, (_, indice) => ({
      varianteId: String(indice + 1),
      cantidad: 1,
    }));

    expect(crearPedidoSchema.safeParse({ ...pedidoValido, items }).success).toBe(true);
  });

  it('rechaza un método de pago no permitido', () => {
    expect(crearPedidoSchema.safeParse({
      ...pedidoValido,
      metodoPago: 'CREDIT',
    }).success).toBe(false);
  });

  it.each(['', 'abc', '-5', '1.5'])(
    'rechaza el identificador de variante %s',
    (varianteId) => {
      expect(crearPedidoSchema.safeParse({
        ...pedidoValido,
        items: [{ varianteId, cantidad: 1 }],
      }).success).toBe(false);
    },
  );

  it.each([0, -1, 1.5, 1001])('rechaza la cantidad %s', (cantidad) => {
    expect(crearPedidoSchema.safeParse({
      ...pedidoValido,
      items: [{ varianteId: '5', cantidad }],
    }).success).toBe(false);
  });

  it('rechaza una lista vacía de artículos', () => {
    expect(crearPedidoSchema.safeParse({
      ...pedidoValido,
      items: [],
    }).success).toBe(false);
  });

  it('rechaza más de 100 artículos', () => {
    const items = Array.from({ length: 101 }, (_, indice) => ({
      varianteId: String(indice + 1),
      cantidad: 1,
    }));

    expect(crearPedidoSchema.safeParse({ ...pedidoValido, items }).success).toBe(false);
  });

  it('rechaza variantes repetidas', () => {
    const resultado = crearPedidoSchema.safeParse({
      ...pedidoValido,
      items: [
        { varianteId: '5', cantidad: 1 },
        { varianteId: '5', cantidad: 2 },
      ],
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.some(
        (issue) => issue.message === 'No se puede repetir una variante en el pedido.',
      )).toBe(true);
    }
  });

  it('rechaza notas de más de 1000 caracteres', () => {
    expect(crearPedidoSchema.safeParse({
      ...pedidoValido,
      notas: 'x'.repeat(1001),
    }).success).toBe(false);
  });

  it('rechaza propiedades adicionales', () => {
    expect(crearPedidoSchema.safeParse({
      ...pedidoValido,
      administradorId: '1',
    }).success).toBe(false);
  });
});
