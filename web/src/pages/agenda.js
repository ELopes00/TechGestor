// Agenda: calendário mensal com agendamentos (coleção "agendamentos") e eventos.
import { requireSession } from '../lib/session.js';
import { deletarAgendamento, salvarAgendamento, salvarLog, subscribeAgendamentos, subscribeEventos, subscribeUsuarios } from '../lib/data.js';
import { esc, isFechado } from '../lib/format.js';
import { avatar, BTN, confirmar, emptyState, field, INPUT, openDialog, skeletonRows, toast } from '../lib/ui.js';

const user = await requireSession();
const $ = (id) => document.getElementById(id);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hojeIso = iso(new Date());
const inicial = (t) => t.charAt(0).toUpperCase() + t.slice(1);
let mes = new Date(); mes.setDate(1);
let diaSel = hojeIso;
let agendamentos = null;
let eventos = [];
let usuarios = [];

$('calendario').innerHTML = skeletonRows(5, 'h-20 col-span-7');

const doDia = (d) => [
  ...(agendamentos || []).filter((a) => a.data === d).map((a) => ({ ...a, _tipo: 'servico' })).sort((a, b) => String(a.hora).localeCompare(String(b.hora))),
  ...eventos.filter((e) => e.dataEvento?.slice(0, 10) === d && !isFechado(e.status)).map((e) => ({ ...e, _tipo: 'evento' })),
];

function render() {
  if (!agendamentos) return;
  $('mes-titulo').textContent = inicial(mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
  const inicio = new Date(mes); inicio.setDate(1 - mes.getDay());
  const celulas = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicio); d.setDate(inicio.getDate() + i);
    if (i >= 35 && d.getMonth() !== mes.getMonth()) break;
    const k = iso(d);
    const itens = doDia(k);
    const fora = d.getMonth() !== mes.getMonth();
    const fimSemana = d.getDay() === 0 || d.getDay() === 6;
    celulas.push(`<button class="min-h-[5.5rem] p-1.5 rounded-lg text-left flex flex-col gap-1 border transition-colors ${k === diaSel ? 'border-secondary ring-2 ring-secondary/30' : 'border-transparent'} ${fora ? 'opacity-40' : ''} ${fimSemana ? 'bg-surface-container-low' : 'bg-surface'} hover:bg-surface-container" data-dia="${k}" type="button" aria-label="${d.toLocaleDateString('pt-BR')}: ${itens.length} item(ns)">
      <span class="font-label-md text-label-md ${k === hojeIso ? 'w-6 h-6 rounded-full bg-primary-container text-on-primary flex items-center justify-center' : 'text-on-surface'}">${d.getDate()}</span>
      ${itens.slice(0, 2).map((it) => `<span class="truncate px-1 rounded text-[11px] leading-4 font-semibold ${it._tipo === 'evento' ? 'bg-amber-500/15 text-[#b45309] dark:text-amber-300' : 'bg-secondary/15 text-secondary'}">${it._tipo === 'evento' ? '' : `${esc(it.hora || '')} `}${esc(it._tipo === 'evento' ? it.nome : it.servico)}</span>`).join('')}
      ${itens.length > 2 ? `<span class="text-[11px] text-on-surface-variant">+${itens.length - 2} mais</span>` : ''}
    </button>`);
  }
  $('calendario').innerHTML = celulas.join('');

  const dSel = new Date(`${diaSel}T12:00:00`);
  $('dia-titulo').textContent = inicial(dSel.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }));
  const itens = doDia(diaSel);
  $('dia-contagem').textContent = `${itens.length} item(ns)`;
  $('dia-lista').innerHTML = itens.length
    ? itens.map((it) => it._tipo === 'evento'
      ? `<a class="flex flex-col gap-1 p-space-sm rounded-lg bg-amber-500/10 border-l-4 border-amber-500" href="eventos.html">
          <span class="font-label-sm text-label-sm text-[#b45309] dark:text-amber-300 uppercase">Evento ${esc(it.tipo || '')}</span>
          <span class="font-label-lg text-label-lg text-on-surface">${esc(it.nome)}</span>
          <span class="font-body-sm text-body-sm text-on-surface-variant">${esc(it.local || it.cliente || '')}${it.tecnico ? ` • ${esc(it.tecnico)}` : ''}</span></a>`
      : `<div class="flex flex-col gap-space-xs p-space-sm rounded-lg bg-surface-container-low border-l-4 border-secondary">
          <div class="flex items-center justify-between gap-space-sm"><span class="font-label-lg text-label-lg text-primary">${esc(it.hora || '--:--')}</span><span class="font-label-sm text-label-sm text-on-surface-variant">por ${esc(it.marcadoPor || '—')}</span></div>
          <span class="font-body-md text-body-md text-on-surface">${esc(it.servico)}</span>
          <div class="flex items-center justify-between gap-space-sm">
            <span class="flex items-center gap-space-xs font-label-md text-label-md">${avatar(it.tecnico, 'w-6 h-6 text-[10px]')}${esc(it.tecnico || '—')}</span>
            <div class="flex gap-1">
              <button class="px-2 py-1 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm" data-concluir="${esc(it.id)}" type="button">Concluir</button>
              <button class="px-2 py-1 rounded-lg bg-surface-container text-on-surface-variant hover:text-error font-label-sm text-label-sm" data-cancelar="${esc(it.id)}" type="button">Cancelar</button>
            </div>
          </div>
        </div>`).join('')
    : emptyState('event_available', 'Nada agendado neste dia.');
}

