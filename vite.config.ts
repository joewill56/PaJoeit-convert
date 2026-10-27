import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      {
        name: 'pajoeit-locale-endpoint',
        configureServer(server) {
          server.middlewares.use('/api/locale', (req, res) => {
            const raw =
              (req.headers['cf-ipcountry'] as string) ||
              (req.headers['x-country-code'] as string) ||
              '';
            const normalized = String(raw || '').trim().toUpperCase();
            const isValid =
              /^[A-Z]{2}$/.test(normalized) && normalized !== 'XX' && normalized !== 'T1';
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
            res.end(JSON.stringify({ country: isValid ? normalized : null }));
          });
        },
      },
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'pajoeit-convert-icon.png',
          'pajoeit-convert-logo.png',
          'icon.svg',
          'assets/pajoeit-convert-icon.png',
          'assets/pajoeit-convert-logo.png',
        ],
        manifest: {
          id: '/',
          name: 'PAJOEIT CONVERT - Free Online Image Workspace',
          short_name: 'PAJOEIT',
          description: 'Convert, compress and resize images online. Fast. Free. Private. No signup required.',
          theme_color: '#090d16',
          background_color: '#090d16',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pajoeit-convert-icon.png',
              sizes: '1024x1024',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          mode: 'development',
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallbackDenylist: [/^\/api\//, /^\/sitemap\.xml$/, /^\/robots\.txt$/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

