// Componentes de interface reutilizáveis (avisos, diálogos, estados de lista).
import { esc, getIniciais } from './format.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function toastRoot() {
  let el = document.getElementById('tg-toasts');
  if (!el) {
    el = document.createElement('div');
    el.id = 'tg-toasts';
    el.className = 'fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none';
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  return el;
}

/** Aviso temporário no canto da tela. tipo: 'ok' | 'erro' | 'info' */
export function toast(msg, tipo = 'ok') {
  const cores = { ok: 'bg-primary-container', erro: 'bg-error', info: 'bg-inverse-surface text-inverse-on-surface' };
  const icone = { ok: 'check_circle', erro: 'error', info: 'info' }[tipo];
  const el = document.createElement('div');
  el.className = `pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-white font-label-md text-label-md flex items-center gap-2 transition-all duration-300 translate-y-2 opacity-0 max-w-sm ${cores[tipo]}`;
  el.innerHTML = `<span class="material-symbols-outlined text-[18px]">${icone}</span><span>${esc(msg)}</span>`;
  toastRoot().append(el);
  requestAnimationFrame(() => el.classList.remove('translate-y-2', 'opacity-0'));
  setTimeout(() => {
    el.classList.add('opacity-0');
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

/**
 * Abre um diálogo modal. `body` é HTML; retorna { el, close }.
 * Botões com [data-close] fecham. Esc e clique no fundo também.
 */
export function openDialog({ title, icon = 'edit_note', body, size = 'max-w-lg' }) {
  const wrap = document.createElement('div');
  wrap.className = 'fixed inset-0 z-[90] flex items-center justify-center p-space-md bg-inverse-surface/60 backdrop-blur-sm overflow-y-auto';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.innerHTML = `
    <div class="relative w-full ${size} bg-surface-container-lowest rounded-xl shadow-xl flex flex-col my-space-md border border-outline-variant/30 max-h-[92vh]">
      <div class="flex items-center justify-between gap-space-sm px-space-lg py-space-md border-b border-outline-variant/40">
        <div class="flex items-center gap-space-sm text-primary">
          <span class="material-symbols-outlined text-[22px]">${icon}</span>
          <h2 class="font-headline-lg text-headline-lg">${esc(title)}</h2>
        </div>
        <button aria-label="Fechar" class="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high" data-close type="button">
          <span class="material-symbols-outlined text-[22px]">close</span>
        </button>
      </div>
      <div class="p-space-lg overflow-y-auto">${body}</div>
    </div>`;
  const close = () => {
    wrap.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => e.key === 'Escape' && close();
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap || e.target.closest('[data-close]')) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.append(wrap);
  wrap.querySelector('input, textarea, select')?.focus();
  return { el: wrap, close };
}

/** Pergunta de confirmação. Resolve true/false. */
export function confirmar({ title, message, okLabel = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    const { el, close } = openDialog({
      title,
      icon: danger ? 'warning' : 'help',
      body: `<p class="font-body-md text-body-md text-on-surface-variant">${esc(message)}</p>
        <div class="flex justify-end gap-space-sm mt-space-lg">
          <button class="${BTN.ghost}" data-close type="button">Cancelar</button>
          <button class="${danger ? BTN.danger : BTN.primary}" data-ok type="button">${esc(okLabel)}</button>
        </div>`,
    });
    let ok = false;
    el.querySelector('[data-ok]').addEventListener('click', () => {
      ok = true;
      close();
    });
    new MutationObserver((_, obs) => {
      if (!el.isConnected) {
        obs.disconnect();
        resolve(ok);
      }
    }).observe(document.body, { childList: true });
  });
}

// Classes dos botões e campos (DESIGN.md → Components).
export const BTN = {
  primary: 'h-10 px-space-md rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60',
  secondary: 'h-10 px-space-md rounded-lg bg-secondary text-on-secondary hover:opacity-90 font-label-lg text-label-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60',
  ghost: 'h-10 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg flex items-center justify-center gap-1.5 transition-colors',
  danger: 'h-10 px-space-md rounded-lg bg-error text-on-error hover:opacity-90 font-label-lg text-label-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60',
};
export const INPUT = 'w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md border border-outline-variant/60 focus:outline-none focus:border-secondary focus:ring-[3px] focus:ring-secondary/15 placeholder:text-outline';
export const LABEL = 'block font-label-md text-label-md text-on-surface mb-1';

export const field = (label, control) => `<label class="block"><span class="${LABEL}">${esc(label)}</span>${control}</label>`;
export const options = (list, selected) =>
  list.map((o) => {
    const [v, l] = Array.isArray(o) ? o : [o, o];
    return `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(l)}</option>`;
  }).join('');

/** Estado vazio / carregando / erro para listas. */
export const emptyState = (icon, text) => `
  <div class="flex flex-col items-center justify-center gap-space-xs py-space-xl text-center text-on-surface-variant">
    <span class="material-symbols-outlined text-[36px] text-outline">${icon}</span>
    <span class="font-body-md text-body-md">${esc(text)}</span>
  </div>`;
export const skeletonRows = (n = 3, h = 'h-16') =>
  Array.from({ length: n }, () => `<div class="skeleton rounded-lg ${h}"></div>`).join('');
export const erroFirestore = (err) =>
  err?.code === 'permission-denied'
    ? emptyState('lock', 'Sem permissão para ler estes dados.')
    : emptyState('cloud_off', 'Não foi possível carregar os dados. Verifique a conexão.');

/** Avatar com iniciais (os usuários não têm foto cadastrada). */
export const avatar = (nome, size = 'w-8 h-8 text-[12px]') =>
  `<div class="${size} rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold shrink-0">${esc(getIniciais(nome))}</div>`;
