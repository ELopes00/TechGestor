// Fila de chamados em tempo real + detalhe do chamado selecionado.
import { requireSession } from '../lib/session.js';
import { salvarChamado, salvarLog, subscribeChamados, subscribeUsuarios } from '../lib/data.js';
import {
  CHECKLIST_PADRAO, esc, formatProtocolo, gerarProtocolo, getStatusCategoria, isFechado, isSlaVencido, PRIORIDADES,
  prioridadeUI, SETORES, slaTexto, statusUI, tempoRelativo,
} from '../lib/format.js';
import { avatar, BTN, emptyState, erroFirestore, field, INPUT, openDialog, options, skeletonRows, toast } from '../lib/ui.js';
import { chamadoDetalhe } from '../components/chamado-detalhe.js';

const user = await requireSession();

const listaEl = document.getElementById('tickets-queue-list');
const resumoEl = document.getElementById('fila-resumo');
const tabsEl = document.getElementById('status-tabs');
const busca = document.getElementById('ticket-search');
const filtroPredio = document.getElementById('filtro-predio');
const filtroPrioridade = document.getElementById('filtro-prioridade');

filtroPredio.innerHTML = options([['', 'Todos'], ...SETORES], '');
filtroPrioridade.innerHTML = options([['', 'Todas'], ...PRIORIDADES.map((p) => [p, prioridadeUI(p).label])], '');

const params = new URLSearchParams(location.search);
let chamados = null;
let usuarios = [];
let aba = params.get('filtro') || 'abertos';
let selecionado = params.get('id');

const ABAS = [
  ['abertos', 'Em aberto', (c) => !isFechado(c.status)],
  ['meus', 'Meus', (c) => c.tecnico === user.login && !isFechado(c.status)],
  ['fila', 'Na fila', (c) => getStatusCategoria(c.status) === 'ABERTO'],
  ['andamento', 'Em atendimento', (c) => getStatusCategoria(c.status) === 'ANDAMENTO'],
  ['sla', 'SLA vencido', (c) => !isFechado(c.status) && isSlaVencido(c)],
  ['finalizados', 'Finalizados', (c) => isFechado(c.status)],
  ['todos', 'Todos', () => true],
];

const detalhe = chamadoDetalhe(document.getElementById('ticket-detail'), { user, getUsers: () => usuarios, full: false });
listaEl.innerHTML = skeletonRows(4, 'h-28');
detalhe.render(null);

function filtrados() {
  const termo = busca.value.trim().toLowerCase();
  const filtroAba = ABAS.find((a) => a[0] === aba)?.[2] ?? (() => true);
  return chamados.filter((c) =>
    filtroAba(c) &&
    (!filtroPredio.value || c.predio === filtroPredio.value) &&
    (!filtroPrioridade.value || (c.prioridade || 'BAIXA') === filtroPrioridade.value) &&
    (!termo || [formatProtocolo(c), c.titulo, c.solicitante, c.sala, c.tecnico, c.predio, c.descricao].some((v) => String(v || '').toLowerCase().includes(termo))));
}

function renderTabs() {
  tabsEl.innerHTML = ABAS.map(([id, label, fn]) => {
    const n = chamados ? chamados.filter(fn).length : '';
    const ativo = id === aba;
    const destaque = (id === 'sla' || id === 'fila') && n > 0;
    return `<button class="px-space-sm py-1 rounded font-label-sm text-label-sm font-semibold ${ativo ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}" data-aba="${id}" role="tab" aria-selected="${ativo}" type="button">${label} <span class="ml-1 ${destaque ? 'px-1.5 rounded-full bg-error-container text-on-error-container' : 'text-outline'}">${n}</span></button>`;
  }).join('');
}

