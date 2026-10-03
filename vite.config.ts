import { VitePWA } from 'vite-plugin-pwa';
import strings from './content/strings.ar.json' with { type: 'json' };
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeManifestIcons: false,
      manifest: {
        name: strings.game_title,
        short_name: strings.game_title,
        lang: 'ar',
        dir: 'rtl',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#FEF1CF',
        background_color: '#FEF1CF',
        icons: [
          { src: 'icons/icon_192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon_512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon_maskable_512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        inlineWorkboxRuntime: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,woff,woff2,webp,svg,png,json,mp3}'],
        maximumFileSizeToCacheInBytes: 2_000_000,
        cleanupOutdatedCaches: true,
        globIgnores: ['**/audio/music/**'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/audio\/music\/.*\.(ogg|mp3)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'frog-music',
              expiration: { maxEntries: 8 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  base: './',
  server: { host: true, port: 5173, strictPort: true },
  preview: { host: true, port: 4173, strictPort: true },
  build: {
    // Phaser's expected ~1.2 MB raw chunk remains within the 600 kB gzip budget.
    chunkSizeWarningLimit: 1300,
    rolldownOptions: {
      output: {
        manualChunks: (id) =>
          id.includes('/node_modules/phaser/') ? 'phaser' : undefined,
      },
    },
  },
});
