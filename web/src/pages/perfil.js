// Perfil do usuário logado: dados, status, números, senha, tema e atividade.
import { logout, requireSession } from '../lib/session.js';
import { atualizarUsuario, mudarMinhaSenha, subscribeChamados, subscribeMeusLogs, subscribeUsuarios } from '../lib/data.js';
import { dataHora, ehHoje, esc, formatProtocolo, getDataFechamento, isFechado, isSlaVencido, prioridadeUI, slaTexto, tempoRelativo, USUARIO_STATUS_UI, usuarioStatusUI } from '../lib/format.js';
import { avatar, BTN, emptyState, field, INPUT, options, skeletonRows, toast } from '../lib/ui.js';

const user = await requireSession();
const $ = (id) => document.getElementById(id);
let eu = user;
const pad = (h) => `${String(h ?? '—').padStart(2, '0')}:00`;

function renderCartao() {
  const s = usuarioStatusUI(eu.status);
  $('cartao').innerHTML = `
    <div class="relative">${avatar(eu.nomeCompleto || eu.login, 'w-20 h-20 text-[26px]')}<span class="absolute bottom-1 right-1 w-4 h-4 rounded-full ${s.dot} ring-4 ring-surface-container-lowest"></span></div>
    <div class="flex-1 flex flex-col gap-1 min-w-0">
      <h1 class="font-headline-xl text-headline-xl text-primary tracking-tight">${esc(eu.nomeCompleto || eu.login)}</h1>
      <div class="flex flex-wrap gap-space-xs font-label-md text-label-md text-on-surface-variant">
        <span class="px-2 py-0.5 rounded-full bg-surface-container">@${esc(eu.login)}</span>
        <span class="px-2 py-0.5 rounded-full ${eu.perfil === 'ADM' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container'}">${eu.perfil === 'ADM' ? 'Administrador' : `Técnico ${esc(eu.nivel || 'N1')}`}</span>
        <span class="px-2 py-0.5 rounded-full bg-surface-container flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">domain</span>${esc(eu.predio || '—')}</span>
        <span class="px-2 py-0.5 rounded-full bg-surface-container flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">schedule</span>${pad(eu.inicio ?? 8)} – ${pad(eu.saida ?? 17)}</span>
        ${eu.emailContato ? `<span class="px-2 py-0.5 rounded-full bg-surface-container flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">mail</span>${esc(eu.emailContato)}</span>` : ''}
      </div>
    </div>
    <label class="flex flex-col gap-1 shrink-0">
      <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Meu status</span>
      <span class="flex items-center gap-space-xs px-space-sm h-10 rounded-lg bg-surface-container-low border border-outline-variant/60"><span class="w-2.5 h-2.5 rounded-full ${s.dot}"></span>
      <select class="bg-transparent font-label-lg text-label-lg text-on-surface focus:outline-none" id="meu-status" ${eu.id ? '' : 'disabled'}>${options(Object.entries(USUARIO_STATUS_UI).map(([k, v]) => [k, v.label]), eu.status || 'OFFLINE')}</select></span>
    </label>`;
}
renderCartao();
$('cartao').addEventListener('change', async (e) => {
  if (e.target.id !== 'meu-status') return;
  try {
    await atualizarUsuario(eu.id, { status: e.target.value }, eu.login);
    toast('Status atualizado.');
  } catch (err) {
    console.error(err);
    toast('Falha ao alterar o status.', 'erro');
  }
});
subscribeUsuarios((l) => {
  const atual = l.find((u) => u.id === user.uid);
  if (atual) { eu = { ...user, ...atual }; renderCartao(); }
});

// Números e chamados
$('meus-numeros').innerHTML = skeletonRows(4, 'h-20');
$('meus-chamados').innerHTML = skeletonRows(3, 'h-12');
const num = (t, v, i) => `<div class="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col"><span class="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1"><span class="material-symbols-outlined text-[16px] text-secondary">${i}</span>${t}</span><span class="font-display-lg-mobile text-display-lg-mobile text-primary">${v}</span></div>`;
subscribeChamados((todos) => {
  const meus = todos.filter((c) => c.tecnico === user.login);
  const abertos = meus.filter((c) => !isFechado(c.status));
  const fechados = meus.filter((c) => isFechado(c.status));
  const mes = new Date(); mes.setDate(1); mes.setHours(0, 0, 0, 0);
  $('meus-numeros').innerHTML =
    num('Em aberto', abertos.length, 'pending_actions') +
    num('SLA vencido', abertos.filter(isSlaVencido).length, 'timer_off') +
    num('Resolvidos hoje', fechados.filter((c) => ehHoje(getDataFechamento(c))).length, 'task_alt') +
    num('Resolvidos no mês', fechados.filter((c) => getDataFechamento(c) >= mes.getTime()).length, 'calendar_month');
  $('meus-chamados').innerHTML = abertos.length
    ? abertos.map((c) => {
        const pr = prioridadeUI(c.prioridade);
        return `<a class="flex items-center justify-between gap-space-sm py-space-sm hover:bg-surface-container-low px-space-xs rounded-lg" href="chamados.html?id=${encodeURIComponent(c.id)}">
          <div class="flex flex-col min-w-0"><span class="font-label-md text-label-md text-primary">${esc(formatProtocolo(c))} <span class="ml-1 px-1.5 rounded-full ${pr.cls}">${pr.label}</span></span><span class="font-body-sm text-body-sm text-on-surface truncate">${esc(c.titulo || '')}</span></div>
          <span class="font-label-sm text-label-sm shrink-0 ${isSlaVencido(c) ? 'text-error' : 'text-on-surface-variant'}">${esc(slaTexto(c))}</span></a>`;
      }).join('')
    : emptyState('done_all', 'Nenhum chamado em aberto com você.');
});

