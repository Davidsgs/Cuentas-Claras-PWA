// @ts-check
import { defineConfig } from 'astro/config';
import AstroPWA from '@vite-pwa/astro';

// GitHub Pages de proyecto: https://davidsgs.github.io/Cuentas-Claras-PWA/
const base = '/Cuentas-Claras-PWA/';

export default defineConfig({
  site: 'https://davidsgs.github.io',
  base,
  integrations: [
    AstroPWA({
      base,
      scope: base,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.svg', 'apple-touch-icon.png'],
      manifest: {
        id: base,
        name: 'Cuentas Claras',
        short_name: 'Cuentas Claras',
        description: 'Divide gastos en grupo sin pelear: quién le debe a quién, calculado solo.',
        lang: 'es',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#111827',
        background_color: '#111827',
        icons: [
          { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${base}icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: base,
        // jspdf + html2canvas se cargan bajo demanda: hay que precachearlos
        // igual o exportar deja de funcionar sin internet.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
});
