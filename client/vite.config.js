import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Machi Koro 2',
        short_name: 'MachiKoro',
        description: 'Play Machi Koro 2 with friends in your browser',
        theme_color: '#0f1923',
        background_color: '#0f1923',
        display: 'standalone',
        orientation: 'landscape',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/machikoro_custom_192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/machikoro_custom_512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/machikoro_custom_512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache the app shell and static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Don't cache socket.io or API calls
        navigateFallback: '/',
        navigateFallbackDenylist: [/^\/api/, /^\/socket.io/],
        runtimeCaching: [
          {
            // Cache Google Fonts if you add them later
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
        ],
      },
      devOptions: {
        // Enable PWA in dev so you can test it locally
        enabled: true,
      },
    }),
  ],
  server: {
    port: 5173,
    host: '0.0.0.0'
  },
});
