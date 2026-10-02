// Painel de controle: indicadores, gráficos, equipe e fila prioritária com dados reais.
import { requireSession } from '../lib/session.js';
import { subscribeChamados, subscribeUsuarios } from '../lib/data.js';
import {
  dataHora, ehHoje, esc, formatProtocolo, fracaoSla, getDataFechamento, getStatusCategoria, isFechado, isSlaVencido,
  prioridadeUI, SETORES, slaLimiteMs, slaTexto, statusUI, USUARIO_STATUS_UI, usuarioStatusUI,
} from '../lib/format.js';
import { avatar, emptyState, erroFirestore, options, skeletonRows } from '../lib/ui.js';

const user = await requireSession();
const $ = (id) => document.getElementById(id);

// Relógio de Boa Vista
const relogio = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Boa_Vista', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const tick = () => ($('live-clock').textContent = relogio.format(new Date()));
tick();
setInterval(tick, 1000);
const h = new Date().getHours();
$('saudacao').textContent = `${h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'}, ${user.nomeCompleto?.split(' ')[0] || user.login}`;

$('filtro-predio').innerHTML = options([['', 'Todos os prédios'], ...SETORES], '');
$('kpis').innerHTML = skeletonRows(5, 'h-32');
$('equipe').innerHTML = skeletonRows(4, 'h-24');

let chamados = null;
let usuarios = [];
let periodo = 1;

const filtrados = () => (chamados || []).filter((c) => !$('filtro-predio').value || c.predio === $('filtro-predio').value);

// ---------- Indicadores ----------
function kpi({ titulo, icone, valor, sufixo = '', selo, barra, alerta = false, href }) {
  const tag = href ? 'a' : 'div';
  return `<${tag} ${href ? `href="${href}"` : ''} class="p-space-md rounded-xl ${alerta ? 'bg-error-container text-on-error-container' : 'bg-surface-container-lowest'} shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
    <div class="flex items-center justify-between">
      <span class="font-label-sm text-label-sm ${alerta ? '' : 'text-on-surface-variant'} font-medium flex items-center gap-1.5">${alerta ? '<span class="w-2.5 h-2.5 rounded-full bg-error animate-ping"></span>' : ''}${titulo}</span>
      <div class="w-8 h-8 rounded-lg ${alerta ? '' : 'bg-surface-container'} flex items-center justify-center ${alerta ? 'text-error' : 'text-primary'}"><span class="material-symbols-outlined text-[18px]">${icone}</span></div>
    </div>
    <div class="flex items-baseline justify-between gap-space-xs mt-space-md">
      <span class="font-display-lg text-display-lg ${alerta ? 'text-error' : 'text-primary'} tracking-tight font-bold">${valor}${sufixo ? `<span class="font-headline-sm text-headline-sm text-on-surface-variant font-normal">${sufixo}</span>` : ''}</span>
      ${selo ? `<span class="px-2 py-0.5 rounded-full ${alerta ? 'bg-error text-on-error' : 'bg-surface-container text-on-surface-variant'} font-label-sm text-label-sm font-semibold text-right">${selo}</span>` : ''}
    </div>
    <div class="w-full ${alerta ? 'bg-surface-container-lowest' : 'bg-surface-container'} rounded-full h-1.5 mt-space-sm overflow-hidden">
      <div class="${alerta ? 'bg-error' : 'bg-secondary'} h-1.5 rounded-full" style="width:${Math.max(0, Math.min(100, barra))}%"></div>
    </div>
  </${tag}>`;
}

function renderKpis(lista) {
  const abertos = lista.filter((c) => !isFechado(c.status));
  const naFila = abertos.filter((c) => getStatusCategoria(c.status) === 'ABERTO');
  const fechadosHoje = lista.filter((c) => isFechado(c.status) && ehHoje(getDataFechamento(c)));
  const dentroSla = fechadosHoje.filter((c) => getDataFechamento(c) - c.dataAbertura <= slaLimiteMs(c)).length;
  const vencidos = abertos.filter(isSlaVencido);
  const criticos = abertos.filter((c) => c.prioridade === 'CRITICA');
  const tecnicos = usuarios.filter((u) => u.perfil === 'TECNICO');
  const online = tecnicos.filter((u) => u.status === 'ONLINE');
  const abertosHoje = lista.filter((c) => ehHoje(c.dataAbertura));
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  $('kpis').innerHTML = [
    kpi({ titulo: 'Chamados em aberto', icone: 'inbox', valor: abertos.length, selo: `${naFila.length} na fila`, barra: pct(abertos.length - naFila.length, abertos.length), href: 'chamados.html' }),
    kpi({ titulo: 'Resolvidos hoje', icone: 'task_alt', valor: fechadosHoje.length, selo: fechadosHoje.length ? `${pct(dentroSla, fechadosHoje.length)}% no SLA` : 'sem fechamentos', barra: pct(dentroSla, fechadosHoje.length), href: 'chamados.html?filtro=finalizados' }),
    kpi({ titulo: 'SLA vencido / críticos', icone: 'warning', valor: vencidos.length, sufixo: ` / ${criticos.length}`, selo: vencidos.length ? 'Ação imediata' : 'Tudo no prazo', barra: pct(vencidos.length, abertos.length), alerta: vencidos.length > 0, href: 'chamados.html?filtro=sla' }),
    kpi({ titulo: 'Técnicos online', icone: 'support_agent', valor: online.length, sufixo: `/${tecnicos.length}`, selo: `${pct(online.length, tecnicos.length)}% da equipe`, barra: pct(online.length, tecnicos.length) }),
    kpi({ titulo: 'Abertos hoje', icone: 'add_circle', valor: abertosHoje.length, selo: `${abertosHoje.filter((c) => isFechado(c.status)).length} já resolvidos`, barra: pct(abertosHoje.filter((c) => isFechado(c.status)).length, abertosHoje.length) }),
  ].join('');
}

