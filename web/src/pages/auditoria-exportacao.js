// Exportação pericial: pacote JSON com registros + manifesto (SHA-256 e raiz de Merkle).
import { requireSession } from '../lib/session.js';
import { buscarLogs, salvarLog } from '../lib/data.js';
import { dataHora, esc } from '../lib/format.js';
import { field, INPUT, toast } from '../lib/ui.js';
import { arvoreMerkle, baixar, logsCsv, sha256, tipoLog, TIPOS_LOG } from '../lib/auditoria.js';

const user = await requireSession();
const $ = (id) => document.getElementById(id);
const hojeIso = new Date().toISOString().slice(0, 10);
const semanaIso = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

$('campos-periodo').innerHTML =
  field('Data inicial', `<input class="${INPUT}" name="de" type="date" value="${semanaIso}" max="${hojeIso}" required/>`) +
  field('Data final', `<input class="${INPUT}" name="ate" type="date" value="${hojeIso}" max="${hojeIso}" required/>`);
$('tipos').innerHTML = Object.entries(TIPOS_LOG).map(([k, v]) => `
  <label class="flex items-center gap-space-xs p-space-sm rounded-lg bg-surface-container-low cursor-pointer hover:bg-surface-container">
    <input checked class="w-4 h-4 accent-secondary" name="tipo" type="checkbox" value="${k}"/>
    <span class="material-symbols-outlined text-[18px] text-secondary">${v.icon}</span><span class="font-body-sm text-body-sm">${v.label}</span>
  </label>`).join('');
$('campos-finalidade').innerHTML =
  field('Número do processo / SEI (opcional)', `<input class="${INPUT}" name="processo" placeholder="Ex.: SEI 0001234-56.2026.8.23.8000"/>`) +
  field('Justificativa *', `<input class="${INPUT}" name="justificativa" placeholder="Ex.: requisição da Corregedoria" required/>`);

const form = $('form-export');
const intervalo = () => {
  const f = new FormData(form);
  return [new Date(`${f.get('de')}T00:00:00`).getTime(), new Date(`${f.get('ate')}T23:59:59.999`).getTime()];
};
const tiposSel = () => new FormData(form).getAll('tipo');

let cache = { chave: '', logs: [] };
async function carregar() {
  const [de, ate] = intervalo();
  const chave = `${de}-${ate}`;
  if (cache.chave !== chave) cache = { chave, logs: await buscarLogs(de, ate) };
  const tipos = tiposSel();
  return cache.logs.filter((l) => tipos.includes(tipoLog(l.mensagem)));
}

async function estimar() {
  const [de, ate] = intervalo();
  if (!(de <= ate)) return ($('estimativa').textContent = 'A data inicial deve ser anterior à final.');
  $('estimativa').textContent = 'Contando registros...';
  try {
    const n = (await carregar()).length;
    $('estimativa').innerHTML = `<strong class="text-on-surface">${n}</strong> registro(s) serão exportados (${dataHora(de)} a ${dataHora(ate)}).`;
  } catch (e) {
    console.error(e);
    $('estimativa').textContent = e.code === 'failed-precondition' ? 'O Firestore pediu a criação de um índice para esta consulta (veja o console).' : 'Não foi possível consultar os registros.';
  }
}
form.addEventListener('change', estimar);
estimar();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(form);
  const [de, ate] = intervalo();
  if (!String(f.get('justificativa')).trim()) return toast('Informe a justificativa da exportação.', 'erro');
  if (!(de <= ate)) return toast('Período inválido.', 'erro');
  const btn = $('btn-gerar');
  btn.disabled = true;
  try {
    const registros = (await carregar()).map((l) => ({ id: l.id, data: l.data, usuario: l.usuario ?? '', mensagem: l.mensagem ?? '' }));
    const niveis = await arvoreMerkle(registros);
    const folhas = niveis[0];
    const manifesto = {
      sistema: 'TechGestor TJRR',
      geradoEm: new Date().toISOString(),
      geradoPor: user.login,
      periodo: { de: new Date(de).toISOString(), ate: new Date(ate).toISOString() },
      tipos: tiposSel(),
      processo: String(f.get('processo') || '').trim(),
      justificativa: String(f.get('justificativa')).trim(),
      total: registros.length,
      algoritmo: 'SHA-256; folha = SHA-256(JSON {id,data,usuario,mensagem}); nó = SHA-256(esq+dir), ímpar duplica o último',
      merkleRoot: niveis[niveis.length - 1][0],
    };
    const pacote = { manifesto, registros: registros.map((r, i) => ({ ...r, hash: folhas[i] })) };
    const json = JSON.stringify(pacote, null, 2);
    const hashArquivo = await sha256(json);
    const base = `pacote-pericial-${f.get('de')}_${f.get('ate')}`;
    baixar(json, `${base}.json`, 'application/json');

    await salvarLog(`EXPORTOU PACOTE PERICIAL DE LOGS (${registros.length} registros, ${f.get('de')} a ${f.get('ate')}, raiz ${manifesto.merkleRoot.slice(0, 12)}…)`, user.login);

    const res = $('resultado');
    res.classList.remove('hidden');
    res.classList.add('flex');
    res.innerHTML = `
      <div class="flex items-center gap-space-xs text-on-tertiary-container font-headline-sm text-headline-sm"><span class="material-symbols-outlined">task_alt</span>Pacote gerado: ${registros.length} registro(s)</div>
      <dl class="grid grid-cols-1 gap-space-sm font-body-sm text-body-sm">
        <div><dt class="font-label-sm text-label-sm text-on-surface-variant uppercase">Raiz de Merkle</dt><dd class="font-mono break-all text-on-surface">${manifesto.merkleRoot}</dd></div>
        <div><dt class="font-label-sm text-label-sm text-on-surface-variant uppercase">SHA-256 do arquivo ${esc(base)}.json</dt><dd class="font-mono break-all text-on-surface">${hashArquivo}</dd></div>
      </dl>
      <p class="font-body-sm text-body-sm text-on-surface-variant">Guarde a raiz de Merkle junto ao processo: ela identifica exatamente este conjunto de registros. A assinatura com certificado ICP-Brasil deve ser feita no arquivo baixado, com o assinador do Tribunal.</p>
      <div class="flex flex-wrap gap-space-sm">
        <button class="h-10 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg flex items-center gap-1.5" data-csv type="button"><span class="material-symbols-outlined text-[18px]">table</span>Baixar também em CSV</button>
        <a class="h-10 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg flex items-center gap-1.5" href="auditoria-integridade.html"><span class="material-symbols-outlined text-[18px]">account_tree</span>Verificar um pacote</a>
      </div>`;
    res.querySelector('[data-csv]').addEventListener('click', () => baixar('﻿' + logsCsv(registros), `${base}.csv`, 'text/csv;charset=utf-8'));
    res.scrollIntoView({ behavior: 'smooth' });
    toast('Pacote pericial gerado.');
  } catch (err) {
    console.error(err);
    toast('Falha ao gerar o pacote.', 'erro');
  } finally {
    btn.disabled = false;
  }
});
