import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  // Share VITE_SUPABASE_* with the tracker, so one .env.local serves both.
  envDir: resolve(__dirname, '../tracker'),
  resolve: {
    alias: { '@platform2e/analytics': resolve(__dirname, 'src/analyticsStub.ts') },
  },
  build: {
    rollupOptions: {
      input: { panel: resolve(__dirname, 'panel.html') },
    },
  },
});
