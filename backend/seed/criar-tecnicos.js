/**
 * Cria as contas dos 13 técnicos reais de `tecnicos.json` no projeto de
 * teste (celab-7f3d9) — login "Primeiro Último" (primeiro nome + último
 * sobrenome do nome completo, com espaço) e senha inicial "12345678" pra
 * todos, igual combinado com o time em 14/08/2026. Cada um troca a
 * própria senha depois (Perfil, web ou mobile) ou o admin troca por eles
 * (Admin → Equipe → Editar).
 *
 * Todos ficam com perfil TECNICO e unidade "Administrativo" por padrão —
 * ajuste a unidade de cada um depois em Admin → Equipe → Editar.
 *
 * Uso:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node criar-tecnicos.js
 */
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const tecnicos = require("./tecnicos.json");
const SENHA_INICIAL = "12345678";
const UNIDADE_PADRAO = "Administrativo";

function loginPrimeiroUltimo(nomeCompleto) {
  const partes = nomeCompleto.trim().split(/\s+/);
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

function emailFake(login) {
  return `${login.trim().toLowerCase().replace(/\s+/g, "")}@techgestor.app`;
}

initializeApp({ credential: applicationDefault() });
const auth = getAuth();
const db = getFirestore();

async function main() {
  for (const { nome } of tecnicos) {
    const login = loginPrimeiroUltimo(nome);
    const email = emailFake(login);

    let user;
    try {
      user = await auth.getUserByEmail(email);
      await auth.updateUser(user.uid, { password: SENHA_INICIAL });
      console.log(`já existia, senha resetada: ${login} (${user.uid})`);
    } catch (e) {
      user = await auth.createUser({ email, password: SENHA_INICIAL, emailVerified: true });
      console.log(`criado: ${login} (${user.uid})`);
    }

    await db.doc(`usuarios/${user.uid}`).set(
      {
        login,
        senha: SENHA_INICIAL, // ⚠️ réplica deliberada do app original, ver README
        nomeCompleto: nome,
        perfil: "TECNICO",
        predio: UNIDADE_PADRAO,
        inicio: 8,
        saida: 17,
        status: "OFFLINE",
      },
      { merge: true }
    );
  }
  console.log(`\n${tecnicos.length} técnicos processados. Senha inicial de todos: ${SENHA_INICIAL}`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
