import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup/globals.js'],
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true
  }
});