/**
 * vite.config.ts: build, dev server and tests (Vitest) for the desktop app.
 *
 * QUESTLOG_BASE sets the site path: "/" locally, "/quest_log_desktop/" for
 * GitHub Pages (scripts/deploy.sh). `@/` points at src/, as in the phone app,
 * so the copied lib/ and its tests keep their imports.
 */
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: process.env.QUESTLOG_BASE ?? '/',
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { outDir: 'dist', sourcemap: false },
  test: {
    globals: true,
    // Logic tests run in Node; component tests opt into a DOM with `// @vitest-environment jsdom`.
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
