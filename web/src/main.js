// O CSS é carregado por <link> no <head> (vite.config.js), independente do JavaScript.
import { logout, requireSession } from './lib/session.js';
import { subscribeChamados, subscribeUsuarios } from './lib/data.js';
import { getIniciais, isFechado, isSlaVencido, usuarioStatusUI } from './lib/format.js';

// Comportamentos do layout compartilhado (cabeçalho e menu lateral).
// O código de cada tela fica em src/pages/<id>.js (carregado automaticamente).

// ---------- Tema claro/escuro ----------
const root = document.documentElement;
const syncThemeIcon = () =>
  document.querySelectorAll('[data-theme-icon]').forEach((i) => {
    i.textContent = root.classList.contains('dark') ? 'light_mode' : 'dark_mode';
  });
syncThemeIcon();
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-action="toggle-theme"]')) return;
  const dark = root.classList.toggle('dark');
  try {
    localStorage.setItem('tg-theme', dark ? 'dark' : 'light');
  } catch {}
  syncThemeIcon();
});

// ---------- Menu lateral (celular) e menu do usuário ----------
const sidebar = document.querySelector('[data-sidebar]');
const backdrop = document.querySelector('[data-sidebar-backdrop]');
const userMenu = document.querySelector('[data-user-menu]');
const userMenuBtn = document.querySelector('[data-action="toggle-user-menu"]');

function setSidebar(open) {
  if (!sidebar) return;
  sidebar.classList.toggle('-translate-x-full', !open);
  backdrop?.classList.toggle('hidden', !open);
}
document.querySelector('[data-action="toggle-sidebar"]')?.addEventListener('click', () => {
  setSidebar(sidebar.classList.contains('-translate-x-full'));
});
backdrop?.addEventListener('click', () => setSidebar(false));

userMenuBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = userMenu.classList.toggle('hidden') === false;
  userMenuBtn.setAttribute('aria-expanded', String(open));
});
document.addEventListener('click', (e) => {
  if (userMenu && !userMenu.contains(e.target)) {
    userMenu.classList.add('hidden');
    userMenuBtn?.setAttribute('aria-expanded', 'false');
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  setSidebar(false);
  userMenu?.classList.add('hidden');
});
document.querySelector('[data-action="logout"]')?.addEventListener('click', (e) => {
  e.preventDefault();
  logout();
});

// ---------- Sessão e dados do cabeçalho ----------
const bind = (name) => document.querySelectorAll(`[data-bind="${name}"]`);
const setText = (name, text) => bind(name).forEach((el) => (el.textContent = text));

if (document.body.dataset.auth === 'required') {
  requireSession().then((user) => {
    const pagina = document.body.dataset.requirePage;
    if (pagina && user.perfil !== pagina) {
      location.replace('dashboard.html');
      return;
    }
    document.body.classList.add('auth-ok');

    setText('user-nome', user.nomeCompleto || user.login);
    setText('user-cargo', user.perfil === 'ADM' ? 'Administrador' : `Técnico${user.nivel ? ` ${user.nivel}` : ''} • ${user.predio || '—'}`);
    setText('user-iniciais', getIniciais(user.nomeCompleto || user.login));
    document.querySelectorAll('[data-require]').forEach((el) => {
      if (el.dataset.require !== user.perfil) el.remove();
    });

    subscribeUsuarios((users) => {
      const eu = users.find((u) => u.id === user.uid || u.uid === user.uid);
      bind('user-status-dot').forEach((el) => (el.className = el.className.replace(/\bbg-[\w-]+/, usuarioStatusUI(eu?.status).dot)));
      setText('badge-online', `${users.filter((u) => u.perfil === 'TECNICO' && u.status === 'ONLINE').length} On`);
    });

    subscribeChamados((chamados) => {
      const abertos = chamados.filter((c) => !isFechado(c.status));
      setText('badge-chamados', String(abertos.length));
      const vencidos = abertos.filter(isSlaVencido).length;
      bind('alerta-sla-count').forEach((el) => {
        el.textContent = vencidos > 99 ? '99+' : String(vencidos);
        el.classList.toggle('hidden', vencidos === 0);
      });
    });
  });
}
