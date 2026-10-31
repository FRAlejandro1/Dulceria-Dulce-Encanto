import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  conexion,
  buscarUsuarioPorCorreo,
  crearSesion,
  buscarSesionActivaPorHash,
  revocarSesionPorHash,
  registrarAuditoria,
  verificarContrasena,
  ejecutarTransaccion,
  bloquearYObtenerIntentos,
  registrarIntentoFallido,
  reiniciarIntentosFallidos,
} = vi.hoisted(() => {
  const conexion = {
    beginTransaction: vi.fn(async () => undefined),
    commit: vi.fn(async () => undefined),
    rollback: vi.fn(async () => undefined),
    release: vi.fn(),
    execute: vi.fn(async () => [[], []]),
  };

  return {
    conexion,
    buscarUsuarioPorCorreo: vi.fn(),
    crearSesion: vi.fn(),
    buscarSesionActivaPorHash: vi.fn(),
    revocarSesionPorHash: vi.fn(),
    registrarAuditoria: vi.fn(),
    verificarContrasena: vi.fn(),
    ejecutarTransaccion: vi.fn(),
    bloquearYObtenerIntentos: vi.fn(),
    registrarIntentoFallido: vi.fn(),
    reiniciarIntentosFallidos: vi.fn(),
  };
});

vi.mock('../../src/config/database.js', () => ({
  pool: {
    getConnection: vi.fn(async () => conexion),
    execute: vi.fn(async () => [[], []]),
  },
}));

vi.mock('../../src/modules/users/users.repository.js', () => ({
  buscarUsuarioPorCorreo,
}));

vi.mock('../../src/modules/auth/sessions.repository.js', () => ({
  crearSesion,
  buscarSesionActivaPorHash,
  revocarSesionPorHash,
}));

vi.mock('../../src/modules/auth/login-attempts.repository.js', () => ({
  bloquearYObtenerIntentos,
  registrarIntentoFallido,
  reiniciarIntentosFallidos,
}));

vi.mock('../../src/modules/audit/audit.repository.js', () => ({
  registrarAuditoria,
}));

vi.mock('../../src/shared/security/password.js', () => ({
  generarHashContrasena: vi.fn(),
  verificarContrasena,
}));

vi.mock('../../src/shared/database/transaction.js', () => ({
  ejecutarTransaccion,
}));

import {
  cerrarSesion,
  iniciarSesion,
} from '../../src/modules/auth/auth.service.js';
import { calcularHashTokenSesion } from '../../src/shared/security/session-token.js';

const usuario = {
  id: '15',
  nombre: 'Cliente de prueba',
  correo: 'cliente@example.com',
  hashContrasena: '$argon2id$hash',
  rol: 'CLIENTE' as const,
  activo: true,
};

const datosInicio = {
  correo: ' CLIENTE@EXAMPLE.COM ',
  contrasena: 'UnaContrasenaSegura123',
};

const token = 'A'.repeat(43);

beforeEach(() => {
  vi.clearAllMocks();

  buscarUsuarioPorCorreo.mockResolvedValue(usuario);
  verificarContrasena.mockResolvedValue(true);
  crearSesion.mockResolvedValue(undefined);
  buscarSesionActivaPorHash.mockResolvedValue({
    id: '8',
    userId: '15',
    expiraEn: new Date('2026-10-21T00:00:00.000Z'),
  });
  revocarSesionPorHash.mockResolvedValue(undefined);
  registrarAuditoria.mockResolvedValue(undefined);

  bloquearYObtenerIntentos.mockResolvedValue({
    intentosFallidos: 0,
    segundosBloqueo: 0,
  });

  registrarIntentoFallido.mockResolvedValue({
    intentosFallidos: 1,
    segundosBloqueo: 0,
  });

  reiniciarIntentosFallidos.mockResolvedValue(undefined);

  ejecutarTransaccion.mockImplementation(
    async (operacion: (conexion: typeof conexion) => Promise<unknown>) =>
      operacion(conexion),
  );
});

