// Trilha de auditoria: logs do Firestore ao vivo, com filtros, paginação e CSV.
import { requireSession } from '../lib/session.js';
import { subscribeLogs } from '../lib/data.js';
import { dataHora, ehHoje, esc, tempoRelativo } from '../lib/format.js';
import { avatar, emptyState, erroFirestore, options, skeletonRows } from '../lib/ui.js';
import { baixar, logsCsv, tipoLog, TIPOS_LOG } from '../lib/auditoria.js';

await requireSession();
const $ = (id) => document.getElementById(id);
const POR_PAGINA = 50;
let logs = null;
let pagina = 0;

$('f-tipo').innerHTML = options([['', 'Todos os tipos'], ...Object.entries(TIPOS_LOG).map(([k, v]) => [k, v.label])], '');
$('kpis').innerHTML = skeletonRows(4, 'h-28');
$('tabela').innerHTML = `<tr><td colspan="4" class="p-space-lg">${skeletonRows(5, 'h-8')}</td></tr>`;

function filtrados() {
  const dias = Number($('f-periodo').value);
  const desde = dias === 1 ? new Date().setHours(0, 0, 0, 0) : dias ? Date.now() - dias * 86400000 : 0;
  const termo = $('f-busca').value.trim().toLowerCase();
  return logs.filter((l) =>
    (l.data || 0) >= desde &&
    (!$('f-tipo').value || tipoLog(l.mensagem) === $('f-tipo').value) &&
    (!$('f-usuario').value || l.usuario === $('f-usuario').value) &&
    (!termo || `${l.mensagem} ${l.usuario}`.toLowerCase().includes(termo)));
}

function tile(titulo, icone, valor, sub, alerta = false) {
  return `<div class="flex flex-col justify-between p-space-md ${alerta ? 'bg-error-container text-on-error-container' : 'bg-surface-container-lowest'} rounded-xl shadow-sm">
    <div class="flex items-center justify-between"><span class="font-label-lg text-label-lg ${alerta ? '' : 'text-on-surface'}">${titulo}</span>
      <div class="p-1.5 rounded-lg ${alerta ? 'text-error' : 'bg-surface-container text-secondary'}"><span class="material-symbols-outlined text-[20px]">${icone}</span></div></div>
    <span class="font-display-lg text-display-lg ${alerta ? 'text-error' : 'text-primary'} tracking-tight mt-space-sm">${valor}</span>
    <span class="font-body-sm text-body-sm ${alerta ? '' : 'text-on-surface-variant'}">${sub}</span>
  </div>`;
}

function render() {
  if (!logs) return;
  const hoje = logs.filter((l) => ehHoje(l.data));
  const alertasHoje = hoje.filter((l) => tipoLog(l.mensagem) === 'ALERTA');
  const acessos = hoje.filter((l) => /LOGOU/i.test(l.mensagem || ''));
  $('kpis').innerHTML = [
    tile('Eventos hoje', 'dataset', hoje.length, logs.length ? `Último: ${tempoRelativo(logs[0].data)}` : 'Sem registros'),
    tile('Acessos hoje', 'login', acessos.length, `${new Set(acessos.map((l) => l.usuario)).size} usuário(s) diferentes`),
    tile('Alertas hoje', 'warning', alertasHoje.length, 'Acesso fora do expediente e exclusões', alertasHoje.length > 0),
    tile('Usuários ativos hoje', 'group', new Set(hoje.map((l) => l.usuario)).size, 'Com pelo menos uma ação registrada'),
  ].join('');

  const usuarioSel = $('f-usuario').value;
  $('f-usuario').innerHTML = options([['', 'Todos os usuários'], ...[...new Set(logs.map((l) => l.usuario).filter(Boolean))].sort()], usuarioSel);

  const lista = filtrados();
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  pagina = Math.min(pagina, paginas - 1);
  const fatia = lista.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
  $('contagem').textContent = `${lista.length} registro(s) no filtro`;
  $('pagina-info').textContent = `Página ${pagina + 1} de ${paginas}`;
  $('pag-ant').disabled = pagina === 0;
  $('pag-prox').disabled = pagina >= paginas - 1;
  $('tabela').innerHTML = fatia.length
    ? fatia.map((l) => {
        const t = TIPOS_LOG[tipoLog(l.mensagem)];
        return `<tr class="hover:bg-surface-container-low align-top">
          <td class="px-space-lg py-space-sm font-label-md text-label-md text-on-surface whitespace-nowrap" title="${esc(tempoRelativo(l.data))}">${dataHora(l.data)}</td>
          <td class="px-space-md py-space-sm"><div class="flex items-center gap-space-xs">${avatar(l.usuario, 'w-6 h-6 text-[10px]')}<span class="font-label-md text-label-md truncate max-w-[8rem]">${esc(l.usuario || 'SISTEMA')}</span></div></td>
          <td class="px-space-md py-space-sm"><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${t.cls}"><span class="material-symbols-outlined text-[14px]">${t.icon}</span>${t.label}</span></td>
          <td class="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface break-words">${esc(l.mensagem)}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="4">${emptyState('manage_search', 'Nenhum registro encontrado para o filtro.')}</td></tr>`;
}

subscribeLogs((l) => { logs = l; render(); }, (err) => ($('tabela').innerHTML = `<tr><td colspan="4">${erroFirestore(err)}</td></tr>`));
['f-busca', 'f-tipo', 'f-usuario', 'f-periodo'].forEach((id) => $(id).addEventListener('input', () => { pagina = 0; render(); }));
$('pag-ant').addEventListener('click', () => { pagina--; render(); });
$('pag-prox').addEventListener('click', () => { pagina++; render(); });
$('btn-csv').addEventListener('click', () => logs && baixar('﻿' + logsCsv(filtrados()), `auditoria-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8'));
