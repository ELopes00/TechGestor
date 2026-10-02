// Eventos (coleção "eventos"): cronograma, cadastro, status, conversa e conclusão.
import { requireSession } from '../lib/session.js';
import { atualizarEvento, salvarEvento, salvarLog, subscribeEventos, subscribeUsuarios } from '../lib/data.js';
import { dataHora, esc, getStatusCategoria, hora, isFechado, statusUI } from '../lib/format.js';
import { avatar, BTN, emptyState, erroFirestore, field, INPUT, openDialog, options, skeletonRows, toast } from '../lib/ui.js';

const user = await requireSession();
const $ = (id) => document.getElementById(id);
const STATUS = ['Aguardando atendimento', 'Em andamento', 'Em separação de equipamentos', 'Instalado'];
let eventos = null;
let usuarios = [];

$('kpis').innerHTML = skeletonRows(4, 'h-24');
$('tabela').innerHTML = `<tr><td colspan="7" class="p-space-lg">${skeletonRows(4, 'h-12')}</td></tr>`;

const dataBR = (iso) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).split('-').reverse().join('/') : iso || '—');
const tecnicos = () => usuarios.filter((u) => u.perfil === 'TECNICO').sort((a, b) => a.login.localeCompare(b.login));
const tile = (t, ic, v, s) => `<div class="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-1"><div class="flex items-center justify-between"><span class="font-label-sm text-label-sm text-on-surface-variant">${t}</span><span class="material-symbols-outlined text-[20px] text-secondary">${ic}</span></div><span class="font-display-lg-mobile text-display-lg-mobile text-primary">${v}</span><span class="font-body-sm text-body-sm text-on-surface-variant">${s}</span></div>`;

