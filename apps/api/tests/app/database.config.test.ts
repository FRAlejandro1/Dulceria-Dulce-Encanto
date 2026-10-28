import { afterEach, describe, expect, it, vi } from 'vitest';

const crearPool = vi.hoisted(() => vi.fn(() => ({ end: vi.fn() })));

vi.mock('mysql2/promise', () => ({
  default: {
    createPool: crearPool,
  },
}));

async function cargarConfiguracion() {
  vi.resetModules();
  return import('../../src/config/database.js');
}

function configurarEntornoValido() {
  vi.stubEnv('DB_HOST', '127.0.0.1');
  vi.stubEnv('DB_USER', 'dulceria_test');
  vi.stubEnv('DB_PASSWORD', 'test-password');
  vi.stubEnv('DB_NAME', 'dulceria_test');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('configuración de base de datos', () => {
  it('crea el pool con valores predeterminados cuando faltan variables opcionales', async () => {
    const modulo = await cargarConfiguracion();

    expect(crearPool).toHaveBeenCalledWith({
      host: '127.0.0.1',
      port: 3306,
      user: 'dulceria_app',
      password: '',
      database: 'dulceria_dulce_encanto',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      timezone: 'Z',
      dateStrings: true,
      enableKeepAlive: true,
    });

    expect(modulo.pool).toBeDefined();
  });

  it('valida una configuración completa con números explícitos', async () => {
    configurarEntornoValido();
    vi.stubEnv('DB_PORT', '3307');
    vi.stubEnv('DB_CONNECTION_LIMIT', '5');

    const modulo = await cargarConfiguracion();

    expect(modulo.validarConfiguracionBaseDatos()).toBeUndefined();
    expect(crearPool).toHaveBeenCalledWith(expect.objectContaining({
      port: 3307,
      connectionLimit: 5,
      host: '127.0.0.1',
      user: 'dulceria_test',
      password: 'test-password',
      database: 'dulceria_test',
    }));
  });

  it('rechaza todas las variables obligatorias ausentes', async () => {
    const modulo = await cargarConfiguracion();

    expect(() => modulo.validarConfiguracionBaseDatos()).toThrow(
      'Faltan variables de entorno obligatorias para MySQL: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME',
    );
  });

  it('rechaza variables obligatorias vacías o con espacios', async () => {
    configurarEntornoValido();
    vi.stubEnv('DB_HOST', '   ');
    vi.stubEnv('DB_PASSWORD', '');

    const modulo = await cargarConfiguracion();

    expect(() => modulo.validarConfiguracionBaseDatos()).toThrow(
      'Faltan variables de entorno obligatorias para MySQL: DB_HOST, DB_PASSWORD',
    );
  });

  it.each([
    ['DB_PORT', 'abc'],
    ['DB_PORT', '0'],
    ['DB_PORT', '1.5'],
    ['DB_CONNECTION_LIMIT', 'abc'],
    ['DB_CONNECTION_LIMIT', '0'],
    ['DB_CONNECTION_LIMIT', '2.5'],
  ])('rechaza %s=%s durante la validación', async (nombre, valor) => {
    configurarEntornoValido();

    const modulo = await cargarConfiguracion();
    vi.stubEnv(nombre, valor);

    expect(() => modulo.validarConfiguracionBaseDatos()).toThrow(
      `${nombre} debe ser un entero positivo`,
    );
  });

  it('acepta valores numéricos positivos en la validación', async () => {
    configurarEntornoValido();

    const modulo = await cargarConfiguracion();
    vi.stubEnv('DB_PORT', '3308');
    vi.stubEnv('DB_CONNECTION_LIMIT', '3');

    expect(() => modulo.validarConfiguracionBaseDatos()).not.toThrow();
  });

  it('usa los valores predeterminados para variables numéricas vacías', async () => {
    configurarEntornoValido();

    const modulo = await cargarConfiguracion();

    vi.stubEnv('DB_PORT', '   ');
    vi.stubEnv('DB_CONNECTION_LIMIT', '');

    expect(() => modulo.validarConfiguracionBaseDatos()).not.toThrow();
  });
});
