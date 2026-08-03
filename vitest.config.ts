import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['electron/backend/**/*.test.ts'],
    environment: 'node',
  },
});
