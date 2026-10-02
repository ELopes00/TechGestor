// Cria um usuário do TechGestor (Firebase Auth + documento em "usuarios"), no mesmo formato do app.
//
// Uso:
//   node scripts/criar-usuario.mjs <login> <senha> "<Nome completo>" [ADM|TECNICO] [prédio]
// Exemplo:
//   node scripts/criar-usuario.mjs joao.silva "S3nh@Forte" "João da Silva" ADM SUBCS
//
// Pelas regras do Firestore, só um administrador cadastra usuários. Informe o seu login de ADM:
//   TG_ADMIN=<seu login> TG_ADMIN_SENHA=<sua senha> node scripts/criar-usuario.mjs ...
// Na rede do TJRR, rode com NODE_OPTIONS=--use-system-ca (certificado do proxy).
import { deleteApp, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { addDoc, collection, doc, getFirestore, setDoc } from 'firebase/firestore';

const [login, senha, nomeCompleto, perfil = 'ADM', predio = 'SUBCS'] = process.argv.slice(2);
if (!login || !senha || !nomeCompleto) {
  console.log('Uso: node scripts/criar-usuario.mjs <login> <senha> "<Nome completo>" [ADM|TECNICO] [prédio]');
  process.exit(1);
}
if (senha.length < 6) {
  console.error('A senha precisa ter pelo menos 6 caracteres.');
  process.exit(1);
}
if (!['ADM', 'TECNICO'].includes(perfil)) {
  console.error('Perfil deve ser ADM ou TECNICO.');
  process.exit(1);
}

const { TG_ADMIN, TG_ADMIN_SENHA } = process.env;
if (!TG_ADMIN || !TG_ADMIN_SENHA) {
  console.error('Defina TG_ADMIN e TG_ADMIN_SENHA com o login e a senha de um administrador.');
  process.exit(1);
}

const config = {
  apiKey: 'AIzaSyBpgjmA9h1yuExOKxCAbQBy7NYdH9PerJs',
  authDomain: 'techgestor-bd.firebaseapp.com',
  projectId: 'techgestor-bd',
  storageBucket: 'techgestor-bd.firebasestorage.app',
  messagingSenderId: '1020969618268',
  appId: '1:1020969618268:web:afa267b785caaff9f58f99',
};
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const loginNorm = login.trim().toLowerCase().replace(/\s+/g, '');

const email = (l) => `${l.trim().toLowerCase().replace(/\s+/g, '')}@techgestor.app`;

try {
  await signInWithEmailAndPassword(auth, email(TG_ADMIN), TG_ADMIN_SENHA);
  // A conta nova é criada num app separado para não trocar a sessão do administrador.
  const temp = initializeApp(config, 'cadastro');
  const cred = await createUserWithEmailAndPassword(getAuth(temp), email(loginNorm), senha);
  await deleteApp(temp);
  await setDoc(doc(db, 'usuarios', cred.user.uid), {
    login: loginNorm, nomeCompleto, emailContato: '', perfil, predio, inicio: 8, saida: 17,
    nivel: perfil === 'TECNICO' ? 'N1' : null, status: 'OFFLINE', uid: cred.user.uid,
  });
  await addDoc(collection(db, 'logs'), { mensagem: `CRIOU NOVO USUÁRIO: ${loginNorm} (${perfil}) [script]`, usuario: TG_ADMIN.trim().toLowerCase(), data: Date.now() });
  await signOut(auth);
  console.log(`✔ Usuário criado: login "${loginNorm}", perfil ${perfil}, prédio ${predio}.`);
  console.log('  Entre no site com esse login e a senha informada; troque a senha em Perfil se quiser.');
  process.exit(0);
} catch (e) {
  const msg = {
    'auth/email-already-in-use': `Já existe uma conta com o login "${loginNorm}". Use outro login ou entre com a senha existente.`,
    'auth/weak-password': 'Senha fraca: use pelo menos 6 caracteres.',
    'auth/operation-not-allowed': 'O login por e-mail/senha está desativado no Firebase.',
    'auth/network-request-failed': 'Sem conexão com o Firebase. Na rede do TJRR, use NODE_OPTIONS=--use-system-ca.',
    'permission-denied': 'Sem permissão: o login informado em TG_ADMIN não é administrador.',
    'auth/invalid-credential': 'Login ou senha do administrador (TG_ADMIN) incorretos.',
  }[e.code];
  console.error('✘', msg || `${e.code || ''} ${e.message}`);
  process.exit(1);
}