function cardHtml(c) {
  const fechado = isFechado(c.status);
  const vencido = !fechado && isSlaVencido(c);
  const pr = prioridadeUI(c.prioridade);
  const st = statusUI(c.status);
  const ativo = c.id === selecionado;
  return `<button class="text-left w-full p-space-md rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all flex flex-col gap-space-xs border-l-4 ${ativo ? 'ring-2 ring-secondary/50' : ''} ${vencido || c.prioridade === 'CRITICA' ? 'border-error' : c.prioridade === 'ALTA' ? 'border-amber-500' : fechado ? 'border-on-tertiary-container' : 'border-transparent'}" data-id="${esc(c.id)}" type="button">
    <div class="flex items-start justify-between gap-space-sm w-full">
      <div class="flex items-center gap-space-xs flex-wrap">
        <span class="px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold flex items-center gap-1 ${pr.cls}"><span class="w-1.5 h-1.5 rounded-full ${pr.dot} ${c.prioridade === 'CRITICA' && !fechado ? 'animate-ping' : ''}"></span>${pr.label}</span>
        <span class="font-label-md text-label-md text-primary font-bold">${esc(formatProtocolo(c))}</span>
      </div>
      <span class="flex items-center gap-1 font-label-sm text-label-sm font-semibold shrink-0 ${fechado ? 'text-on-tertiary-container' : vencido ? 'text-error' : 'text-on-surface-variant'}">
        <span class="material-symbols-outlined text-[16px]">${fechado ? 'check_circle' : 'timer'}</span>${fechado ? 'Concluído' : esc(slaTexto(c))}
      </span>
    </div>
    <h3 class="font-headline-sm text-headline-sm text-on-surface line-clamp-1">${esc(c.titulo || 'Sem título')}</h3>
    <p class="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">${esc(c.descricao || '')}</p>
    <div class="flex items-center justify-between gap-space-sm w-full mt-1 bg-surface-container-low px-space-sm py-1.5 rounded-lg">
      <div class="flex items-center gap-space-xs min-w-0">
        <span class="material-symbols-outlined text-[18px] text-secondary">person</span>
        <div class="flex flex-col min-w-0">
          <span class="font-label-sm text-label-sm text-on-surface font-semibold truncate">${esc(c.solicitante || '—')}</span>
          <span class="font-body-sm text-[11px] text-on-surface-variant truncate">${esc([c.sala, c.predio].filter(Boolean).join(' • '))} • ${tempoRelativo(c.dataAbertura)}</span>
        </div>
      </div>
      <div class="flex items-center gap-space-xs shrink-0">
        <span class="font-label-sm text-label-sm hidden sm:inline ${c.tecnico ? 'text-on-surface-variant' : 'text-outline italic'}">${esc(c.tecnico || 'Não atribuído')}</span>
        ${c.tecnico ? avatar(c.tecnico, 'w-7 h-7 text-[11px]') : `<span class="px-2 py-0.5 rounded-full font-label-sm text-label-sm ${st.cls}">${esc(st.label)}</span>`}
      </div>
    </div>
  </button>`;
}

function render() {
  if (!chamados) return;
  renderTabs();
  const lista = filtrados();
  const naFila = chamados.filter((c) => getStatusCategoria(c.status) === 'ABERTO').length;
  resumoEl.textContent = `${naFila} pendente${naFila === 1 ? '' : 's'} de despacho`;
  listaEl.innerHTML = lista.length ? lista.map(cardHtml).join('') : emptyState('inbox', 'Nenhum chamado neste filtro.');

  // Mantém a seleção; se não houver, abre o primeiro da lista (só em telas largas).
  if (!selecionado && lista.length && matchMedia('(min-width: 1280px)').matches) selecionado = lista[0].id;
  detalhe.render(chamados.find((c) => c.id === selecionado) ?? null);
}

subscribeChamados(
  (lista) => {
    chamados = lista;
    render();
  },
  (err) => (listaEl.innerHTML = erroFirestore(err)),
);
subscribeUsuarios((lista) => (usuarios = lista));

listaEl.addEventListener('click', (e) => {
  const card = e.target.closest('[data-id]');
  if (!card) return;
  selecionado = card.dataset.id;
  history.replaceState(null, '', `?${new URLSearchParams({ ...(aba !== 'abertos' && { filtro: aba }), id: selecionado })}`);
  render();
  if (!matchMedia('(min-width: 1280px)').matches) document.getElementById('ticket-detail').scrollIntoView({ behavior: 'smooth' });
});
tabsEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-aba]');
  if (!b) return;
  aba = b.dataset.aba;
  render();
});
[busca, filtroPredio, filtroPrioridade].forEach((el) => el.addEventListener('input', render));
// Atualiza os contadores de SLA a cada minuto.
setInterval(render, 60000);