function render() {
  if (!eventos) return;
  const hojeIso = new Date().toISOString().slice(0, 10);
  const abertos = eventos.filter((e) => !isFechado(e.status));
  const mes = new Date(); mes.setDate(1); mes.setHours(0, 0, 0, 0);
  $('kpis').innerHTML = [
    tile('Em aberto', 'event_upcoming', abertos.length, `${abertos.filter((e) => getStatusCategoria(e.status) === 'ABERTO').length} sem início`),
    tile('Próximos 7 dias', 'date_range', abertos.filter((e) => e.dataEvento && e.dataEvento >= hojeIso && e.dataEvento <= new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)).length, 'Pela data do evento'),
    tile('Externos em aberto', 'directions_car', abertos.filter((e) => e.tipo === 'EXTERNO').length, 'Fora dos prédios do TJRR'),
    tile('Finalizados no mês', 'task_alt', eventos.filter((e) => isFechado(e.status) && (e.data || 0) >= mes.getTime()).length, 'Cadastrados neste mês'),
  ].join('');

  const tecSel = $('f-tecnico').value;
  $('f-tecnico').innerHTML = options([['', 'Todos os técnicos'], ...tecnicos().map((t) => [t.login, t.nomeCompleto || t.login])], tecSel);

  const termo = $('f-busca').value.trim().toLowerCase();
  const sit = $('f-situacao').value;
  const lista = eventos.filter((e) =>
    (!$('f-tipo').value || e.tipo === $('f-tipo').value) &&
    (!sit || (sit === 'abertos' ? !isFechado(e.status) : isFechado(e.status))) &&
    (!tecSel || e.tecnico === tecSel) &&
    (!termo || [e.nome, e.local, e.cliente, e.endereco, e.solicitante, e.tecnico, e.material].some((v) => String(v || '').toLowerCase().includes(termo))))
    .sort((a, b) => String(a.dataEvento || '9999').localeCompare(String(b.dataEvento || '9999')));
  $('contagem').textContent = `${lista.length} evento(s)`;
  $('tabela').innerHTML = lista.length
    ? lista.map((e) => {
        const st = statusUI(e.status);
        return `<tr class="hover:bg-surface-container-low align-top">
          <td class="px-space-lg py-space-sm"><button class="flex flex-col items-start text-left gap-0.5" data-ver="${esc(e.id)}" type="button">
            <span class="px-2 py-0.5 rounded font-label-sm text-label-sm font-bold ${e.tipo === 'EXTERNO' ? 'bg-[#fffbeb] text-[#b45309] dark:bg-amber-500/15 dark:text-amber-300' : 'bg-secondary-fixed text-on-secondary-fixed-variant'}">${esc(e.tipo || 'INTERNO')}</span>
            <span class="font-label-lg text-label-lg text-primary hover:underline">${esc(e.nome || 'Sem nome')}</span>
            <span class="font-body-sm text-body-sm text-on-surface-variant">${esc(e.solicitante || '')}${e.contato ? ` • ${esc(e.contato)}` : ''}</span></button></td>
          <td class="px-space-md py-space-sm font-body-sm text-body-sm"><div class="flex items-center gap-1 text-on-surface"><span class="material-symbols-outlined text-[16px] text-secondary">celebration</span>${dataBR(e.dataEvento)}</div><div class="flex items-center gap-1 text-on-surface-variant"><span class="material-symbols-outlined text-[16px]">build</span>${esc(dataBR(e.dataInstalacao))}</div></td>
          <td class="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface">${esc(e.tipo === 'EXTERNO' ? [e.cliente, e.endereco].filter(Boolean).join(' • ') : [e.local, e.ramal && `Ramal ${e.ramal}`].filter(Boolean).join(' • ')) || '—'}</td>
          <td class="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant max-w-[14rem]"><span class="line-clamp-2">${esc(e.material || '—')}</span></td>
          <td class="px-space-md py-space-sm">${e.tecnico ? `<div class="flex items-center gap-space-xs">${avatar(e.tecnico, 'w-7 h-7 text-[11px]')}<span class="font-label-md text-label-md">${esc(e.tecnico)}</span></div>` : '<span class="font-body-sm text-body-sm text-outline italic">Não atribuído</span>'}</td>
          <td class="px-space-md py-space-sm"><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${st.cls}"><span class="material-symbols-outlined text-[14px]">${st.icon}</span>${esc(st.label)}</span></td>
          <td class="px-space-lg py-space-sm"><div class="flex justify-end gap-1">
            <button class="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high" data-ver="${esc(e.id)}" title="Detalhes e conversa" type="button"><span class="material-symbols-outlined text-[20px]">forum</span></button>
            ${isFechado(e.status) ? '' : `<button class="p-1.5 rounded-lg text-on-surface-variant hover:text-on-tertiary-container hover:bg-surface-container-high" data-concluir="${esc(e.id)}" title="Concluir" type="button"><span class="material-symbols-outlined text-[20px]">task_alt</span></button>`}
          </div></td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="7">${emptyState('event_busy', 'Nenhum evento neste filtro.')}</td></tr>`;
}

// ---------- Novo evento ----------
function novoEvento() {
  const { el, close } = openDialog({
    title: 'Novo evento', icon: 'add_circle', size: 'max-w-2xl',
    body: `<form class="grid grid-cols-1 sm:grid-cols-2 gap-space-md" novalidate>
      <div class="sm:col-span-2">${field('Nome do evento *', `<input class="${INPUT}" name="nome" required/>`)}</div>
      ${field('Tipo', `<select class="${INPUT}" name="tipo"><option value="INTERNO">Interno (prédio do TJRR)</option><option value="EXTERNO">Externo</option></select>`)}
      ${field('Técnico', `<select class="${INPUT}" name="tecnico"><option value="">— Não atribuído —</option>${tecnicos().map((t) => `<option value="${esc(t.login)}">${esc(t.nomeCompleto || t.login)}</option>`).join('')}</select>`)}
      <div class="contents" data-interno>${field('Local / sala', `<input class="${INPUT}" name="local"/>`)}${field('Ramal', `<input class="${INPUT}" name="ramal"/>`)}</div>
      <div class="hidden contents" data-externo>${field('Cliente / órgão', `<input class="${INPUT}" name="cliente"/>`)}${field('Endereço', `<input class="${INPUT}" name="endereco"/>`)}</div>
      ${field('Solicitante *', `<input class="${INPUT}" name="solicitante" required/>`)}
      ${field('Contato', `<input class="${INPUT}" name="contato" placeholder="Telefone ou ramal"/>`)}
      ${field('Data da instalação', `<input class="${INPUT}" name="dataInstalacao" type="date"/>`)}
      ${field('Data do evento *', `<input class="${INPUT}" name="dataEvento" type="date" required/>`)}
      <div class="sm:col-span-2">${field('Material necessário', `<textarea class="${INPUT} h-20 py-2" name="material" placeholder="Ex.: 2 microfones sem fio, projetor, notebook"></textarea>`)}</div>
      <p class="sm:col-span-2 hidden text-error font-body-sm text-body-sm" data-erro></p>
      <div class="sm:col-span-2 flex justify-end gap-space-sm"><button class="${BTN.ghost}" data-close type="button">Cancelar</button><button class="${BTN.primary}" type="submit">Cadastrar evento</button></div>
    </form>`,
  });
  const form = el.querySelector('form');
  form.tipo.addEventListener('change', () => {
    const ext = form.tipo.value === 'EXTERNO';
    form.querySelector('[data-interno]').classList.toggle('hidden', ext);
    form.querySelector('[data-externo]').classList.toggle('hidden', !ext);
  });
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const erro = form.querySelector('[data-erro]');
    if (!f.nome.trim() || !f.solicitante.trim() || !f.dataEvento) {
      erro.textContent = 'Preencha nome, solicitante e data do evento.';
      return erro.classList.remove('hidden');
    }
    const interno = f.tipo === 'INTERNO';
    try {
      await salvarEvento({
        nome: f.nome.trim(), tipo: f.tipo, tecnico: f.tecnico, status: f.tecnico ? 'Em andamento' : 'Aguardando atendimento',
        local: interno ? f.local.trim() : null, ramal: interno ? f.ramal.trim() : null,
        cliente: interno ? null : f.cliente.trim(), endereco: interno ? null : f.endereco.trim(),
        solicitante: f.solicitante.trim(), contato: f.contato.trim(), material: f.material.trim(),
        dataInstalacao: f.dataInstalacao, dataEvento: f.dataEvento, historico: [], criadoPor: user.login,
      });
      salvarLog(`📅 CRIOU EVENTO ${f.tipo}: ${f.nome.trim()}`, user.login);
      close();
      toast('Evento cadastrado.');
    } catch (err) {
      console.error(err);
      erro.textContent = 'Falha ao salvar o evento.';
      erro.classList.remove('hidden');
    }
  });
}