describe('iniciarSesion', () => {
  it('rechaza datos inválidos', async () => {
    await expect(iniciarSesion({ correo: 'incorrecto' }))
      .rejects.toMatchObject({
        status: 400,
        mensajePublico: 'Los datos de inicio de sesión no son válidos',
      });

    expect(buscarUsuarioPorCorreo).not.toHaveBeenCalled();
  });

  it('rechaza un usuario inexistente', async () => {
    buscarUsuarioPorCorreo.mockResolvedValue(null);

    await expect(iniciarSesion(datosInicio)).rejects.toMatchObject({
      status: 401,
      mensajePublico: 'Correo o contraseña incorrectos',
    });

    expect(bloquearYObtenerIntentos).not.toHaveBeenCalled();
  });

  it('rechaza una contraseña incorrecta e informa los intentos restantes', async () => {
    verificarContrasena.mockResolvedValue(false);

    await expect(iniciarSesion(datosInicio)).rejects.toMatchObject({
      status: 401,
      mensajePublico: 'Contraseña incorrecta. Te quedan 2 de 3 intentos.',
    });

    expect(registrarIntentoFallido).toHaveBeenCalledWith(
      usuario.id,
      conexion,
    );
  });

  it('bloquea el acceso al alcanzar tres intentos fallidos', async () => {
    verificarContrasena.mockResolvedValue(false);
    registrarIntentoFallido.mockResolvedValue({
      intentosFallidos: 3,
      segundosBloqueo: 900,
    });

    await expect(iniciarSesion(datosInicio)).rejects.toMatchObject({
      status: 429,
      mensajePublico: 'Acceso bloqueado durante 15 minutos por demasiados intentos.',
    });
  });

  it('rechaza el acceso mientras la cuenta está bloqueada', async () => {
    bloquearYObtenerIntentos.mockResolvedValue({
      intentosFallidos: 3,
      segundosBloqueo: 75,
    });

    await expect(iniciarSesion(datosInicio)).rejects.toMatchObject({
      status: 429,
      mensajePublico: 'Acceso bloqueado. Inténtalo de nuevo en 2 minutos.',
    });

    expect(verificarContrasena).not.toHaveBeenCalled();
    expect(registrarIntentoFallido).not.toHaveBeenCalled();
  });

  it('rechaza un usuario desactivado', async () => {
    buscarUsuarioPorCorreo.mockResolvedValue({
      ...usuario,
      activo: false,
    });

    await expect(iniciarSesion(datosInicio)).rejects.toMatchObject({
      status: 401,
      mensajePublico: 'Correo o contraseña incorrectos',
    });

    expect(bloquearYObtenerIntentos).not.toHaveBeenCalled();
  });

  it('crea una sesión, reinicia intentos y registra la auditoría', async () => {
    const resultado = await iniciarSesion(datosInicio);

    expect(buscarUsuarioPorCorreo).toHaveBeenCalledWith(
      'cliente@example.com',
      conexion,
    );

    expect(bloquearYObtenerIntentos).toHaveBeenCalledWith(
      usuario.id,
      conexion,
    );

    expect(verificarContrasena).toHaveBeenCalledWith(
      usuario.hashContrasena,
      datosInicio.contrasena,
    );

    expect(reiniciarIntentosFallidos).toHaveBeenCalledWith(
      usuario.id,
      conexion,
    );

    expect(resultado.usuario).toEqual({
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    });

    expect(resultado.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(resultado.expiraEn).toBeInstanceOf(Date);

    expect(crearSesion).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: usuario.id,
        hashToken: calcularHashTokenSesion(resultado.token),
        expiraEn: resultado.expiraEn,
      }),
      conexion,
    );

    expect(registrarAuditoria).toHaveBeenCalledWith(
      conexion,
      expect.objectContaining({
        actorUserId: usuario.id,
        action: 'USER_LOGIN',
        entityType: 'session',
      }),
    );
  });

  it('propaga errores de la transacción', async () => {
    ejecutarTransaccion.mockRejectedValueOnce(
      new Error('Fallo de base de datos'),
    );

    await expect(iniciarSesion(datosInicio)).rejects.toThrow(
      'Fallo de base de datos',
    );
  });
});

describe('cerrarSesion', () => {
  it.each([
    undefined,
    null,
    '',
    'token-invalido',
    'A'.repeat(42),
    'A'.repeat(44),
  ])('ignora un token inválido: %s', async (tokenInvalido) => {
    await expect(cerrarSesion(tokenInvalido)).resolves.toBeUndefined();

    expect(buscarSesionActivaPorHash).not.toHaveBeenCalled();
    expect(revocarSesionPorHash).not.toHaveBeenCalled();
  });

  it('no hace nada si la sesión ya no está activa', async () => {
    buscarSesionActivaPorHash.mockResolvedValue(null);

    await cerrarSesion(token);

    expect(buscarSesionActivaPorHash).toHaveBeenCalledWith(
      calcularHashTokenSesion(token),
    );
    expect(revocarSesionPorHash).not.toHaveBeenCalled();
    expect(registrarAuditoria).not.toHaveBeenCalled();
  });

  it('revoca la sesión activa y registra la auditoría', async () => {
    await cerrarSesion(token);

    const hash = calcularHashTokenSesion(token);

    expect(revocarSesionPorHash).toHaveBeenCalledWith(hash, conexion);
    expect(registrarAuditoria).toHaveBeenCalledWith(
      conexion,
      {
        actorUserId: '15',
        action: 'USER_LOGOUT',
        entityType: 'session',
        entityId: '8',
      },
    );
  });

  it('propaga errores al buscar la sesión', async () => {
    buscarSesionActivaPorHash.mockRejectedValueOnce(
      new Error('Error de consulta'),
    );

    await expect(cerrarSesion(token)).rejects.toThrow('Error de consulta');
  });

  it('propaga errores al revocar la sesión', async () => {
    revocarSesionPorHash.mockRejectedValueOnce(
      new Error('Error de revocación'),
    );

    await expect(cerrarSesion(token)).rejects.toThrow('Error de revocación');
  });
});