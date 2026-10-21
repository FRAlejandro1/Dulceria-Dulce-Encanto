import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  conexion,
  buscarUsuarioPorCorreo,
  crearUsuario,
  registrarAuditoria,
  generarHashContrasena,
} = vi.hoisted(() => ({
  conexion: {
    beginTransaction: vi.fn(async () => undefined),
    commit: vi.fn(async () => undefined),
    rollback: vi.fn(async () => undefined),
    release: vi.fn(),
    execute: vi.fn(async () => [[], []]),
  },
  buscarUsuarioPorCorreo: vi.fn(),
  crearUsuario: vi.fn(),
  registrarAuditoria: vi.fn(),
  generarHashContrasena: vi.fn(),
}));

vi.mock('../src/config/database.js', () => ({
  pool: {
    getConnection: vi.fn(async () => conexion),
    execute: vi.fn(async () => [[], []]),
  },
}));

vi.mock('../src/modules/users/users.repository.js', () => ({
  buscarUsuarioPorCorreo,
  buscarUsuarioPorId: vi.fn(),
  crearUsuario,
}));

vi.mock('../src/modules/audit/audit.repository.js', () => ({
  registrarAuditoria,
}));

vi.mock('../src/shared/security/password.js', () => ({
  generarHashContrasena,
  verificarContrasena: vi.fn(),
}));

import { registrarUsuario } from '../src/modules/users/users.service.js';
import { ErrorAplicacion } from '../src/shared/http/app-error.js';

const datosRegistro = {
  nombre: 'Cliente de prueba',
  correo: ' CLIENTE@EXAMPLE.COM ',
  contrasena: 'UnaContrasenaSegura123',
};

const usuarioCreado = {
  id: '15',
  nombre: 'Cliente de prueba',
  correo: 'cliente@example.com',
  hashContrasena: '$argon2id$hash-privado',
  rol: 'CLIENTE' as const,
  activo: true,
};

beforeEach(() => {
  vi.clearAllMocks();

  conexion.beginTransaction.mockResolvedValue(undefined);
  conexion.commit.mockResolvedValue(undefined);
  conexion.rollback.mockResolvedValue(undefined);

  buscarUsuarioPorCorreo.mockResolvedValue(null);
  crearUsuario.mockResolvedValue(usuarioCreado);
  registrarAuditoria.mockResolvedValue(undefined);
  generarHashContrasena.mockResolvedValue('$argon2id$hash-privado');
});