// ---------- Detalhes, status e conversa ----------
function verEvento(id) {
  const { el, close } = openDialog({ title: 'Evento', icon: 'event', size: 'max-w-3xl', body: '<div data-corpo></div>' });
  const corpo = el.querySelector('[data-corpo]');
  const desenhar = () => {
    const e = eventos.find((x) => x.id === id);
    if (!e || !el.isConnected) return;
    el.querySelector('h2').textContent = e.nome || 'Evento';
    const fechado = isFechado(e.status);
    corpo.innerHTML = `<div class="flex flex-col gap-space-md">
      <dl class="grid grid-cols-2 md:grid-cols-3 gap-space-sm font-body-sm text-body-sm">
        ${[['Tipo', e.tipo], ['Status', statusUI(e.status).label], ['Técnico', e.tecnico || 'Não atribuído'], ['Data do evento', dataBR(e.dataEvento)], ['Instalação', dataBR(e.dataInstalacao)], ['Solicitante', `${e.solicitante || ''} ${e.contato ? `(${e.contato})` : ''}`], [e.tipo === 'EXTERNO' ? 'Cliente / endereço' : 'Local / ramal', e.tipo === 'EXTERNO' ? [e.cliente, e.endereco].filter(Boolean).join(' • ') : [e.local, e.ramal].filter(Boolean).join(' • ')], ['Material', e.material], ...(e.notas ? [['Notas de conclusão', e.notas]] : []), ...(e.km ? [['Deslocamento', `${e.km} km • ${e.transporte || ''}`]] : [])]
          .map(([k, v]) => `<div class="p-space-sm rounded-lg bg-surface-container-low"><dt class="font-label-sm text-label-sm text-on-surface-variant uppercase">${k}</dt><dd class="text-on-surface whitespace-pre-line">${esc(v || '—')}</dd></div>`).join('')}
      </dl>
      ${fechado ? '' : `<div class="flex flex-wrap items-end gap-space-sm p-space-sm rounded-lg bg-surface-container-low">
        <label class="flex-1 min-w-[12rem]"><span class="block font-label-sm text-label-sm mb-1">Status</span><select class="${INPUT}" data-novo-status>${options(STATUS, e.status)}</select></label>
        <label class="flex-1 min-w-[12rem]"><span class="block font-label-sm text-label-sm mb-1">Técnico</span><select class="${INPUT}" data-novo-tecnico><option value="">— Não atribuído —</option>${tecnicos().map((t) => `<option value="${esc(t.login)}" ${t.login === e.tecnico ? 'selected' : ''}>${esc(t.nomeCompleto || t.login)}</option>`).join('')}</select></label>
        <button class="${BTN.primary}" data-salvar type="button">Salvar</button>
      </div>`}
      <div class="flex flex-col gap-space-xs">
        <h3 class="font-headline-sm text-headline-sm text-primary">Histórico</h3>
        <div class="flex flex-col gap-1 max-h-64 overflow-y-auto">${(e.historico || []).length ? [...e.historico].reverse().map((m) => `<div class="px-space-sm py-1.5 rounded-lg ${m.user === 'SISTEMA' ? 'bg-surface-container text-on-surface-variant' : 'bg-surface-container-low text-on-surface'} font-body-sm text-body-sm whitespace-pre-line"><strong>${esc(m.user)}</strong> <span class="text-outline">${hora(m.time)} ${dataHora(m.time).split(' ')[0]}</span><br/>${esc(m.texto)}</div>`).join('') : emptyState('chat', 'Sem mensagens.')}</div>
        <form class="flex gap-space-xs" data-msg><input class="${INPUT}" name="texto" placeholder="Registrar andamento..."/><button class="${BTN.secondary}" type="submit"><span class="material-symbols-outlined text-[18px]">send</span></button></form>
      </div>
    </div>`;
  };
  desenhar();
  el._redraw = desenhar;
  abertos.add(el);
  el.addEventListener('click', async (ev) => {
    if (!ev.target.closest('[data-salvar]')) return;
    const e = eventos.find((x) => x.id === id);
    const status = el.querySelector('[data-novo-status]').value;
    const tecnico = el.querySelector('[data-novo-tecnico]').value;
    const msgs = [];
    if (status !== e.status) msgs.push(`🔄 Status atualizado: ${status}`);
    if (tecnico !== (e.tecnico || '')) msgs.push(`🔄 Transferido para ${tecnico || 'fila'}`);
    if (!msgs.length) return;
    try {
      await atualizarEvento(id, { status, tecnico, historico: [...msgs.map((texto) => ({ user: 'SISTEMA', texto, time: Date.now() })), ...(e.historico || [])] });
      salvarLog(`🔄 ATUALIZOU EVENTO ${e.nome}: ${msgs.join(' / ')}`, user.login);
      toast('Evento atualizado.');
    } catch (err) { console.error(err); toast('Falha ao salvar.', 'erro'); }
  });
  el.addEventListener('submit', async (ev) => {
    if (!ev.target.matches('[data-msg]')) return;
    ev.preventDefault();
    const texto = ev.target.texto.value.trim();
    if (!texto) return;
    const e = eventos.find((x) => x.id === id);
    try {
      await atualizarEvento(id, { historico: [{ user: user.login, texto, time: Date.now() }, ...(e.historico || [])] });
    } catch (err) { console.error(err); toast('Falha ao enviar.', 'erro'); }
  });
  return close;
}
const abertos = new Set();

