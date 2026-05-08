import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import styleX from '@stylexjs/rollup-plugin';
import { VitePWA } from 'vite-plugin-pwa';

const isProd = process.env['NODE_ENV'] === 'production';

/**
 * Injects <link rel="stylesheet" href="/stylex.css"> into index.html at build
 * time. The rollup plugin emits stylex.css via emitFile() but Vite won't add a
 * <link> for it automatically — this ensures the browser loads the stylesheet
 * before React renders (no FOUC).
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
    // ── Production ────────────────────────────────────────────────────────────
    // enforce:'pre' runs this before @vitejs/plugin-react so its transform hook
    // sees raw source files with stylex.create() calls intact. Without it the
    // react babel plugin transforms StyleX first → rollup plugin finds no rules
    // → stylex.css is never emitted.
    //
    // Not used in dev: Vite's dev server never calls generateBundle (so no CSS
    // would be emitted anyway), and enforce:'pre' breaks JSX parsing in the
    // dev-server pipeline before Vite's own TSX transforms have run.
    ...(isProd
      ? [
          { ...styleX({ fileName: 'stylex.css', dev: false, useCSSLayers: true }), enforce: 'pre' } as Plugin,
          stylexLinkInjector(),
        ]
      : []),

    react({
      exclude: /\.css$/,
      babel: {
        plugins: [
          // ── Development ─────────────────────────────────────────────────────
          // In prod the rollup plugin handles all StyleX transforms (see above).
          // In dev runtimeInjection injects <style> tags when each module loads,
          // which is the only approach that works with Vite's dev server.
          ...(!isProd
            ? [
                [
                  '@stylexjs/babel-plugin',
                  {
                    dev: true,
                    runtimeInjection: true,
                    // useCSSLayers replaces the :not(#\#) specificity hack with
                    // CSS @layer — no duplicate rules, cleaner DevTools output.
                    // genConditionalClasses is left off in dev (runtimeInjection
                    // handles conditional merging at runtime without pre-generating
                    // every combination as a separate injected rule).
                    useCSSLayers: true,
                    genConditionalClasses: false,
                    treeshakeCompensation: true,
                    unstable_moduleResolution: {
                      type: 'commonJS',
                      rootDir: process.cwd(),
                    },
                  },
                ],
              ]
            : []),
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