// ----- Novo chamado -----
function abrirNovo(prioridadeInicial = 'BAIXA') {
  const tecnicos = usuarios.filter((u) => u.perfil === 'TECNICO').sort((a, b) => a.login.localeCompare(b.login));
  const { el, close } = openDialog({
    title: 'Abrir novo chamado',
    icon: 'add_circle',
    size: 'max-w-2xl',
    body: `<form class="grid grid-cols-1 sm:grid-cols-2 gap-space-md" novalidate>
      <div class="sm:col-span-2">${field('Título do chamado *', `<input class="${INPUT}" name="titulo" placeholder="Ex.: Impressora da 2ª Vara não imprime" required/>`)}</div>
      ${field('Solicitante *', `<input class="${INPUT}" name="solicitante" placeholder="Nome de quem pediu" required/>`)}
      ${field('Sala / local *', `<input class="${INPUT}" name="sala" placeholder="Ex.: Gabinete 102" required/>`)}
      ${field('Prédio', `<select class="${INPUT}" name="predio">${options(SETORES, user.predio && SETORES.includes(user.predio) ? user.predio : SETORES[0])}</select>`)}
      ${field('Prioridade', `<select class="${INPUT}" name="prioridade">${options(PRIORIDADES.map((p) => [p, prioridadeUI(p).label]), prioridadeInicial)}</select>`)}
      <div class="sm:col-span-2">${field('Técnico (opcional)', `<select class="${INPUT}" name="tecnico"><option value="">— Deixar na fila do prédio —</option>${tecnicos.map((t) => `<option value="${esc(t.login)}">${esc(t.nomeCompleto || t.login)} • ${esc(t.predio || '')} • ${esc(t.status || 'OFFLINE')}</option>`).join('')}</select>`)}</div>
      <div class="sm:col-span-2">${field('Descrição *', `<textarea class="${INPUT} h-28 py-2" name="descricao" placeholder="Descreva o problema" required></textarea>`)}</div>
      <div class="sm:col-span-2">${field('Observação', `<textarea class="${INPUT} h-20 py-2" name="observacao" placeholder="Informações adicionais (opcional)"></textarea>`)}</div>
      <p class="sm:col-span-2 hidden text-error font-body-sm text-body-sm" data-erro></p>
      <div class="sm:col-span-2 flex justify-end gap-space-sm">
        <button class="${BTN.ghost}" data-close type="button">Cancelar</button>
        <button class="${BTN.primary}" type="submit"><span class="material-symbols-outlined text-[18px]">send</span>Abrir chamado</button>
      </div>
    </form>`,
  });
  const form = el.querySelector('form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const erro = form.querySelector('[data-erro]');
    if (!f.titulo.trim() || !f.solicitante.trim() || !f.sala.trim() || !f.descricao.trim()) {
      erro.textContent = 'Preencha os campos obrigatórios: título, solicitante, sala e descrição.';
      erro.classList.remove('hidden');
      return;
    }
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      const ref = await salvarChamado({
        protocolo: gerarProtocolo(),
        titulo: f.titulo.trim(),
        solicitante: f.solicitante.trim(),
        sala: f.sala.trim(),
        observacao: f.observacao.trim(),
        descricao: f.descricao.trim(),
        predio: f.predio,
        status: f.tecnico ? 'Em andamento' : 'Aguardando atendimento',
        tecnico: f.tecnico || '',
        prioridade: f.prioridade,
        equipamento: null,
        historico: [],
        anexos: [],
        checklist: CHECKLIST_PADRAO,
        abertoPor: user.login,
      });
      salvarLog(`✨ ABRIU CHAMADO: ${f.titulo.trim()}`, user.login);
      close();
      toast('Chamado aberto.');
      aba = 'abertos';
      selecionado = ref.id;
      render();
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      erro.textContent = err.code === 'permission-denied' ? 'Sem permissão para abrir chamados.' : 'Falha ao salvar o chamado. Tente novamente.';
      erro.classList.remove('hidden');
    }
  });
}

document.getElementById('btn-novo-chamado').addEventListener('click', () => abrirNovo());
if (PRIORIDADES.includes(params.get('novo'))) {
  history.replaceState(null, '', location.pathname);
  abrirNovo(params.get('novo'));
}
