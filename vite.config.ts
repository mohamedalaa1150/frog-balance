import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: true, port: 5173, strictPort: true },
  preview: { host: true, port: 4173, strictPort: true },
  build: {
    rolldownOptions: {
      output: {
        manualChunks: (id) =>
          id.includes('/node_modules/phaser/') ? 'phaser' : undefined,
      },
    },
  },
  // TODO: Phase 5: vite-plugin-pwa, generated manifest, and offline precaching.
});
