import { describe, expect, it } from 'vitest';

import { ErrorAplicacion } from '../src/shared/http/app-error.js';

describe('ErrorAplicacion', () => {
  it('conserva el estado HTTP y el mensaje público', () => {
    const error = new ErrorAplicacion(409, 'Conflicto de registro');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ErrorAplicacion');
    expect(error.message).toBe('Conflicto de registro');
    expect(error.status).toBe(409);
    expect(error.mensajePublico).toBe('Conflicto de registro');
  });
});