describe('registrarUsuario', () => {
  it('rechaza los datos inválidos sin abrir una transacción', async () => {
    await expect(
      registrarUsuario({
        nombre: 'A',
        correo: 'correo-inválido',
        contrasena: 'corta',
      }),
    ).rejects.toMatchObject({
      status: 400,
      mensajePublico: 'Los datos de registro no son válidos',
    });

    expect(conexion.beginTransaction).not.toHaveBeenCalled();
    expect(crearUsuario).not.toHaveBeenCalled();
  });

  it('rechaza propiedades adicionales, incluido un rol enviado por el cliente', async () => {
    await expect(
      registrarUsuario({
        ...datosRegistro,
        rol: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(ErrorAplicacion);

    expect(conexion.beginTransaction).not.toHaveBeenCalled();
    expect(crearUsuario).not.toHaveBeenCalled();
  });

  it('revierte la transacción si el correo ya existe', async () => {
    buscarUsuarioPorCorreo.mockResolvedValueOnce(usuarioCreado);

    await expect(
      registrarUsuario(datosRegistro),
    ).rejects.toMatchObject({
      status: 409,
      mensajePublico: 'Ya existe una cuenta con ese correo electrónico',
    });

    expect(conexion.beginTransaction).toHaveBeenCalledOnce();
    expect(conexion.rollback).toHaveBeenCalledOnce();
    expect(conexion.commit).not.toHaveBeenCalled();
    expect(crearUsuario).not.toHaveBeenCalled();
    expect(registrarAuditoria).not.toHaveBeenCalled();
    expect(conexion.release).toHaveBeenCalledOnce();
  });

  it('normaliza el correo, genera el hash y registra solo datos públicos', async () => {
    const resultado = await registrarUsuario(datosRegistro);

    expect(buscarUsuarioPorCorreo).toHaveBeenCalledWith(
      'cliente@example.com',
      conexion,
    );

    expect(generarHashContrasena).toHaveBeenCalledWith(
      datosRegistro.contrasena,
    );

    expect(crearUsuario).toHaveBeenCalledWith(
      {
        nombre: 'Cliente de prueba',
        correo: 'cliente@example.com',
        hashContrasena: '$argon2id$hash-privado',
      },
      conexion,
    );

    expect(registrarAuditoria).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        actorUserId: '15',
        action: 'USER_REGISTERED',
        entityType: 'user',
        entityId: '15',
        details: { rol: 'CLIENTE' },
      }),
    );

    expect(resultado).toEqual({
      id: '15',
      nombre: 'Cliente de prueba',
      correo: 'cliente@example.com',
      rol: 'CLIENTE',
    });

    expect(resultado).not.toHaveProperty('hashContrasena');
    expect(conexion.commit).toHaveBeenCalledOnce();
    expect(conexion.rollback).not.toHaveBeenCalled();
    expect(conexion.release).toHaveBeenCalledOnce();
  });

  it('revierte la creación cuando falla la auditoría', async () => {
    registrarAuditoria.mockRejectedValueOnce(
      new Error('Fallo interno de auditoría'),
    );

    await expect(
      registrarUsuario(datosRegistro),
    ).rejects.toThrow('Fallo interno de auditoría');

    expect(crearUsuario).toHaveBeenCalledOnce();
    expect(conexion.rollback).toHaveBeenCalledOnce();
    expect(conexion.commit).not.toHaveBeenCalled();
    expect(conexion.release).toHaveBeenCalledOnce();
  });

  it('revierte la transacción si falla el cálculo del hash', async () => {
    generarHashContrasena.mockRejectedValueOnce(
      new Error('Fallo de hashing'),
    );

    await expect(
      registrarUsuario(datosRegistro),
    ).rejects.toThrow('Fallo de hashing');

    expect(crearUsuario).not.toHaveBeenCalled();
    expect(conexion.rollback).toHaveBeenCalledOnce();
    expect(conexion.commit).not.toHaveBeenCalled();
  });

  it('convierte una carrera de correo duplicado en conflicto HTTP 409', async () => {
    const errorDuplicado = Object.assign(
      new Error('Duplicate entry'),
      { code: 'ER_DUP_ENTRY' },
    );

    crearUsuario.mockRejectedValueOnce(errorDuplicado);

    await expect(
      registrarUsuario(datosRegistro),
    ).rejects.toMatchObject({
      status: 409,
      mensajePublico: 'Ya existe una cuenta con ese correo electrónico',
    });

    expect(conexion.rollback).toHaveBeenCalledOnce();
    expect(conexion.commit).not.toHaveBeenCalled();
  });

  it('propaga errores de base de datos distintos de ER_DUP_ENTRY', async () => {
    crearUsuario.mockRejectedValueOnce(
      Object.assign(new Error('Error de base de datos'), {
        code: 'ER_LOCK_WAIT_TIMEOUT',
      }),
    );

    await expect(
      registrarUsuario(datosRegistro),
    ).rejects.toThrow('Error de base de datos');

    expect(conexion.rollback).toHaveBeenCalledOnce();
    expect(conexion.commit).not.toHaveBeenCalled();
  });

  it('propaga un rechazo con valor null sin convertirlo en conflicto', async () => {
    crearUsuario.mockRejectedValueOnce(null);

    await expect(
      registrarUsuario(datosRegistro),
    ).rejects.toBeNull();

    expect(conexion.rollback).toHaveBeenCalledOnce();
  });

  it('propaga un rechazo primitivo sin convertirlo en conflicto', async () => {
    crearUsuario.mockRejectedValueOnce('fallo primitivo');

    await expect(
      registrarUsuario(datosRegistro),
    ).rejects.toBe('fallo primitivo');

    expect(conexion.rollback).toHaveBeenCalledOnce();
  });
});
