// MODO DEMONSTRAÇÃO: substitui src/lib/session.js (ver vite.demo.config.js).
// Nada aqui fala com o Firebase. Usuário fixo: demo / demo123.
const CHAVE = 'tg-demo-user';
const DEMO = { uid: 'u1', id: 'u1', login: 'demo', nomeCompleto: 'Usuário Demonstração', perfil: 'ADM', predio: 'SUBCS', status: 'ONLINE', inicio: 8, saida: 17 };

const lido = () => {
  try { return JSON.parse(sessionStorage.getItem(CHAVE) || 'null'); } catch { return null; }
};

// Faixa fixa avisando que os dados são fictícios.
addEventListener('DOMContentLoaded', () => {
  const faixa = document.createElement('div');
  faixa.className = 'fixed bottom-3 left-1/2 -translate-x-1/2 z-[95] px-3 py-1.5 rounded-full bg-amber-500 text-black font-label-md text-label-md shadow-lg pointer-events-none';
  faixa.textContent = 'MODO DEMONSTRAÇÃO • dados fictícios, nada é salvo';
  document.body.append(faixa);
});

export const usuarioAtual = async () => lido();

export function requireSession() {
  const u = lido();
  if (u) return Promise.resolve(u);
  location.replace(`index.html?next=${encodeURIComponent(location.pathname.replace(/^\//, ''))}`);
  return new Promise(() => {});
}

export async function login(matricula, senha) {
  if (matricula.trim().toLowerCase() === 'demo' && senha === 'demo123') {
    sessionStorage.setItem(CHAVE, JSON.stringify(DEMO));
    return DEMO;
  }
  const e = new Error('credenciais');
  e.code = 'auth/invalid-credential';
  throw e;
}

export async function logout() {
  sessionStorage.removeItem(CHAVE);
  location.replace('index.html');
}

export const MENSAGENS_ERRO_LOGIN = { 'auth/invalid-credential': 'No modo demonstração use: demo / demo123.' };
