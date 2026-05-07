import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import styleX from '@stylexjs/rollup-plugin';
import { VitePWA } from 'vite-plugin-pwa';

const isDev = process.env['NODE_ENV'] !== 'production';

export default defineConfig({
  plugins: [
    // The rollup plugin collects extracted styles into stylex.css at build time.
    // In dev mode Vite never calls generateBundle, so it produces nothing —
    // runtimeInjection handles dev instead (see babel plugin config below).
    styleX({
      fileName: 'stylex.css',
      useCSSLayers: true,
    }),
    react({
      exclude: /\.css$/,
      babel: {
        plugins: [
          [
            '@stylexjs/babel-plugin',
            {
              dev: isDev,
              // In dev: inject styles into <style> tags at runtime (no CSS file needed).
              // In prod: set false so the rollup plugin extracts them into stylex.css.
              runtimeInjection: isDev,
              genConditionalClasses: true,
              treeshakeCompensation: true,
              unstable_moduleResolution: {
                type: 'commonJS',
                rootDir: process.cwd(),
              },
            },
          ],
        ],
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'Orbit',
        short_name: 'Orbit',
        description: 'Your personal superapp — jobs, gym, badminton, and friends',
        theme_color: '#001510',
        background_color: '#001510',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
