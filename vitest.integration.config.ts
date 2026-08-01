import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    // Tests share one local Postgres instance and create/mutate real rows —
    // run sequentially to avoid cross-file interference.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
    setupFiles: ['./tests/integration/helpers/setup.ts'],
  },
});
