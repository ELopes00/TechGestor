import type { Config } from "tailwindcss";

/**
 * Paleta com suporte a claro/escuro — realinhada em 14/08/2026 pra bater
 * com o CSS exato do sage-ti.web.app (ver globals.css pros valores das
 * variáveis --ink-, --surface, --sidebar, --brand e --status).
 *
 * `institucional` e `surface` se invertem sozinhos com a classe "dark" na
 * <html>. `accent` (marca, azul) também é var-backed agora — no sage-ti o
 * azul fica mais claro no escuro (#3987e5) que no claro (#2a78d6), então
 * não é mais fixo como antes. `chrome` (sidebar/login) também é var-backed
 * mas sempre escuro nos dois temas, só troca de tom — igual ao sage-ti,
 * onde a sidebar nunca vira clara.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        institucional: {
          50: "var(--ink-50)",
          100: "var(--ink-100)",
          200: "var(--ink-200)",
          300: "var(--ink-300)",
          400: "var(--ink-400)",
          500: "var(--ink-500)",
          600: "var(--ink-600)",
          700: "var(--ink-700)",
          800: "var(--ink-800)",
          900: "var(--ink-900)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          muted: "var(--surface-muted)",
          border: "var(--surface-border)",
        },
        accent: {
          50: "var(--brand-wash)",
          500: "var(--brand)",
          600: "var(--brand-hover)",
          700: "var(--brand-active)",
          // Fundos translúcidos pré-misturados (ver globals.css) — usar
          // sem modificador "/70", que não funciona em cima de var().
          btn: "var(--brand-btn)",
          "btn-hover": "var(--brand-btn-hover)",
        },
        chrome: {
          900: "var(--sidebar)",
          800: "var(--sidebar-hover)",
          700: "var(--sidebar-active)",
          text: "var(--sidebar-text)",
          muted: "var(--sidebar-muted)",
        },
        alerta: {
          ok: "var(--status-good)",
          atencao: "var(--status-warning)",
          critico: "var(--status-critical)",
          okBg: "var(--wash-good)",
          atencaoBg: "var(--wash-warning)",
          criticoBg: "var(--wash-critical)",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
