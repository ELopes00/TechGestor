// Acesso ao Firestore — mesmas coleções e formatos do DataService do app TechGestor.
import { deleteApp, getApps, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword, EmailAuthProvider, getAuth, reauthenticateWithCredential, updatePassword,
} from 'firebase/auth';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from './firebase.js';

export const emailDoLogin = (login) => `${login.trim().toLowerCase().replace(/\s+/g, '')}@techgestor.app`;

const listen = (q, callback, onError) =>
  onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      console.error('[Firestore]', err);
      onError?.(err);
    },
  );

// --- CHAMADOS ---
export const subscribeChamados = (cb, onError) =>
  listen(query(collection(db, 'chamados'), orderBy('dataAbertura', 'desc')), cb, onError);
export const subscribeChamado = (id, cb) =>
  onSnapshot(doc(db, 'chamados', id), (d) => cb(d.exists() ? { id: d.id, ...d.data() } : null));
export const salvarChamado = (chamado) => addDoc(collection(db, 'chamados'), { ...chamado, dataAbertura: Date.now() });
export const atualizarChamado = (id, dados) => updateDoc(doc(db, 'chamados', id), dados);

// --- USUÁRIOS ---
export const subscribeUsuarios = (cb, onError) => listen(query(collection(db, 'usuarios')), cb, onError);
export const getUsuario = async (uid) => {
  const d = await getDoc(doc(db, 'usuarios', uid));
  return d.exists() ? { id: d.id, ...d.data() } : null;
};
export const atualizarUsuario = async (uid, dados, quem) => {
  if (dados.status) await salvarLog(`ALTEROU STATUS PARA: ${dados.status}`, quem);
  await updateDoc(doc(db, 'usuarios', uid), dados);
};
export const deletarUsuario = async (uid, quem) => {
  await salvarLog(`EXCLUIU UM USUÁRIO DO SISTEMA (ID: ${uid})`, quem);
  await deleteDoc(doc(db, 'usuarios', uid));
};

// Cria o usuário num app Firebase temporário para não derrubar a sessão do administrador.
export async function registrarUsuario({ login, senha, nomeCompleto, perfil, predio, emailContato, inicio, saida, nivel }, quem) {
  const temp = getApps().find((a) => a.name === 'AppCadastroTemporario') ?? initializeApp(firebaseConfig, 'AppCadastroTemporario');
  try {
    const cred = await createUserWithEmailAndPassword(getAuth(temp), emailDoLogin(login), senha);
    await setDoc(doc(db, 'usuarios', cred.user.uid), {
      login, nomeCompleto, emailContato: emailContato || '', perfil, predio, inicio, saida,
      nivel: perfil === 'TECNICO' ? nivel || 'N1' : null, status: 'OFFLINE', uid: cred.user.uid,
    });
    await salvarLog(`CRIOU NOVO USUÁRIO: ${login} (${perfil})`, quem);
    return cred.user;
  } finally {
    await deleteApp(temp);
  }
}

export async function mudarMinhaSenha(senhaAtual, novaSenha, quem) {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não logado');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, senhaAtual));
  await updatePassword(user, novaSenha);
  await salvarLog('ALTEROU A PRÓPRIA SENHA', quem);
}

// --- INVENTÁRIO ---
export const subscribeInventario = (cb, onError) => listen(query(collection(db, 'inventario')), cb, onError);
export const salvarItemInventario = async (item, quem) => {
  const ref = await addDoc(collection(db, 'inventario'), item);
  await registrarNoProntuario(ref.id, 'CADASTRO', 'Equipamento registrado no sistema.', quem);
  return ref;
};

const valorLegivel = (v) => {
  if (v === null || v === undefined || v === '') return 'vazio';
  if (Array.isArray(v)) return v.map((x) => (x.tombo ? `${x.tipo} (${x.tombo})` : 'Item')).join(', ');
  if (typeof v === 'object') return 'Dados Complexos';
  return String(v).trim();
};

// Como no app: grava no prontuário do item só os campos que realmente mudaram.
export const atualizarItemInventario = async (id, dados, quem) => {
  const ref = doc(db, 'inventario', id);
  const antes = (await getDoc(ref)).data() ?? {};
  await updateDoc(ref, dados);
  const mudancas = Object.keys(dados)
    .filter((k) => !['id', 'prontuario', 'ultimaAtualizacao'].includes(k))
    .filter((k) => JSON.stringify(antes[k] || '') !== JSON.stringify(dados[k] || ''))
    .map((k) => `${k.toUpperCase()}: de '${valorLegivel(antes[k])}' para '${valorLegivel(dados[k])}'`);
  if (mudancas.length) await registrarNoProntuario(id, 'MODIFICAÇÃO', mudancas.join(' | '), quem);
};
export const deletarItemInventario = async (id, quem) => {
  await salvarLog(`EXCLUIU ITEM DO INVENTÁRIO (ID: ${id})`, quem);
  await deleteDoc(doc(db, 'inventario', id));
};
export const subscribeProntuario = (itemId, cb) =>
  listen(query(collection(db, 'inventario', itemId, 'prontuario'), orderBy('data', 'desc')), cb);
export const registrarNoProntuario = (itemId, acao, detalhes, usuario) =>
  addDoc(collection(db, 'inventario', itemId, 'prontuario'), { acao, detalhes, usuario: usuario || 'Sistema', data: Date.now() })
    .catch((e) => console.error('[Prontuário]', e));

// --- EVENTOS ---
export const subscribeEventos = (cb, onError) => listen(query(collection(db, 'eventos'), orderBy('data', 'desc')), cb, onError);
export const salvarEvento = (evento) => addDoc(collection(db, 'eventos'), { ...evento, data: Date.now() });
export const atualizarEvento = (id, dados) => updateDoc(doc(db, 'eventos', id), dados);
export const deletarEvento = (id) => deleteDoc(doc(db, 'eventos', id));

// --- AGENDAMENTOS ---
export const subscribeAgendamentos = (cb, onError) => listen(query(collection(db, 'agendamentos')), cb, onError);
export const salvarAgendamento = (a) => addDoc(collection(db, 'agendamentos'), { ...a, criadoEm: Date.now() });
export const atualizarAgendamento = (id, dados) => updateDoc(doc(db, 'agendamentos', id), dados);
export const deletarAgendamento = (id) => deleteDoc(doc(db, 'agendamentos', id));

// --- LOGS ---
export const subscribeLogs = (cb, onError, max = 1000) =>
  listen(query(collection(db, 'logs'), orderBy('data', 'desc'), limit(max)), cb, onError);
/** Logs do próprio usuário (técnicos só podem ler os seus). Ordenação feita aqui, sem índice composto. */
export const subscribeMeusLogs = (login, cb, onError) =>
  listen(query(collection(db, 'logs'), where('usuario', '==', login), limit(200)), (l) => cb(l.sort((a, b) => (b.data || 0) - (a.data || 0))), onError);
/** Logs de um intervalo [de, ate] em ordem cronológica (para exportação/verificação). */
export async function buscarLogs(de, ate) {
  const snap = await getDocs(query(collection(db, 'logs'), where('data', '>=', de), where('data', '<=', ate), orderBy('data', 'asc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function salvarLog(mensagem, usuario) {
  try {
    await addDoc(collection(db, 'logs'), { mensagem, usuario: usuario || 'SISTEMA', data: Date.now() });
  } catch (e) {
    console.error('[Log]', e);
  }
}
