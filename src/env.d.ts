/// <reference types="vite-plugin-pwa/vanillajs" />

// Lo inyecta Vite desde package.json (ver astro.config.mjs).
declare const __APP_VERSION__: string;

// app.js expone su objeto en window: los handlers inline del HTML lo llaman
// como app.loQueSea(), y index.astro lo usa para la barra de actualización.
interface Window {
    app: Record<string, any>;
}
