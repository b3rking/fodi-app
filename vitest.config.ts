import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only the pure core is tested here: no React, no SQLite, no Expo runtime.
    include: ['src/core/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Pure modules only. lock.ts and backup.ts import Expo native modules and
      // cannot run in node, so they are excluded from coverage rather than
      // dragging the number down with untestable glue.
      include: ['src/core/**/*.ts'],
      exclude: ['**/*.test.ts', 'src/core/lock.ts', 'src/core/backup.ts'],
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