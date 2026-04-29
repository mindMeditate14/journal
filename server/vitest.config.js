import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.js'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/controllers/**', 'src/middleware/**', 'src/services/**'],
    },
  },
});
