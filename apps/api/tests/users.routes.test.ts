import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { registrarUsuario } = vi.hoisted(() => ({
  registrarUsuario: vi.fn(),
}));

vi.mock('../src/modules/users/users.service.js', () => ({
  registrarUsuario,
}));

import { crearAplicacion } from '../src/app.js';
import { ErrorAplicacion } from '../src/shared/http/app-error.js';

const datosRegistro = {
  nombre: 'Cliente de prueba',
  correo: 'cliente@example.com',
  contrasena: 'UnaContrasenaSegura123',
};

const usuarioPublico = {
  id: '15',
  nombre: 'Cliente de prueba',
  correo: 'cliente@example.com',
  rol: 'CLIENTE',
};

beforeEach(() => {
  vi.clearAllMocks();
  registrarUsuario.mockResolvedValue(usuarioPublico);
});

describe('POST /api/v1/users', () => {
  it('crea la cuenta y devuelve el usuario público con estado 201', async () => {
    const respuesta = await request(crearAplicacion())
      .post('/api/v1/users')
      .send(datosRegistro)
      .expect('Content-Type', /json/)
      .expect(201);

    expect(registrarUsuario).toHaveBeenCalledWith(datosRegistro);
    expect(respuesta.body).toEqual({ usuario: usuarioPublico });
    expect(respuesta.body.usuario).not.toHaveProperty('hashContrasena');
  });

  it('devuelve 400 cuando el servicio rechaza los datos', async () => {
    registrarUsuario.mockRejectedValueOnce(
      new ErrorAplicacion(
        400,
        'Los datos de registro no son válidos',
      ),
    );

    const respuesta = await request(crearAplicacion())
      .post('/api/v1/users')
      .send({})
      .expect(400);

    expect(respuesta.body).toEqual({
      error: 'Los datos de registro no son válidos',
    });
  });

  it('devuelve 409 cuando el correo ya está registrado', async () => {
    registrarUsuario.mockRejectedValueOnce(
      new ErrorAplicacion(
        409,
        'Ya existe una cuenta con ese correo electrónico',
      ),
    );

    const respuesta = await request(crearAplicacion())
      .post('/api/v1/users')
      .send(datosRegistro)
      .expect(409);

    expect(respuesta.body).toEqual({
      error: 'Ya existe una cuenta con ese correo electrónico',
    });
  });

  it('delega los errores inesperados al manejador global', async () => {
    registrarUsuario.mockRejectedValueOnce(
      new Error('Detalle interno de la base de datos'),
    );

    const respuesta = await request(crearAplicacion())
      .post('/api/v1/users')
      .send(datosRegistro)
      .expect(500);

    expect(respuesta.body).toEqual({
      error: 'Error interno del servidor',
    });

    expect(JSON.stringify(respuesta.body)).not.toContain(
      'Detalle interno de la base de datos',
    );
  });
});