// Atividade
$('atividade').innerHTML = skeletonRows(4, 'h-8');
subscribeMeusLogs(user.login, (logs) => {
  const meus = logs.slice(0, 15);
  $('atividade').innerHTML = meus.length
    ? meus.map((l) => `<div class="flex items-start justify-between gap-space-sm py-1"><span class="font-body-sm text-body-sm text-on-surface">${esc(l.mensagem)}</span><span class="font-label-sm text-label-sm text-outline shrink-0" title="${dataHora(l.data)}">${tempoRelativo(l.data)}</span></div>`).join('')
    : emptyState('history', 'Nenhuma atividade registrada.');
}, () => ($('atividade').innerHTML = emptyState('lock', 'Sem permissão para ler os logs.')));

// Senha
$('form-senha').innerHTML =
  field('Senha atual', `<input autocomplete="current-password" class="${INPUT}" name="atual" type="password" required/>`) +
  field('Nova senha', `<input autocomplete="new-password" class="${INPUT}" minlength="6" name="nova" type="password" required/>`) +
  field('Confirmar nova senha', `<input autocomplete="new-password" class="${INPUT}" name="conf" type="password" required/>`) +
  `<p class="hidden font-body-sm text-body-sm text-error" data-erro></p><button class="${BTN.primary} self-start" type="submit"><span class="material-symbols-outlined text-[18px]">key</span>Alterar senha</button>`;
$('form-senha').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const f = Object.fromEntries(new FormData(form));
  const erro = form.querySelector('[data-erro]');
  const falha = (m) => { erro.textContent = m; erro.classList.remove('hidden'); };
  erro.classList.add('hidden');
  if (!f.atual || !f.nova) return falha('Preencha a senha atual e a nova.');
  if (f.nova.length < 6) return falha('A nova senha precisa ter pelo menos 6 caracteres.');
  if (f.nova !== f.conf) return falha('A confirmação não confere com a nova senha.');
  const btn = form.querySelector('[type="submit"]');
  btn.disabled = true;
  try {
    await mudarMinhaSenha(f.atual, f.nova, user.login);
    form.reset();
    toast('Senha alterada.');
  } catch (err) {
    console.error(err);
    falha(['auth/invalid-credential', 'auth/wrong-password'].includes(err.code) ? 'Senha atual incorreta.' : err.code === 'auth/too-many-requests' ? 'Muitas tentativas. Aguarde alguns minutos.' : 'Não foi possível alterar a senha.');
  } finally {
    btn.disabled = false;
  }
});

// Tema
function renderTema() {
  let pref = 'sistema';
  try { pref = localStorage.getItem('tg-theme') || 'sistema'; } catch {}
  $('tema').innerHTML = [['light', 'Claro', 'light_mode'], ['dark', 'Escuro', 'dark_mode'], ['sistema', 'Do sistema', 'computer']]
    .map(([v, l, i]) => `<button class="flex flex-col items-center gap-1 p-space-sm rounded-lg border ${pref === v ? 'border-secondary bg-secondary-fixed/40 text-primary' : 'border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-low'}" data-tema="${v}" type="button"><span class="material-symbols-outlined">${i}</span><span class="font-label-md text-label-md">${l}</span></button>`).join('');
}
renderTema();
$('tema').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tema]');
  if (!b) return;
  const v = b.dataset.tema;
  try { v === 'sistema' ? localStorage.removeItem('tg-theme') : localStorage.setItem('tg-theme', v); } catch {}
  document.documentElement.classList.toggle('dark', v === 'dark' || (v === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches));
  document.querySelectorAll('[data-theme-icon]').forEach((i) => (i.textContent = document.documentElement.classList.contains('dark') ? 'light_mode' : 'dark_mode'));
  renderTema();
});

$('btn-sair').addEventListener('click', logout);
