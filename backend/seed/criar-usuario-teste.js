/**
 * Cria UM usuário de teste (perfil ADM) no celab-7f3d9 pra verificação
 * end-to-end do painel web/mobile com o Firebase real — login "admin",
 * senha abaixo. Só pra este projeto de teste, não é prática pra produção
 * (ver aviso em seed-referencia.js sobre convite/e-mail real).
 *
 * Uso:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node criar-usuario-teste.js
 */
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const LOGIN = "admin";
const SENHA = "Teste@2026";
const EMAIL_FAKE = `${LOGIN}@techgestor.app`;

initializeApp({ credential: applicationDefault() });
const auth = getAuth();
const db = getFirestore();

async function main() {
  let user;
  try {
    user = await auth.getUserByEmail(EMAIL_FAKE);
    await auth.updateUser(user.uid, { password: SENHA });
    console.log("usuário já existia, senha atualizada:", user.uid);
  } catch (e) {
    user = await auth.createUser({ email: EMAIL_FAKE, password: SENHA, emailVerified: true });
    console.log("usuário criado:", user.uid);
  }

  await db.doc(`usuarios/${user.uid}`).set(
    {
      login: LOGIN,
      nome: "Administrador (teste)",
      perfil: "ADM",
      status: "OFFLINE",
    },
    { merge: true }
  );
  console.log("documento usuarios/" + user.uid + " gravado");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
