// Modo demonstração: mesmo site, mas com dados fictícios e login demo/demo123 (sem Firebase).
// Uso: npm run demo  →  http://localhost:5175
import base from './vite.config.js';

const DEMO = `${import.meta.dirname}/demo`;

export default {
  ...base,
  cacheDir: 'node_modules/.vite-demo', // cache separado para não atrapalhar o "npm run dev"
  plugins: [
    ...base.plugins,
    {
      name: 'techgestor-demo',
      enforce: 'pre',
      resolveId(src, importer) {
        const m = src.match(/lib\/(data|session)\.js$/);
        if (m && importer && !importer.replaceAll('\\', '/').includes('/demo/')) return `${DEMO}/${m[1]}.js`;
      },
    },
  ],
  server: { port: 5175, strictPort: true, watch: { ignored: ['**/dist/**'] } },
};
