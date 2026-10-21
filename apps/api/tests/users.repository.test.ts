import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ejecutarConsulta } = vi.hoisted(() => ({
  ejecutarConsulta: vi.fn(),
}));

vi.mock('../src/config/database.js', () => ({
  pool: {
    execute: ejecutarConsulta,
  },
}));

import {
  buscarUsuarioPorCorreo,
  buscarUsuarioPorId,
  crearUsuario,
} from '../src/modules/users/users.repository.js';

/**
 * Construye una fila equivalente al resultado SQL del repositorio.
 * Los valores predeterminados permiten que cada prueba modifique
 * únicamente los campos relevantes para su escenario.
 */
function crearFilaUsuario(overrides: Record<string, unknown> = {}) {
  return {
    id: '9007199254740993',
    nombre: 'Cliente de prueba',
    correo: 'cliente@example.com',
    hash_contrasena: '$argon2id$hash-de-prueba',
    rol: 'CLIENTE',
    activo: 1,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  ejecutarConsulta.mockResolvedValue([[], []]);
});

describe('buscarUsuarioPorCorreo', () => {
  it('devuelve null cuando el correo no está registrado', async () => {
    await expect(
      buscarUsuarioPorCorreo('inexistente@example.com'),
    ).resolves.toBeNull();

    expect(ejecutarConsulta).toHaveBeenCalledOnce();

    const [sql, parametros] = ejecutarConsulta.mock.calls[0] as [
      string,
      unknown[],
    ];

    expect(sql).toContain('FROM users');
    expect(sql).toContain('WHERE email = ?');
    expect(sql).toContain('LIMIT 1');
    expect(parametros).toEqual(['inexistente@example.com']);
  });

  it('convierte la fila a un usuario interno sin perder precisión en el ID', async () => {
    ejecutarConsulta.mockResolvedValueOnce([
      [crearFilaUsuario()],
      [],
    ]);

    await expect(
      buscarUsuarioPorCorreo('cliente@example.com'),
    ).resolves.toEqual({
      id: '9007199254740993',
      nombre: 'Cliente de prueba',
      correo: 'cliente@example.com',
      hashContrasena: '$argon2id$hash-de-prueba',
      rol: 'CLIENTE',
      activo: true,
    });

    const [sql, parametros] = ejecutarConsulta.mock.calls[0] as [
      string,
      unknown[],
    ];

    expect(sql).toContain('CAST(id AS CHAR) AS id');
    expect(sql).toContain('password_hash AS hash_contrasena');
    expect(parametros).toEqual(['cliente@example.com']);
  });

  it('convierte una cuenta inactiva sin tratarla como activa', async () => {
    ejecutarConsulta.mockResolvedValueOnce([
      [crearFilaUsuario({ activo: 0 })],
      [],
    ]);

    const usuario = await buscarUsuarioPorCorreo(
      'cliente@example.com',
    );

    expect(usuario?.activo).toBe(false);
  });

  it('propaga los errores de la consulta', async () => {
    const error = new Error('Error de consulta');
    ejecutarConsulta.mockRejectedValueOnce(error);

    await expect(
      buscarUsuarioPorCorreo('cliente@example.com'),
    ).rejects.toBe(error);
  });
  it('rechaza una fila con un rol desconocido', async () => {
    ejecutarConsulta.mockResolvedValueOnce([
      [crearFilaUsuario({ rol: 'SUPERADMIN' })],
      [],
    ]);

    await expect(
      buscarUsuarioPorCorreo('cliente@example.com'),
    ).rejects.toThrow(
      'El rol del usuario recuperado no es válido',
    );
  });
});

describe('buscarUsuarioPorId', () => {
  it('devuelve null cuando el identificador no existe', async () => {
    await expect(
      buscarUsuarioPorId('999'),
    ).resolves.toBeNull();

    const [sql, parametros] = ejecutarConsulta.mock.calls[0] as [
      string,
      unknown[],
    ];

    expect(sql).toContain('WHERE id = ?');
    expect(parametros).toEqual(['999']);
  });

  it('devuelve la cuenta encontrada por identificador', async () => {
    ejecutarConsulta.mockResolvedValueOnce([
      [crearFilaUsuario({ rol: 'ADMIN' })],
      [],
    ]);

    await expect(
      buscarUsuarioPorId('15'),
    ).resolves.toMatchObject({
      id: '9007199254740993',
      rol: 'ADMIN',
      activo: true,
    });
  });

  it('propaga los errores de consulta', async () => {
    const error = new Error('MySQL no disponible');
    ejecutarConsulta.mockRejectedValueOnce(error);

    await expect(
      buscarUsuarioPorId('15'),
    ).rejects.toBe(error);
  });
  it('rechaza una fila con un rol desconocido', async () => {
    ejecutarConsulta.mockResolvedValueOnce([
      [crearFilaUsuario({ rol: 'ROL_INVALIDO' })],
      [],
    ]);

    await expect(
      buscarUsuarioPorId('15'),
    ).rejects.toThrow(
      'El rol del usuario recuperado no es válido',
    );
  });
});

describe('crearUsuario', () => {
  it('inserta la cuenta y devuelve los datos recuperados de MySQL', async () => {
    ejecutarConsulta
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockResolvedValueOnce([
        [crearFilaUsuario()],
        [],
      ]);

    await expect(
      crearUsuario({
        nombre: 'Cliente de prueba',
        correo: 'cliente@example.com',
        hashContrasena: '$argon2id$hash-de-prueba',
      }),
    ).resolves.toEqual({
      id: '9007199254740993',
      nombre: 'Cliente de prueba',
      correo: 'cliente@example.com',
      hashContrasena: '$argon2id$hash-de-prueba',
      rol: 'CLIENTE',
      activo: true,
    });

    expect(ejecutarConsulta).toHaveBeenCalledTimes(2);

    const [sqlInsercion, parametrosInsercion] =
      ejecutarConsulta.mock.calls[0] as [string, unknown[]];

    expect(sqlInsercion).toContain('INSERT INTO users');
    expect(parametrosInsercion).toEqual([
      'Cliente de prueba',
      'cliente@example.com',
      '$argon2id$hash-de-prueba',
    ]);

    const [sqlBusqueda, parametrosBusqueda] =
      ejecutarConsulta.mock.calls[1] as [string, unknown[]];

    expect(sqlBusqueda).toContain('WHERE email = ?');
    expect(parametrosBusqueda).toEqual(['cliente@example.com']);
  });

  it('propaga un error si la inserción falla', async () => {
    const error = new Error('Correo duplicado');
    ejecutarConsulta.mockRejectedValueOnce(error);

    await expect(
      crearUsuario({
        nombre: 'Cliente de prueba',
        correo: 'cliente@example.com',
        hashContrasena: '$argon2id$hash-de-prueba',
      }),
    ).rejects.toBe(error);

    expect(ejecutarConsulta).toHaveBeenCalledOnce();
  });

  it('falla explícitamente si no encuentra la cuenta recién insertada', async () => {
    ejecutarConsulta
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockResolvedValueOnce([[], []]);

    await expect(
      crearUsuario({
        nombre: 'Cliente de prueba',
        correo: 'cliente@example.com',
        hashContrasena: '$argon2id$hash-de-prueba',
      }),
    ).rejects.toThrow(
      'No se pudo recuperar el usuario después de crearlo',
    );
  });
});
