// Paleta do design system TechGestor TJRR.
// `light` é a exportada do Stitch. `dark` segue o DESIGN.md (canvas #0f172a,
// cartões #1e293b, bordas #334155). Cores de marca usadas como FUNDO
// (primary, primary-container, secondary...) ficam iguais nos dois temas para
// manter o contraste com o texto "on-*" branco; as que viram texto ilegível no
// escuro são ajustadas em style.css (.dark .text-primary etc.).

export const light = {
  surface: '#faf8ff',
  'surface-dim': '#d2d9f4',
  'surface-bright': '#faf8ff',
  'surface-container-lowest': '#ffffff',
  'surface-container-low': '#f2f3ff',
  'surface-container': '#eaedff',
  'surface-container-high': '#e2e7ff',
  'surface-container-highest': '#dae2fd',
  'surface-variant': '#dae2fd',
  background: '#faf8ff',
  'on-background': '#131b2e',
  'on-surface': '#131b2e',
  'on-surface-variant': '#42474e',
  'inverse-surface': '#283044',
  'inverse-on-surface': '#eef0ff',
  outline: '#73777f',
  'outline-variant': '#c2c7cf',
  'surface-tint': '#3a6188',

  primary: '#002541',
  'on-primary': '#ffffff',
  'primary-container': '#0b3b60',
  'on-primary-container': '#7fa6d0',
  'inverse-primary': '#a3caf6',
  'primary-fixed': '#d0e4ff',
  'primary-fixed-dim': '#a3caf6',
  'on-primary-fixed': '#001d35',
  'on-primary-fixed-variant': '#1f496f',

  secondary: '#006398',
  'on-secondary': '#ffffff',
  'secondary-container': '#5bb8fe',
  'on-secondary-container': '#00476e',
  'secondary-fixed': '#cce5ff',
  'secondary-fixed-dim': '#93ccff',
  'on-secondary-fixed': '#001d31',
  'on-secondary-fixed-variant': '#004b73',

  tertiary: '#002a1a',
  'on-tertiary': '#ffffff',
  'tertiary-container': '#00422b',
  'on-tertiary-container': '#10b981',
  'tertiary-fixed': '#6ffbbe',
  'tertiary-fixed-dim': '#4edea3',
  'on-tertiary-fixed': '#002113',
  'on-tertiary-fixed-variant': '#005236',

  error: '#ba1a1a',
  'on-error': '#ffffff',
  'error-container': '#ffdad6',
  'on-error-container': '#93000a',
};

export const dark = {
  ...light,
  surface: '#0f172a',
  'surface-dim': '#0b1120',
  'surface-bright': '#273449',
  'surface-container-lowest': '#1e293b',
  'surface-container-low': '#162033',
  'surface-container': '#1b263a',
  'surface-container-high': '#24314a',
  'surface-container-highest': '#2c3a55',
  'surface-variant': '#2c3a55',
  background: '#0f172a',
  'on-background': '#e2e8f0',
  'on-surface': '#e2e8f0',
  'on-surface-variant': '#a7b1c2',
  'inverse-surface': '#e2e8f0',
  'inverse-on-surface': '#1e293b',
  outline: '#8a94a6',
  'outline-variant': '#334155',

  primary: '#0b3b60',
  'primary-container': '#134e7c',
  'on-primary-container': '#a3caf6',
  'secondary-container': '#004b73',
  'on-secondary-container': '#cce5ff',
  'primary-fixed': '#1f496f',
  'on-primary-fixed': '#d0e4ff',
  'on-primary-fixed-variant': '#d0e4ff',
  'secondary-fixed': '#004b73',
  'on-secondary-fixed': '#cce5ff',
  'on-secondary-fixed-variant': '#cce5ff',
  'tertiary-fixed': '#005236',
  'on-tertiary-fixed': '#6ffbbe',
  'on-tertiary-fixed-variant': '#6ffbbe',
  'error-container': '#5c1414',
  'on-error-container': '#ffdad6',
};

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

export const cssVars = (palette) =>
  Object.fromEntries(Object.entries(palette).map(([k, v]) => [`--c-${k}`, rgb(v)]));
