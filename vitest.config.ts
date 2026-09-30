import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only the pure core is tested here: no React, no SQLite, no Expo runtime.
    include: ['src/core/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/core/fuel/**/*.ts', 'src/core/format.ts'],
      exclude: ['**/*.test.ts'],
      thresholds: {
        // P2 exit criteria: the fuel maths must be provably right.
        lines: 95,
        branches: 90,
        functions: 95,
        statements: 95,
      },
    },
  },
});