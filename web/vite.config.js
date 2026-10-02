import { defineConfig } from 'vite';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = import.meta.dirname;
const partial = (name) => readFileSync(resolve(root, 'src/partials', name), 'utf8');

// Logomarca oficial (Portaria GP 1708/2015): {{logo-tjrr:classes}} vira o SVG inline em currentColor.
const logoTjrr = (html) =>
  html.replace(/\{\{logo-tjrr(?::([^}]*))?\}\}/g, (_, cls = '') =>
    `<svg aria-label="Poder Judiciário do Estado de Roraima" class="${cls}" fill="currentColor" role="img" viewBox="0 0 753.27 464.14" xmlns="http://www.w3.org/2000/svg">${partial('logo-tjrr.svg')}</svg>`);

const NAV_BASE = 'flex items-center justify-between px-space-md py-space-sm rounded-lg transition-all';
const NAV_IDLE = `${NAV_BASE} text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface`;
const NAV_ACTIVE = `${NAV_BASE} bg-primary-container text-on-primary font-semibold shadow-sm`;

// Sub-itens exibidos sob "Auditoria & Logs" quando alguma página de auditoria está aberta.
const AUDITORIA_SUBNAV = [
  ['auditoria', 'auditoria.html', 'Trilha de auditoria'],
  ['auditoria-exportacao', 'auditoria-exportacao.html', 'Exportação pericial'],
  ['auditoria-retencao', 'auditoria-retencao.html', 'Retenção de logs'],
  ['auditoria-integridade', 'auditoria-integridade.html', 'Integridade Merkle'],
];

const HEAD = (title, page) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${title}</title>
<link rel="icon" href="/img/tjrr-simbolo.svg" type="image/svg+xml"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" rel="stylesheet"/>
<script>try{var t=localStorage.getItem('tg-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}</script>
<link rel="stylesheet" href="/src/style.css"/>
<script type="module" src="/src/main.js"></script>
${existsSync(resolve(root, `src/pages/${page}.js`)) ? `<script type="module" src="/src/pages/${page}.js"></script>` : ''}
</head>`;

/**
 * Cada página começa com um comentário de metadados:
 *   <!--page id="chamados" nav="chamados" title="Chamados"-->
 * O plugin envolve o conteúdo no documento completo (head + cabeçalho/menu/rodapé).
 * Com layout="blank" (login), só o <head> é adicionado.
 */
function layoutPlugin() {
  return {
    name: 'techgestor-layout',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const meta = html.match(/^\s*<!--page([^>]*)-->/);
        if (!meta) return html;
        const attrs = Object.fromEntries([...meta[1].matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
        const body = html.slice(meta[0].length);
        const page = attrs.id ?? '';
        const head = HEAD(attrs.title ? `${attrs.title} • TechGestor TJRR` : 'TechGestor TJRR', page);
        const nav = attrs.nav ?? '';

        if (attrs.layout === 'blank') {
          return logoTjrr(`${head}
<body class="${attrs.bodyClass ?? 'bg-surface font-body-md text-on-surface antialiased'}" data-page="${page}">
${body}
</body>
</html>`);
        }

        const subnav = nav === 'auditoria'
          ? `<div class="flex flex-col gap-0.5 ml-space-lg pl-space-sm border-l border-outline-variant/60 mb-space-xs">${AUDITORIA_SUBNAV.map(
              ([id, href, label]) =>
                `<a class="px-space-sm py-1.5 rounded-lg font-label-md text-label-md transition-colors ${
                  id === page
                    ? 'text-primary bg-surface-container-high'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }" href="${href}">${label}</a>`,
            ).join('')}</div>`
          : '';

        const top = partial('shell-top.html')
          .replace(/\{\{nav:([\w-]+)\}\}/g, (_, id) => (id === nav ? NAV_ACTIVE : NAV_IDLE))
          .replace('{{subnav:auditoria}}', subnav);

        return logoTjrr(`${head}
<body class="bg-surface font-body-md text-on-surface antialiased" data-page="${page}" data-auth="required"${attrs.require ? ` data-require-page="${attrs.require}"` : ''}>
${top}
<div class="lg:pl-64 flex flex-col min-h-screen">
<main class="w-full flex-1 pt-16 px-gutter-mobile sm:px-gutter-desktop pb-space-lg bg-surface">
<div class="pt-space-lg">
${body}
</div>
</main>
${partial('shell-footer.html')}
</div>
</body>
</html>`);
      },
    },
  };
}

const pages = Object.fromEntries(
  readdirSync(root)
    .filter((f) => f.endsWith('.html'))
    .map((f) => [f.replace(/\.html$/, ''), resolve(root, f)]),
);

export default defineConfig({
  plugins: [layoutPlugin()],
  build: { target: 'es2022', rollupOptions: { input: pages } },
  esbuild: { target: 'es2022' },
  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
    esbuildOptions: { target: 'es2022' },
  },
  server: { port: 5173, watch: { ignored: ['**/dist/**'] } },
});
