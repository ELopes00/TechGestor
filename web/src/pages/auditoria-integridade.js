// Verificação de pacote pericial: recalcula a árvore de Merkle e compara com o banco.
import { requireSession } from '../lib/session.js';
import { buscarLogs, salvarLog } from '../lib/data.js';
import { dataHora, esc } from '../lib/format.js';
import { toast } from '../lib/ui.js';
import { arvoreMerkle, logCanonico, sha256, tipoLog } from '../lib/auditoria.js';

const user = await requireSession();
const $ = (id) => document.getElementById(id);

const veredito = (ok, titulo, texto) => `
  <div class="flex items-start gap-space-md p-space-lg rounded-xl shadow-sm ${ok ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-error-container text-on-error-container'}">
    <span class="material-symbols-outlined text-[32px]">${ok ? 'verified' : 'gpp_bad'}</span>
    <div class="flex flex-col gap-1"><strong class="font-headline-sm text-headline-sm">${titulo}</strong><span class="font-body-sm text-body-sm">${texto}</span></div>
  </div>`;
const hashLinha = (rotulo, valor) => `<div><dt class="font-label-sm text-label-sm text-on-surface-variant uppercase">${rotulo}</dt><dd class="font-mono text-body-sm break-all text-on-surface">${esc(valor)}</dd></div>`;

async function verificar(file) {
  const res = $('resultado');
  res.classList.remove('hidden');
  res.classList.add('flex');
  res.innerHTML = '<div class="skeleton rounded-xl h-24"></div><div class="skeleton rounded-xl h-40"></div>';

  let pacote;
  try {
    pacote = JSON.parse(await file.text());
    if (!pacote?.manifesto?.merkleRoot || !Array.isArray(pacote.registros)) throw new Error('formato');
  } catch {
    res.innerHTML = veredito(false, 'Arquivo inválido', 'O arquivo não é um pacote pericial do TechGestor.');
    return;
  }
  const { manifesto, registros } = pacote;

  // 1) Integridade do próprio pacote
  const niveis = await arvoreMerkle(registros);
  const raiz = niveis[niveis.length - 1][0];
  const folhasAlteradas = [];
  for (let i = 0; i < registros.length; i++) if (registros[i].hash && registros[i].hash !== niveis[0][i]) folhasAlteradas.push(registros[i]);
  const pacoteOk = raiz === manifesto.merkleRoot && folhasAlteradas.length === 0 && registros.length === manifesto.total;

  // 2) Comparação com o banco atual
  const de = new Date(manifesto.periodo.de).getTime();
  const ate = new Date(manifesto.periodo.ate).getTime();
  let comparacao = '';
  let bancoOk = null;
  try {
    const atuais = (await buscarLogs(de, ate)).filter((l) => (manifesto.tipos || []).includes(tipoLog(l.mensagem)));
    const porId = new Map(atuais.map((l) => [l.id, l]));
    const removidos = registros.filter((r) => !porId.has(r.id));
    const alterados = registros.filter((r) => porId.has(r.id) && logCanonico(porId.get(r.id)) !== logCanonico(r));
    const ids = new Set(registros.map((r) => r.id));
    const novos = atuais.filter((l) => !ids.has(l.id) && l.data <= new Date(manifesto.geradoEm).getTime());
    bancoOk = !removidos.length && !alterados.length && !novos.length;
    const listar = (titulo, itens) => itens.length ? `<div class="flex flex-col gap-1"><span class="font-label-md text-label-md text-error">${titulo} (${itens.length})</span><ul class="font-body-sm text-body-sm list-disc pl-5">${itens.slice(0, 20).map((l) => `<li>${dataHora(l.data)} • ${esc(l.usuario)} • ${esc(l.mensagem)}</li>`).join('')}${itens.length > 20 ? '<li>…</li>' : ''}</ul></div>` : '';
    comparacao = veredito(bancoOk,
      bancoOk ? 'Banco de dados confere com o pacote' : 'Divergência entre o banco e o pacote',
      bancoOk ? `Os ${atuais.length} registros atuais do período são idênticos aos exportados.` : 'Registros do período foram removidos, alterados ou inseridos com data retroativa depois da exportação.') +
      (bancoOk ? '' : `<div class="flex flex-col gap-space-sm p-space-lg bg-surface-container-lowest rounded-xl shadow-sm">${listar('Removidos do banco', removidos)}${listar('Alterados no banco', alterados)}${listar('Inseridos com data retroativa', novos)}</div>`);
  } catch (e) {
    console.error(e);
    comparacao = veredito(false, 'Não foi possível consultar o banco', 'A verificação do arquivo acima continua válida.');
  }

  res.innerHTML = `
    ${veredito(pacoteOk, pacoteOk ? 'Pacote íntegro' : 'Pacote adulterado',
      pacoteOk ? 'A raiz de Merkle recalculada é idêntica à registrada no manifesto.' : `A raiz recalculada não confere${folhasAlteradas.length ? ` (${folhasAlteradas.length} registro(s) com hash diferente)` : ''}. O arquivo foi modificado após a exportação.`)}
    ${comparacao}
    <section class="flex flex-col gap-space-sm p-space-lg bg-surface-container-lowest rounded-xl shadow-sm">
      <h2 class="font-headline-sm text-headline-sm text-primary">Detalhes</h2>
      <dl class="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
        ${hashLinha('Raiz no manifesto', manifesto.merkleRoot)}
        ${hashLinha('Raiz recalculada', raiz)}
        ${hashLinha('Período', `${dataHora(de)} a ${dataHora(ate)}`)}
        ${hashLinha('Gerado por / em', `${manifesto.geradoPor} • ${dataHora(new Date(manifesto.geradoEm).getTime())}`)}
        ${hashLinha('Registros', `${registros.length} (manifesto: ${manifesto.total})`)}
        ${hashLinha('Árvore', `${niveis.length} níveis`)}
        ${manifesto.justificativa ? hashLinha('Justificativa', manifesto.justificativa) : ''}
        ${manifesto.processo ? hashLinha('Processo', manifesto.processo) : ''}
      </dl>
    </section>`;

  salvarLog(`VERIFICOU INTEGRIDADE DE PACOTE PERICIAL (raiz ${manifesto.merkleRoot.slice(0, 12)}…): arquivo ${pacoteOk ? 'ÍNTEGRO' : 'ADULTERADO'}, banco ${bancoOk === null ? 'não consultado' : bancoOk ? 'CONFERE' : 'DIVERGENTE'}`, user.login);
  toast(pacoteOk && bancoOk ? 'Verificação concluída: tudo confere.' : 'Verificação concluída com divergências.', pacoteOk && bancoOk ? 'ok' : 'erro');
}

$('arquivo').addEventListener('change', (e) => e.target.files[0] && verificar(e.target.files[0]));
const drop = $('drop');
['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('bg-surface-container'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('bg-surface-container')));
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if (f) verificar(f);
});
