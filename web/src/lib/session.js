// Sessão do usuário: login (matrícula -> e-mail interno, igual ao app), guarda das páginas e logout.
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase.js';
import { emailDoLogin, salvarLog } from './data.js';

const authPronto = new Promise((resolve) => {
  const off = onAuthStateChanged(auth, (u) => {
    off();
    resolve(u);
  });
});

async function perfilDe(authUser) {
  const snap = await getDoc(doc(db, 'usuarios', authUser.uid));
  if (snap.exists()) return { id: snap.id, uid: authUser.uid, ...snap.data() };
  // Mesmo fallback do app: conta sem documento em "usuarios" é tratada como ADM.
  return { uid: authUser.uid, login: authUser.email?.split('@')[0] ?? 'Admin', perfil: 'ADM', predio: 'Base' };
}

let sessaoAtual;

/** Usuário logado (com dados de "usuarios"). Sem sessão, volta para o login. */
export function requireSession() {
  sessaoAtual ??= authPronto.then(async (u) => {
    if (!u) {
      const volta = encodeURIComponent(location.pathname.replace(/^\//, '') + location.search);
      location.replace(`index.html?next=${volta}`);
      return new Promise(() => {}); // a página não continua sem sessão
    }
    return perfilDe(u);
  });
  return sessaoAtual;
}

export const usuarioAtual = () => authPronto.then((u) => (u ? perfilDe(u) : null));

export async function login(matricula, senha) {
  const cred = await signInWithEmailAndPassword(auth, emailDoLogin(matricula), senha);
  const dados = (await getDoc(doc(db, 'usuarios', cred.user.uid))).data() ?? {};

  // Mesmo controle de expediente do app.
  const hora = new Date().getHours();
  const inicio = dados.inicio || 8;
  const saida = dados.saida || 17;
  const noHorario = inicio < saida ? hora >= inicio && hora < saida : hora >= inicio || hora < saida;
  await salvarLog(
    noHorario ? 'LOGOU NO SISTEMA (Dentro do expediente) [Web]' : `ALERTA: LOGOU NO SISTEMA FORA DO EXPEDIENTE (${hora}h) [Web]`,
    dados.login || matricula,
  );
  if (Object.keys(dados).length) {
    await updateDoc(doc(db, 'usuarios', cred.user.uid), { status: noHorario ? 'ONLINE' : 'OFFLINE' });
  }
  return cred.user;
}

export async function logout() {
  const u = auth.currentUser;
  if (u) {
    try {
      const snap = await getDoc(doc(db, 'usuarios', u.uid));
      await salvarLog('SAIU DO SISTEMA (Logout) [Web]', snap.data()?.login || 'Usuário');
      if (snap.exists()) await updateDoc(snap.ref, { status: 'OFFLINE' });
    } catch (e) {
      console.error('[Logout]', e);
    }
  }
  await signOut(auth);
  location.replace('index.html');
}

export const MENSAGENS_ERRO_LOGIN = {
  'auth/invalid-credential': 'Matrícula ou senha incorretas.',
  'auth/wrong-password': 'Matrícula ou senha incorretas.',
  'auth/user-not-found': 'Matrícula não cadastrada.',
  'auth/invalid-email': 'Matrícula inválida.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com o servidor. Verifique a rede.',
  'auth/user-disabled': 'Usuário desativado. Procure a DTI.',
};
