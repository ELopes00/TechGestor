// Importa as telas exportadas do Stitch para páginas do site.
// Uso: node scripts/import-stitch.mjs [--force]
// Sem --force, páginas que já existem NÃO são sobrescritas (para não perder adaptações).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const stitch = resolve(root, '../stitch_techgestor_tjrr_chamados');
const force = process.argv.includes('--force');

const PAGES = [
  { id: 'index', src: 'techgestor_tjrr_autentica_o_corporativa', title: 'Acesso', layout: 'blank' },
  { id: 'dashboard', src: 'techgestor_tjrr_painel_de_controle_e_monitoramento', title: 'Painel de Controle', nav: 'dashboard' },
  { id: 'chamados', src: 'techgestor_tjrr_gest_o_de_chamados_e_atendimento', title: 'Chamados', nav: 'chamados' },
  { id: 'chamado', src: 'techgestor_tjrr_caixa_de_conversa_oficial_no_chamado', title: 'Atendimento do Chamado', nav: 'chamados' },
  { id: 'eventos', src: 'techgestor_tjrr_gest_o_de_eventos_e_infraestrutura', title: 'Eventos e Infraestrutura', nav: 'eventos' },
  { id: 'inventario', src: 'techgestor_tjrr_invent_rio_de_ativos_e_levantamento', title: 'Inventário de Ativos', nav: 'inventario' },
  { id: 'agenda', src: 'techgestor_tjrr_agenda_forense_e_calend_rio_letivo', title: 'Agenda Forense', nav: 'agenda' },
  { id: 'perfil', src: 'techgestor_tjrr_perfil_do_usu_rio_e_seguran_a', title: 'Perfil e Segurança', nav: 'perfil' },
  { id: 'admin', src: 'techgestor_tjrr_administra_o_de_usu_rios_e_lota_es', title: 'Usuários e Lotações', nav: 'admin' },
  { id: 'auditoria', src: 'techgestor_tjrr_trilha_de_auditoria_e_logs', title: 'Trilha de Auditoria', nav: 'auditoria' },
  { id: 'auditoria-exportacao', src: 'techgestor_tjrr_modal_de_exporta_o_pericial_de_logs', title: 'Exportação Pericial', nav: 'auditoria' },
  { id: 'auditoria-retencao', src: 'techgestor_tjrr_configura_o_de_reten_o_worm_de_36_meses', title: 'Retenção WORM', nav: 'auditoria' },
  { id: 'auditoria-integridade', src: 'techgestor_tjrr_teste_de_integridade_da_rvore_de_merkle', title: 'Integridade Merkle', nav: 'auditoria' },
];

const imgDir = resolve(root, 'public/img');
mkdirSync(imgDir, { recursive: true });
const imgCache = new Map();

// Logo e avatar do cabeçalho recebem nomes fixos; o resto é nomeado pelo hash da URL.
const LOGO = 'AB6AXuDCKdTwahu8_u9ttJtDBTy28WQVxHfhkkkdOiugHnKXttibgPX_IHgiSlffmGOunQpY5Y3fLgrrzd0hMLFmbO5RWZ2rbOSoVhqtCxvjblbttDh';
const AVATAR = 'AB6AXuDi7Z-KIbZzM0jFBq_5aLJJjwlkf9ow-_fKLORyQm4RkkFRwvkR-W8TbEDi7BWdrzV5DC0m_KHHbhgU4UDgidWGLJ_hTw-lceT5lcvqkKOShPVM';

async function localImage(url) {
  if (imgCache.has(url)) return imgCache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar ${url}: ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('svg') ? 'svg' : 'jpg';
  const name = url.includes(LOGO) ? 'logo' : url.includes(AVATAR) ? 'avatar' : `img-${createHash('sha1').update(url).digest('hex').slice(0, 10)}`;
  const file = `${name}.${ext}`;
  writeFileSync(resolve(imgDir, file), Buffer.from(await res.arrayBuffer()));
  imgCache.set(url, `/img/${file}`);
  return `/img/${file}`;
}

async function localizeImages(html) {
  const urls = [...new Set([...html.matchAll(/https:\/\/lh3\.googleusercontent\.com\/[^"'\s)]+/g)].map((m) => m[0]))];
  for (const url of urls) html = html.split(url).join(await localImage(url));
  return html;
}

function extract(html, page) {
  const bodyStart = html.indexOf('>', html.indexOf('<body')) + 1;
  const bodyEnd = html.lastIndexOf('</body>');
  const body = html.slice(bodyStart, bodyEnd);
  if (page.layout === 'blank') return body;

  // Conteúdo do <main> do layout + o que vier depois do wrapper (ex.: modais).
  const mainOpen = body.indexOf('<main class="w-full flex-1 pt-16');
  const mainInnerStart = body.indexOf('>', mainOpen) + 1;
  const shellFooter = body.lastIndexOf('<footer class="w-full bg-surface-container-low py-space-sm');
  const mainInnerEnd = body.lastIndexOf('</main>', shellFooter);
  const afterWrapper = body.indexOf('</footer></div>', shellFooter) + '</footer></div>'.length;
  return body.slice(mainInnerStart, mainInnerEnd) + '\n' + body.slice(afterWrapper);
}

for (const page of PAGES) {
  const out = resolve(root, `${page.id}.html`);
  if (existsSync(out) && !force) {
    console.log(`pulando ${page.id}.html (já existe)`);
    continue;
  }
  const html = readFileSync(resolve(stitch, page.src, 'code.html'), 'utf8');
  const content = (await localizeImages(extract(html, page))).trim();
  const meta = Object.entries({ id: page.id, nav: page.nav, title: page.title, layout: page.layout })
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  const bodyClass = page.layout === 'blank'
    ? ` bodyClass="${html.match(/<body class="([^"]*)"/)[1]}"`
    : '';
  writeFileSync(out, `<!--page ${meta}${bodyClass}-->\n${content}\n`);
  console.log(`ok ${page.id}.html`);
}
console.log(`${imgCache.size} imagens salvas em public/img`);
