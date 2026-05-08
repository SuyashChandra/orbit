import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import styleX from '@stylexjs/rollup-plugin';
import { VitePWA } from 'vite-plugin-pwa';

const isDev = process.env['NODE_ENV'] !== 'production';

/**
 * The rollup plugin emits stylex.css as a build asset via emitFile(), but
 * Vite doesn't automatically add a <link> for emitFile assets. This plugin
 * injects the <link> into index.html at build time so the browser loads the
 * stylesheet before React renders (no FOUC).
 */
function stylexLinkInjector(): Plugin {
  return {
    name: 'stylex-link-injector',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'link',
          attrs: { rel: 'stylesheet', href: '/stylex.css' },
          injectTo: 'head',
        },
      ];
    },
  };
}

export default defineConfig({
  plugins: [
    // enforce: 'pre' ensures this runs BEFORE the react plugin so its transform
    // hook sees raw source files (with stylex.create() calls intact).
    // Without this, the react babel plugin transforms StyleX first and the
    // rollup plugin finds no rules to collect → stylex.css is never emitted.
    //
    // Behaviour by mode:
    //   dev  (dev:true)  → runtimeInjection defaults to true → <style> tags via JS
    //   prod (dev:false) → runtimeInjection defaults to false → CSS extracted to stylex.css
    {
      ...styleX({ fileName: 'stylex.css' }),
      enforce: 'pre',
    },
    stylexLinkInjector(),
    react({
      exclude: /\.css$/,
      // Do NOT add @stylexjs/babel-plugin here — the rollup plugin above handles
      // the StyleX transform. Adding it again would double-transform and break things.
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'Orbit',
        short_name: 'Orbit',
        description: 'Your personal superapp — jobs, gym, badminton, and friends',
        theme_color: '#14201c',
        background_color: '#0c1411',
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