// ---------- Gráfico por hora ----------
const tooltip = document.createElement('div');
tooltip.className = 'pointer-events-none absolute z-10 hidden px-3 py-2 rounded-lg bg-inverse-surface text-inverse-on-surface shadow-lg font-body-sm text-body-sm whitespace-nowrap';

function renderFluxo(lista) {
  const desde = Date.now() - periodo * 86400000;
  const noPeriodo = lista.filter((c) => c.dataAbertura && (periodo === 1 ? ehHoje(c.dataAbertura) : c.dataAbertura >= desde));
  const porHora = Array(24).fill(0);
  noPeriodo.forEach((c) => porHora[new Date(c.dataAbertura).getHours()]++);
  const usados = porHora.map((n, i) => (n ? i : null)).filter((i) => i !== null);
  const ini = Math.min(7, ...usados);
  const fim = Math.max(19, ...usados);
  const horas = Array.from({ length: fim - ini + 1 }, (_, i) => ini + i);
  const max = Math.max(1, ...porHora);
  const passo = max <= 4 ? 1 : Math.ceil(max / 4);
  const topo = Math.ceil(max / passo) * passo;
  const pico = porHora.indexOf(Math.max(...porHora));

  document.querySelectorAll('#fluxo-periodo [data-periodo]').forEach((b) => {
    const ativo = Number(b.dataset.periodo) === periodo;
    b.className = `px-space-sm py-1 rounded font-label-sm text-label-sm font-semibold ${ativo ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`;
    b.setAttribute('aria-selected', String(ativo));
  });
  $('fluxo-sub').textContent = periodo === 1 ? 'Chamados abertos hoje, pela hora de abertura' : `Total dos últimos ${periodo} dias, pela hora de abertura`;

  const linhas = Array.from({ length: topo / passo + 1 }, (_, i) => i * passo);
  $('fluxo-chart').innerHTML = noPeriodo.length
    ? `<div class="flex gap-space-sm">
        <div class="relative w-6 h-56 font-label-sm text-label-sm text-outline text-right">${linhas.map((v) => `<span class="absolute right-0 -translate-y-1/2" style="bottom:${(v / topo) * 100}%;transform:translateY(50%)">${v}</span>`).join('')}</div>
        <div class="relative flex-1">
          <div class="absolute inset-0 h-56">${linhas.map((v) => `<div class="absolute left-0 right-0 border-t ${v === 0 ? 'border-outline-variant' : 'border-surface-container-high'}" style="bottom:${(v / topo) * 100}%"></div>`).join('')}</div>
          <div class="relative h-56 flex items-end gap-[2px]">
            ${horas.map((hr) => {
              const n = porHora[hr];
              const alto = (n / topo) * 100;
              return `<button class="flex-1 h-full flex flex-col justify-end items-center group" data-hora="${hr}" data-n="${n}" aria-label="${hr}h: ${n} chamado(s)" type="button">
                ${hr === pico && n ? `<span class="font-label-sm text-label-sm text-on-surface font-semibold mb-1">${n}</span>` : ''}
                <span class="chart-bar w-full max-w-[28px] rounded-t ${n ? '' : 'opacity-0'}" style="height:${alto}%"></span>
              </button>`;
            }).join('')}
          </div>
          <div class="flex gap-[2px] mt-1">${horas.map((hr) => `<span class="flex-1 text-center font-label-sm text-label-sm text-outline">${hr % 2 === 0 ? `${hr}h` : ''}</span>`).join('')}</div>
        </div>
      </div>`
    : emptyState('bar_chart', periodo === 1 ? 'Nenhum chamado aberto hoje.' : 'Nenhum chamado no período.');
  $('fluxo-chart').append(tooltip);

  const fechados = noPeriodo.filter((c) => isFechado(c.status) && getDataFechamento(c));
  const tmaMin = fechados.length ? fechados.reduce((s, c) => s + (getDataFechamento(c) - c.dataAbertura), 0) / fechados.length / 60000 : null;
  const fmtDur = (m) => (m == null ? '—' : m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)}h ${Math.round(m % 60)}min`);
  const resumo = (t, v) => `<div class="flex flex-col"><span class="font-label-sm text-label-sm text-on-surface-variant">${t}</span><span class="font-headline-sm text-headline-sm text-primary font-bold">${v}</span></div>`;
  $('fluxo-resumo').innerHTML =
    resumo('Chamados no período', noPeriodo.length) +
    resumo('Horário de pico', max > 0 && noPeriodo.length ? `${pico}h (${porHora[pico]})` : '—') +
    resumo('Tempo médio de solução', fmtDur(tmaMin));
}

$('fluxo-chart').addEventListener('pointermove', (e) => showTip(e.target.closest('[data-hora]')));
$('fluxo-chart').addEventListener('focusin', (e) => showTip(e.target.closest('[data-hora]')));
$('fluxo-chart').addEventListener('pointerleave', () => tooltip.classList.add('hidden'));
$('fluxo-chart').addEventListener('focusout', () => tooltip.classList.add('hidden'));
function showTip(bar) {
  if (!bar) return tooltip.classList.add('hidden');
  const hr = Number(bar.dataset.hora);
  tooltip.replaceChildren();
  const v = document.createElement('strong');
  v.className = 'block font-label-lg text-label-lg';
  v.textContent = `${bar.dataset.n} chamado(s)`;
  const l = document.createElement('span');
  l.textContent = `${String(hr).padStart(2, '0')}:00 – ${String(hr).padStart(2, '0')}:59`;
  tooltip.append(v, l);
  tooltip.classList.remove('hidden');
  const box = $('fluxo-chart').getBoundingClientRect();
  const b = bar.getBoundingClientRect();
  tooltip.style.left = `${Math.min(box.width - tooltip.offsetWidth, Math.max(0, b.left - box.left + b.width / 2 - tooltip.offsetWidth / 2))}px`;
  tooltip.style.top = '0px';
}

// ---------- Por prédio ----------
function renderPredios(lista) {
  const abertos = lista.filter((c) => !isFechado(c.status));
  const cont = {};
  abertos.forEach((c) => (cont[c.predio || 'Sem prédio'] = (cont[c.predio || 'Sem prédio'] || 0) + 1));
  const linhas = Object.entries(cont).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...linhas.map((l) => l[1]));
  $('por-predio').innerHTML = linhas.length
    ? linhas.map(([p, n]) => `<a class="flex flex-col gap-1 group" href="chamados.html" title="${esc(p)}: ${n} em aberto">
        <div class="flex items-center justify-between font-label-md text-label-md"><span class="text-on-surface group-hover:text-primary truncate">${esc(p)}</span><span class="text-on-surface font-semibold">${n}</span></div>
        <div class="h-2 rounded bg-surface-container overflow-hidden"><div class="chart-bar h-2 rounded" style="width:${(n / max) * 100}%"></div></div>
      </a>`).join('')
    : emptyState('check_circle', 'Nenhum chamado em aberto.');
}

// ---------- Equipe ----------
function renderEquipe(lista) {
  const ordem = { ONLINE: 0, EVENTO: 1, ALMOCO: 2, INDISPONIVEL: 3, OFFLINE: 4 };
  const tecnicos = usuarios.filter((u) => u.perfil === 'TECNICO' && (!$('filtro-predio').value || u.predio === $('filtro-predio').value))
    .sort((a, b) => (ordem[a.status] ?? 9) - (ordem[b.status] ?? 9) || String(a.login).localeCompare(b.login));
  $('equipe-legenda').innerHTML = Object.values(USUARIO_STATUS_UI).map((s) => `<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full ${s.dot}"></span>${s.label}</span>`).join('');
  $('equipe').innerHTML = tecnicos.length
    ? tecnicos.map((t) => {
        const s = usuarioStatusUI(t.status);
        const carga = lista.filter((c) => c.tecnico === t.login && !isFechado(c.status));
        return `<div class="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-sm">
          <div class="flex items-center gap-space-sm">
            <div class="relative">${avatar(t.nomeCompleto || t.login, 'w-10 h-10 text-[13px]')}<span class="absolute bottom-0 right-0 w-3 h-3 rounded-full ${s.dot} ring-2 ring-surface-container-low"></span></div>
            <div class="flex flex-col min-w-0">
              <span class="font-label-lg text-label-lg text-on-surface truncate">${esc(t.nomeCompleto || t.login)}</span>
              <span class="font-body-sm text-body-sm text-on-surface-variant truncate">${t.nivel ? `${esc(t.nivel)} • ` : ''}${esc(t.predio || '—')}</span>
            </div>
          </div>
          <div class="flex items-center justify-between font-label-sm text-label-sm">
            <span class="flex items-center gap-1 text-on-surface-variant"><span class="w-2 h-2 rounded-full ${s.dot}"></span>${s.label}</span>
            <span class="${carga.length ? 'text-primary' : 'text-outline'} font-semibold">${carga.length} chamado${carga.length === 1 ? '' : 's'} em aberto</span>
          </div>
        </div>`;
      }).join('')
    : emptyState('person_off', 'Nenhum técnico cadastrado.');
}

