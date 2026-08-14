import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { auth, db } from "./firebase";
import type { Chamado } from "./types";

async function salvarLog(mensagem: string, usuarioLogado: string) {
  try {
    await addDoc(collection(db, "logs"), { mensagem, usuario: usuarioLogado || "SISTEMA", data: Date.now() });
  } catch (e) {
    console.error("Erro ao salvar log:", e);
  }
}

async function atualizarChamado(id: string, dados: Partial<Chamado>) {
  await updateDoc(doc(db, "chamados", id), dados);
}

async function salvarPushToken(uid: string, token: string) {
  try {
    await updateDoc(doc(db, "usuarios", uid), { expoPushToken: token });
  } catch (e) {
    console.error("Erro ao salvar push token:", e);
  }
}

/** Mesmo padrão do web (lib/dataService.ts mudarMinhaSenha): reautentica
 *  e troca a senha da própria sessão. */
async function mudarMinhaSenha(senhaAtual: string, novaSenha: string) {
  const user = auth.currentUser;
  if (!user || !user.email) return { sucesso: false as const, erro: "Usuário não logado" };
  try {
    const cred = EmailAuthProvider.credential(user.email, senhaAtual);
    await reauthenticateWithCredential(user, cred);
    await updatePassword(user, novaSenha);
    // ⚠️ Réplica deliberada do app original, ver README.
    await updateDoc(doc(db, "usuarios", user.uid), { senha: novaSenha });
    return { sucesso: true as const };
  } catch (error) {
    return { sucesso: false as const, erro: (error as { code?: string })?.code ?? "erro" };
  }
}

export const DataService = {
  atualizarChamado,
  salvarLog,
  salvarPushToken,
  mudarMinhaSenha,
};
