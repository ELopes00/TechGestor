/** Tokens do design system TechGestor TJRR (exportados do Stitch). */
import plugin from 'tailwindcss/plugin';
import { light, dark, cssVars } from './src/theme/palette.js';

// Cada cor vira uma variável CSS (--c-nome) para o modo escuro trocar tudo de uma vez,
// mantendo os modificadores de opacidade (ex.: bg-surface/90).
const colors = Object.fromEntries(Object.keys(light).map((k) => [k, `rgb(var(--c-${k}) / <alpha-value>)`]));
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./*.html', './src/**/*.{js,html}', './vite.config.js'],
  darkMode: 'class',
  theme: {
    extend: {
      colors,
      borderRadius: { DEFAULT: '0.25rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
      spacing: {
        'space-md': '1rem', 'margin-mobile': '1rem', 'space-xl': '2rem', 'gutter-mobile': '0.75rem',
        'gutter-desktop': '1.5rem', 'margin-desktop': '2rem', gutter: '1.25rem', 'space-lg': '1.5rem',
        'space-xs': '0.25rem', 'space-sm': '0.5rem', margin: '1.5rem',
      },
      fontFamily: {
        'headline-xl': ['Plus Jakarta Sans', 'sans-serif'], 'headline-sm': ['Plus Jakarta Sans', 'sans-serif'],
        'display-lg-mobile': ['Plus Jakarta Sans', 'sans-serif'], 'headline-lg': ['Plus Jakarta Sans', 'sans-serif'],
        'display-lg': ['Plus Jakarta Sans', 'sans-serif'],
        'label-lg': ['Inter', 'sans-serif'], 'body-sm': ['Inter', 'sans-serif'], 'label-sm': ['Inter', 'sans-serif'],
        'body-md': ['Inter', 'sans-serif'], 'label-md': ['Inter', 'sans-serif'], 'body-lg': ['Inter', 'sans-serif'],
      },
      fontSize: {
        'headline-xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.015em', fontWeight: '700' }],
        'headline-sm': ['16px', { lineHeight: '24px', letterSpacing: '-0.005em', fontWeight: '600' }],
        'display-lg-mobile': ['28px', { lineHeight: '36px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-lg': ['20px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'label-lg': ['14px', { lineHeight: '20px', letterSpacing: '0.01em', fontWeight: '600' }],
        'body-sm': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.03em', fontWeight: '600' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '600' }],
        'display-lg': ['36px', { lineHeight: '44px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({ ':root': { ...cssVars(light), colorScheme: 'light' }, '.dark': { ...cssVars(dark), colorScheme: 'dark' } });
    }),
  ],
};
