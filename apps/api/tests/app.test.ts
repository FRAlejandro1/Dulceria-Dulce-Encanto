import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { crearAplicacion } from '../src/app.js';

describe('API', () => {
  it('responde con estado 200 en el endpoint de salud', async () => {
    const app = crearAplicacion();

    const respuesta = await request(app)
      .get('/api/v1/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(respuesta.body).toEqual({ status: 'ok' });
  });
});
