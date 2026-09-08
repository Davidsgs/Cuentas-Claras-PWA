/** @type {import('tailwindcss').Config} */
// ponytail: Tailwind v3 a propósito. Es copia literal de la config que estaba
// inline en index.html, así la migración no cambia ni un pixel. Subir a v4
// cuando se quiera hacer un repaso visual (v4 renombra shadow-sm/rounded-sm/
// outline-none y cambia el color de borde por defecto: son ~1400 usos a revisar).
export default {
  content: ['./src/**/*.{astro,html,js,ts}'],
  darkMode: 'class',
  theme: {
    fontFamily: {
      sans: ['Outfit Variable', 'Outfit', 'sans-serif'],
    },
    extend: {
      colors: {
        // Editables desde Configuración: los valores viven en variables CSS que
        // se reescriben por tema. Canales sueltos (no hex) para que sigan
        // funcionando las opacidades tipo shadow-primary/30.
        primary: 'rgb(var(--c-primary) / <alpha-value>)',
        secondary: 'rgb(var(--c-secondary) / <alpha-value>)',
        base: 'rgb(var(--c-base) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        // Alias de los nombres viejos: dark era el fondo, cardDark la tarjeta.
        dark: 'rgb(var(--c-base) / <alpha-value>)',
        cardDark: 'rgb(var(--c-surface) / <alpha-value>)',
        danger: '#EF4444',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-5px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
};