subscribeAgendamentos((l) => { agendamentos = l; render(); }, () => ($('calendario').innerHTML = `<div class="col-span-7">${emptyState('cloud_off', 'Não foi possível carregar a agenda.')}</div>`));
subscribeEventos((l) => { eventos = l; render(); });
subscribeUsuarios((l) => (usuarios = l));

$('calendario').addEventListener('click', (e) => {
  const b = e.target.closest('[data-dia]');
  if (!b) return;
  diaSel = b.dataset.dia;
  const d = new Date(`${diaSel}T12:00:00`);
  if (d.getMonth() !== mes.getMonth()) { mes = new Date(d.getFullYear(), d.getMonth(), 1); }
  render();
});
$('mes-ant').addEventListener('click', () => { mes = new Date(mes.getFullYear(), mes.getMonth() - 1, 1); render(); });
$('mes-prox').addEventListener('click', () => { mes = new Date(mes.getFullYear(), mes.getMonth() + 1, 1); render(); });
$('mes-hoje').addEventListener('click', () => { mes = new Date(); mes.setDate(1); diaSel = hojeIso; render(); });

$('dia-lista').addEventListener('click', async (e) => {
  const c = e.target.closest('[data-concluir]');
  const x = e.target.closest('[data-cancelar]');
  if (!c && !x) return;
  const concluir = !!c;
  // Mesmo comportamento do app: concluir ou cancelar remove o agendamento e registra no log.
  const ok = await confirmar({
    title: concluir ? 'Concluir serviço' : 'Cancelar agendamento',
    message: concluir ? 'Marcar este serviço como concluído? Ele sai da agenda e fica registrado na auditoria.' : 'Cancelar e apagar este agendamento?',
    okLabel: concluir ? 'Concluir' : 'Cancelar agendamento',
    danger: !concluir,
  });
  if (!ok) return;
  const id = (c || x).dataset[concluir ? 'concluir' : 'cancelar'];
  const a = agendamentos.find((y) => y.id === id);
  try {
    await deletarAgendamento(id);
    salvarLog(`${concluir ? 'CONCLUIU' : 'CANCELOU'} AGENDAMENTO: ${a?.servico || ''} (${a?.data || ''} ${a?.hora || ''}, ${a?.tecnico || ''})`, user.login);
    toast(concluir ? 'Serviço concluído.' : 'Agendamento cancelado.');
  } catch (err) { console.error(err); toast('Falha ao processar.', 'erro'); }
});

$('btn-novo').addEventListener('click', () => {
  const tecnicos = usuarios.filter((u) => u.perfil === 'TECNICO').sort((a, b) => a.login.localeCompare(b.login));
  const { el, close } = openDialog({
    title: 'Agendar serviço', icon: 'event_available',
    body: `<form class="grid grid-cols-2 gap-space-md" novalidate>
      <div class="col-span-2">${field('Serviço *', `<input class="${INPUT}" name="servico" placeholder="Ex.: Formatação do computador do gabinete 3" required/>`)}</div>
      ${field('Data *', `<input class="${INPUT}" name="data" type="date" value="${diaSel}" required/>`)}
      ${field('Hora *', `<input class="${INPUT}" name="hora" type="time" value="08:00" required/>`)}
      <div class="col-span-2">${field('Técnico *', `<select class="${INPUT}" name="tecnico" required><option value="">— Selecione —</option>${tecnicos.map((t) => `<option value="${esc(t.login)}">${esc(t.nomeCompleto || t.login)} • ${esc(t.predio || '')}</option>`).join('')}</select>`)}</div>
      <div class="col-span-2 flex justify-end gap-space-sm"><button class="${BTN.ghost}" data-close type="button">Cancelar</button><button class="${BTN.primary}" type="submit">Agendar</button></div>
    </form>`,
  });
  el.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    if (!f.servico.trim() || !f.data || !f.hora || !f.tecnico) return toast('Preencha serviço, data, hora e técnico.', 'erro');
    try {
      await salvarAgendamento({ data: f.data, servico: f.servico.trim(), hora: f.hora, tecnico: f.tecnico, status: 'PENDENTE', marcadoPor: user.login });
      salvarLog(`CRIOU AGENDAMENTO PARA: ${f.tecnico}`, user.login);
      close();
      diaSel = f.data;
      const d = new Date(`${f.data}T12:00:00`);
      mes = new Date(d.getFullYear(), d.getMonth(), 1);
      render();
      toast('Serviço agendado.');
    } catch (err) { console.error(err); toast('Falha ao agendar.', 'erro'); }
  });
});
