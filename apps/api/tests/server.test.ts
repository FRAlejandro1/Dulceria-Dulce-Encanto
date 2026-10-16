import { beforeEach, describe, expect, it, vi } from 'vitest';

const validarConfiguracionAutenticacion = vi.fn();
const validarConfiguracionBaseDatos = vi.fn();
const listen = vi.fn();
const crearAplicacion = vi.fn(() => ({ listen }));

describe('punto de entrada server.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    delete process.env.PORT;
    vi.clearAllMocks();

    vi.doMock('dotenv/config', () => ({}));
    vi.doMock('../src/config/auth.js', () => ({
      validarConfiguracionAutenticacion,
    }));
    vi.doMock('../src/config/database.js', () => ({
      validarConfiguracionBaseDatos,
    }));
    vi.doMock('../src/app.js', () => ({
      crearAplicacion,
    }));
  });

  it('usa el puerto 3000 por defecto y valida la configuración', async () => {
    const informacion = vi.spyOn(console, 'info').mockImplementation(() => {});

    await import('../src/server.js');

    expect(validarConfiguracionBaseDatos).toHaveBeenCalledOnce();
    expect(validarConfiguracionAutenticacion).toHaveBeenCalledOnce();
    expect(crearAplicacion).toHaveBeenCalledOnce();
    expect(listen).toHaveBeenCalledWith(3000, expect.any(Function));

    const callback = listen.mock.calls[0]?.[1] as (() => void) | undefined;
    callback?.();

    expect(informacion).toHaveBeenCalledWith(
      'API disponible en el puerto 3000',
    );
  });

  it('acepta un puerto configurado valido', async () => {
    vi.stubEnv('PORT', '4000');

    await import('../src/server.js');

    expect(listen).toHaveBeenCalledWith(4000, expect.any(Function));
  });

  it.each([
    '',
    'abc',
    '3000.5',
    '0',
    '70000',
  ])('rechaza el puerto invalido %s', async (puerto) => {
    vi.stubEnv('PORT', puerto);

    await expect(import('../src/server.js')).rejects.toThrow(
      /PORT debe ser un puerto TCP v.lido entre 1 y 65535/,
    );

    expect(listen).not.toHaveBeenCalled();
  });
});
