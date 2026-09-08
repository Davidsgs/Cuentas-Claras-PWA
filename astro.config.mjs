// @ts-check
import { defineConfig } from 'astro/config';
import AstroPWA from '@vite-pwa/astro';
import pkg from './package.json' with { type: 'json' };

// GitHub Pages de proyecto: https://davidsgs.github.io/Cuentas-Claras-PWA/
const base = '/Cuentas-Claras-PWA/';

export default defineConfig({
  // La versión del bundle, para mostrarla en Configuración.
  vite: { define: { __APP_VERSION__: JSON.stringify(pkg.version) } },
  site: 'https://davidsgs.github.io',
  base,
  integrations: [
    AstroPWA({
      base,
      scope: base,
      // 'prompt' en vez de 'autoUpdate': con autoUpdate el service worker
      // tomaba control y recargaba la página solo, sin avisar. Ahora la app
      // detecta la versión nueva y deja que el usuario decida cuándo.
      registerType: 'prompt',
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
