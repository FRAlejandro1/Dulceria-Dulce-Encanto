import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/app.ts',
        'src/config/auth.ts',
        'src/config/database.ts',
        'src/modules/audit/audit.repository.ts',
        'src/shared/database/transaction.ts',
        'src/shared/http/error-handler.ts',
        'src/shared/logging/logger.ts',
        'src/shared/security/password.ts',
        'src/shared/security/jwt.ts',
      ],
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov'],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
});
