import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { crearAplicacion } from '../../src/app.js';

describe('API', () => {
  it('responde con estado 200 en el endpoint de salud', async () => {
    const app = crearAplicacion();

    const respuesta = await request(app)
      .get('/api/v1/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(respuesta.body).toEqual({ status: 'ok' });
  });

  it('responde 404 en rutas inexistentes', async () => {
    const app = crearAplicacion();

    const respuesta = await request(app)
      .get('/api/v1/no-existe')
      .expect('Content-Type', /json/)
      .expect(404);

    expect(respuesta.body).toEqual({
      error: 'Recurso no encontrado',
    });
  });

  it('responde 400 ante JSON malformado sin exponer detalles internos', async () => {
    const app = crearAplicacion();

    const respuesta = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"dato":')
      .expect('Content-Type', /json/)
      .expect(400);

    expect(respuesta.body).toEqual({
      error: 'Solicitud inválida',
    });

    expect(JSON.stringify(respuesta.body)).not.toContain('SyntaxError');
  });
});