function concluir(id) {
  const e = eventos.find((x) => x.id === id);
  const externo = e.tipo === 'EXTERNO';
  const { el, close } = openDialog({
    title: 'Concluir evento', icon: 'task_alt',
    body: `<form class="flex flex-col gap-space-md" novalidate>
      ${field('O que foi feito *', `<textarea class="${INPUT} h-24 py-2" name="notas" required></textarea>`)}
      ${externo ? `<div class="grid grid-cols-2 gap-space-md">${field('Quilometragem *', `<input class="${INPUT}" inputmode="decimal" name="km" placeholder="Ex.: 10,5"/>`)}${field('Transporte', `<select class="${INPUT}" name="transporte">${options(['CARRO EMPRESA', 'CARRO PRÓPRIO', 'UBER/TÁXI', 'OUTRO'], 'CARRO EMPRESA')}</select>`)}</div>` : ''}
      <div class="flex justify-end gap-space-sm"><button class="${BTN.ghost}" data-close type="button">Cancelar</button><button class="${BTN.primary}" type="submit">Concluir</button></div></form>`,
  });
  el.querySelector('form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = Object.fromEntries(new FormData(ev.target));
    if (!f.notas.trim()) return toast('Descreva o que foi feito.', 'erro');
    const km = externo ? parseFloat(String(f.km).replace(',', '.')) : null;
    if (externo && Number.isNaN(km)) return toast('Informe uma quilometragem válida.', 'erro');
    try {
      await atualizarEvento(id, {
        status: 'finalizado', notas: f.notas.trim(), dataFechamento: Date.now(),
        ...(externo && { km, transporte: f.transporte, gps: null }),
        historico: [{ user: 'SISTEMA', texto: `🏁 EVENTO FINALIZADO POR ${user.login}.\n📝 SOLUÇÃO: ${f.notas.trim()}`, time: Date.now() }, ...(e.historico || [])],
      });
      salvarLog(`✅ CONCLUIU EVENTO ${e.tipo}: ${e.nome}`, user.login);
      close();
      toast('Evento concluído.');
    } catch (err) { console.error(err); toast('Falha ao concluir.', 'erro'); }
  });
}

subscribeEventos((l) => {
  eventos = l;
  render();
  abertos.forEach((d) => (d.isConnected ? d._redraw() : abertos.delete(d)));
}, (err) => ($('tabela').innerHTML = `<tr><td colspan="7">${erroFirestore(err)}</td></tr>`));
subscribeUsuarios((l) => { usuarios = l; render(); });
['f-busca', 'f-tipo', 'f-situacao', 'f-tecnico'].forEach((id) => $(id).addEventListener('input', render));
$('btn-novo').addEventListener('click', novoEvento);
$('tabela').addEventListener('click', (ev) => {
  const v = ev.target.closest('[data-ver]');
  const c = ev.target.closest('[data-concluir]');
  if (v) verEvento(v.dataset.ver);
  if (c) concluir(c.dataset.concluir);
});
