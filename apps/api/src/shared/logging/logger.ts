type ErrorSerializado = {
  name: string;
  code?: string;
};

function serializarError(error: unknown): ErrorSerializado {
  if (!(error instanceof Error)) {
    return { name: 'UnknownError' };
  }

  const resultado: ErrorSerializado = {
    name: /^[A-Za-z][A-Za-z0-9]*$/.test(error.name)
      ? error.name
      : 'Error',
  };

  const codigo = (error as Error & { code?: unknown }).code;

  if (
    typeof codigo === 'string' &&
    /^[A-Z0-9_]{1,64}$/.test(codigo)
  ) {
    resultado.code = codigo;
  }

  return resultado;
}

export function registrarError(
  evento: string,
  error: unknown,
  contexto: Record<string, unknown> = {},
): void {
  const registro = {
    timestamp: new Date().toISOString(),
    level: 'error',
    event: evento,
    error: serializarError(error),
    context: contexto,
  };

  process.stderr.write(`${JSON.stringify(registro)}\n`);
}

export function registrarInfo(
  evento: string,
  contexto: Record<string, unknown> = {},
): void {
  const registro = {
    timestamp: new Date().toISOString(),
    level: 'info',
    event: evento,
    context: contexto,
  };

  process.stdout.write(`${JSON.stringify(registro)}\n`);
}
