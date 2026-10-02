// Tela de login: autentica no Firebase com a matrícula (mesmo esquema do app).
import { login, MENSAGENS_ERRO_LOGIN, usuarioAtual } from '../lib/session.js';
import { toast } from '../lib/ui.js';

const form = document.getElementById('login-form');
const matricula = document.getElementById('matricula');
const senha = document.getElementById('senha');
const lembrar = document.getElementById('lembrar');
const polo = document.getElementById('polo');
const btn = document.getElementById('login-btn');
const erroBox = document.getElementById('login-erro');

const destino = () => {
  const next = new URLSearchParams(location.search).get('next');
  // Só aceita páginas internas do próprio site.
  return next && /^[\w-]+(\.html)?(\?[\w=&%-]*)?$/.test(next) ? next : 'dashboard.html';
};

usuarioAtual().then((u) => u && location.replace(destino()));
if (new URLSearchParams(location.search).get('erro') === 'sem-cadastro') {
  queueMicrotask(() => mostrarErro(MENSAGENS_ERRO_LOGIN['tg/sem-cadastro']));
}

try {
  const salvo = JSON.parse(localStorage.getItem('tg-login') || 'null');
  if (salvo) {
    matricula.value = salvo.matricula || '';
    if (salvo.polo) polo.value = salvo.polo;
    lembrar.checked = true;
  }
} catch {}

function mostrarErro(msg) {
  erroBox.querySelector('[data-msg]').textContent = msg;
  erroBox.classList.toggle('hidden', !msg);
  erroBox.classList.toggle('flex', !!msg);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  mostrarErro('');
  if (!matricula.value.trim() || !senha.value) {
    mostrarErro('Informe a matrícula e a senha.');
    (matricula.value.trim() ? senha : matricula).focus();
    return;
  }

  btn.disabled = true;
  btn.querySelector('[data-label]').textContent = 'Entrando...';
  try {
    await login(matricula.value, senha.value);
    try {
      if (lembrar.checked) localStorage.setItem('tg-login', JSON.stringify({ matricula: matricula.value.trim(), polo: polo.value }));
      else localStorage.removeItem('tg-login');
    } catch {}
    location.replace(destino());
  } catch (err) {
    console.error('[Login]', err);
    mostrarErro(MENSAGENS_ERRO_LOGIN[err.code] || 'Não foi possível entrar. Tente novamente.');
    senha.select();
    btn.disabled = false;
    btn.querySelector('[data-label]').textContent = 'Entrar no TechGestor';
  }
});

document.querySelectorAll('[data-ajuda]').forEach((a) =>
  a.addEventListener('click', (e) => {
    e.preventDefault();
    toast(
      a.dataset.ajuda === 'senha'
        ? 'Para redefinir a senha, procure um administrador do TechGestor na DTI (ramal 4100).'
        : 'O cadastro é feito por um administrador do TechGestor. Procure a DTI (ramal 4100).',
      'info',
    );
  }),
);

document.getElementById('login-certificado').addEventListener('click', () =>
  toast('Acesso por certificado digital ainda não está disponível. Use matrícula e senha.', 'info'),
);