// ---------- Fila prioritária ----------
function renderFila(lista) {
  const abertos = lista.filter((c) => !isFechado(c.status)).sort((a, b) => fracaoSla(b) - fracaoSla(a)).slice(0, 8);
  $('ver-todos').firstChild.textContent = `Ver todos os ${lista.filter((c) => !isFechado(c.status)).length} em aberto `;
  $('fila-prioritaria').innerHTML = abertos.length
    ? abertos.map((c) => {
        const pr = prioridadeUI(c.prioridade);
        const vencido = isSlaVencido(c);
        return `<tr class="hover:bg-surface-container-low">
          <td class="py-space-sm pr-space-md"><div class="flex flex-col"><span class="font-label-md text-label-md text-primary font-bold">${esc(formatProtocolo(c))}</span><span class="font-body-sm text-body-sm text-on-surface line-clamp-1">${esc(c.titulo || '')}</span></div></td>
          <td class="py-space-sm pr-space-md"><span class="px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold inline-flex items-center gap-1 ${pr.cls}"><span class="w-1.5 h-1.5 rounded-full ${pr.dot}"></span>${pr.label}</span></td>
          <td class="py-space-sm pr-space-md font-body-sm text-body-sm text-on-surface-variant">${esc([c.sala, c.predio].filter(Boolean).join(' • '))}</td>
          <td class="py-space-sm pr-space-md font-body-sm text-body-sm ${c.tecnico ? 'text-on-surface' : 'text-outline italic'}">${esc(c.tecnico || 'Não atribuído')}</td>
          <td class="py-space-sm pr-space-md font-label-sm text-label-sm font-semibold ${vencido ? 'text-error' : 'text-on-surface-variant'}" title="Aberto em ${dataHora(c.dataAbertura)}">${esc(slaTexto(c))}</td>
          <td class="py-space-sm text-right"><a class="inline-flex px-3 py-1.5 rounded-lg ${vencido ? 'bg-primary-container text-on-primary hover:bg-primary' : 'bg-surface-container-high text-on-surface hover:bg-surface-variant'} font-label-sm text-label-sm font-semibold" href="chamados.html?id=${encodeURIComponent(c.id)}">${c.tecnico ? 'Abrir' : 'Despachar'}</a></td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="6">${emptyState('celebration', 'Nenhum chamado em aberto. 🎉')}</td></tr>`;
}

function render() {
  if (!chamados) return;
  const lista = filtrados();
  renderKpis(lista);
  renderFluxo(lista);
  renderPredios(lista);
  renderEquipe(lista);
  renderFila(lista);
}

subscribeChamados((l) => { chamados = l; render(); }, (err) => ($('kpis').innerHTML = `<div class="sm:col-span-2 lg:col-span-5">${erroFirestore(err)}</div>`));
subscribeUsuarios((l) => { usuarios = l; render(); });
$('filtro-predio').addEventListener('change', render);
$('fluxo-periodo').addEventListener('click', (e) => {
  const b = e.target.closest('[data-periodo]');
  if (!b) return;
  periodo = Number(b.dataset.periodo);
  render();
});
setInterval(render, 60000);

// ---------- Exportar boletim ----------
$('btn-exportar').addEventListener('click', () => {
  const lista = filtrados();
  const cab = ['Protocolo', 'Título', 'Status', 'Prioridade', 'Prédio', 'Sala', 'Solicitante', 'Técnico', 'Abertura', 'Fechamento', 'SLA'];
  const linhas = lista.map((c) => [formatProtocolo(c), c.titulo, statusUI(c.status).label, prioridadeUI(c.prioridade).label, c.predio, c.sala, c.solicitante, c.tecnico, dataHora(c.dataAbertura), dataHora(getDataFechamento(c)), isFechado(c.status) ? 'Concluído' : slaTexto(c)]);
  const csv = [cab, ...linhas].map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `boletim-chamados-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});
