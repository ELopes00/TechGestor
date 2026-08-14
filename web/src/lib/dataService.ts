"use client";

import { getApps, initializeApp, deleteApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, firebaseConfig, functions, storage } from "@/lib/firebase";
import { gerarEmailFake } from "@/lib/auth";
import type { Agendamento, Anexo, Chamado, Evento, ItemInventario, Papel, Unidade } from "@/lib/types";

async function salvarLog(mensagem: string, usuarioLogado: string) {
  try {
    await addDoc(collection(db, "logs"), { mensagem, usuario: usuarioLogado || "SISTEMA", data: Date.now() });
  } catch (e) {
    console.error("Erro ao salvar log:", e);
  }
}

// --- Push (Expo, direto do cliente) -----------------------------------------
/**
 * Substitui a versão em Cloud Functions (backend/functions/src/index.ts)
 * enquanto o projeto celab-7f3d9 não sobe pro plano Blaze — pedido do
 * time em 14/08/2026: "quero fazer no plano gratuito". Cloud Functions
 * não roda em nenhuma versão no plano Spark, então o envio volta a
 * acontecer no cliente, igual o app original fazia.
 *
 * Só cobre o canal Expo (mobile) — o app original também mandava FCM
 * (navegador) direto do cliente, mas isso exige a chave de servidor do
 * FCM, que não pode ficar exposta em código de cliente. Sem Blaze, quem
 * está no painel web só vê a atualização chegar em tempo real na tela
 * (já é assim via onSnapshot), sem notificação nativa do navegador.
 */
interface NotificacaoPush {
  titulo: string;
  corpo: string;
  dados?: Record<string, string>;
}

async function buscarExpoTokens(logins: string[]): Promise<string[]> {
  const loginsUnicos = [...new Set(logins.filter(Boolean))];
  if (loginsUnicos.length === 0) return [];
  const tokens: string[] = [];
  // "in" do Firestore aceita no máximo 30 valores por consulta.
  for (let i = 0; i < loginsUnicos.length; i += 30) {
    const lote = loginsUnicos.slice(i, i + 30);
    const snap = await getDocs(query(collection(db, "usuarios"), where("login", "in", lote)));
    snap.forEach((d) => {
      const token = d.data().expoPushToken;
      if (token) tokens.push(token);
    });
  }
  return tokens;
}

async function enviarPushMobile(logins: string[], notificacao: NotificacaoPush) {
  try {
    const tokens = await buscarExpoTokens(logins);
    if (tokens.length === 0) return;
    // Via /api/push-mobile (mesma origem) — chamar exp.host direto do
    // navegador esbarra em CORS, ver comentário na rota.
    await fetch("/api/push-mobile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens, titulo: notificacao.titulo, corpo: notificacao.corpo, dados: notificacao.dados }),
    });
  } catch (e) {
    console.error("Erro ao enviar push mobile:", e);
  }
}

/** Chamado sem técnico ainda: avisa todos os técnicos do mesmo prédio. */
async function notificarTecnicosDoPredio(predio: string, notificacao: NotificacaoPush) {
  const snap = await getDocs(query(collection(db, "usuarios"), where("perfil", "==", "TECNICO"), where("predio", "==", predio)));
  const logins = snap.docs.map((d) => d.data().login as string);
  await enviarPushMobile(logins, notificacao);
}

// --- Chamados ---------------------------------------------------------------
async function salvarChamado(chamado: Omit<Chamado, "id" | "dataAbertura">) {
  const ref = await addDoc(collection(db, "chamados"), { ...chamado, dataAbertura: Date.now() });

  if (chamado.tecnico) {
    enviarPushMobile([chamado.tecnico], {
      titulo: "🚨 Novo chamado atribuído a você",
      corpo: `${chamado.titulo} — ${chamado.predio} / ${chamado.sala}`,
      dados: { chamadoId: ref.id, tipo: "CHAMADO_ATRIBUIDO" },
    }).catch(() => {});
  } else {
    notificarTecnicosDoPredio(chamado.predio, {
      titulo: `🔔 Novo chamado na fila (${chamado.predio})`,
      corpo: chamado.titulo,
      dados: { chamadoId: ref.id, tipo: "CHAMADO_NA_FILA" },
    }).catch(() => {});
  }

  return ref.id;
}
async function atualizarChamado(id: string, dados: Partial<Chamado>) {
  if (dados.tecnico) {
    getDoc(doc(db, "chamados", id))
      .then((snap) => {
        const antes = snap.data();
        if (antes && antes.tecnico !== dados.tecnico) {
          enviarPushMobile([dados.tecnico as string], {
            titulo: "🙋‍♂️ Chamado atribuído a você",
            corpo: `${dados.titulo ?? antes.titulo} — ${dados.predio ?? antes.predio} / ${dados.sala ?? antes.sala}`,
            dados: { chamadoId: id, tipo: "CHAMADO_ATRIBUIDO" },
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }
  await updateDoc(doc(db, "chamados", id), dados);
}
async function deletarChamado(id: string) {
  await deleteDoc(doc(db, "chamados", id));
}

/** Sobe um arquivo (documento ou foto) pro Storage e devolve o Anexo pra
 *  gravar em chamados/{id}.anexos — pedido de 14/08/2026, mesmos botões
 *  "Arquivo"/"Foto" que já existem no app real. */
async function anexarArquivo(chamadoId: string, arquivo: File, tipo: Anexo["type"]): Promise<Anexo> {
  const caminho = `chamados/${chamadoId}/${Date.now()}-${arquivo.name}`;
  const storageRef = ref(storage, caminho);
  await uploadBytes(storageRef, arquivo);
  const uri = await getDownloadURL(storageRef);
  return { id: caminho, nome: arquivo.name, uri, type: tipo };
}

/** Remove um anexo do Storage — `anexo.id` é o caminho completo do
 *  arquivo (ver anexarArquivo acima). Quem chama ainda precisa atualizar
 *  `chamados/{id}.anexos` no Firestore pra tirar da lista (14/08/2026,
 *  pedido do time: dar pra apagar anexo que foi vinculado errado). */
async function removerAnexo(anexo: Anexo) {
  await deleteObject(ref(storage, anexo.id));
}

// --- Eventos ------------------------------------------------------------------
async function salvarEvento(evento: Omit<Evento, "id" | "data">) {
  const ref = await addDoc(collection(db, "eventos"), { ...evento, data: Date.now() });
  if (evento.tecnico) {
    enviarPushMobile([evento.tecnico], {
      titulo: `🎉 Novo evento escalado: ${evento.tipo === "EXTERNO" ? "externo" : "interno"}`,
      corpo: `${evento.nome} — ${evento.tipo === "INTERNO" ? evento.local : evento.endereco}`,
      dados: { eventoId: ref.id, tipo: "EVENTO_ESCALADO" },
    }).catch(() => {});
  }
}
async function atualizarEvento(id: string, dados: Partial<Evento>) {
  await updateDoc(doc(db, "eventos", id), dados);
}
async function deletarEvento(id: string) {
  await deleteDoc(doc(db, "eventos", id));
}

// --- Inventário -----------------------------------------------------------
async function salvarItemInventario(item: Omit<ItemInventario, "id" | "dataCadastro">, autor: string) {
  await addDoc(collection(db, "inventario"), {
    ...item,
    dataCadastro: Date.now(),
    auditoria: [{ data: Date.now(), texto: "Equipamento registrado no sistema.", autor }],
  });
}
async function atualizarItemInventario(id: string, dados: Partial<ItemInventario>) {
  await updateDoc(doc(db, "inventario", id), dados);
}
async function deletarItemInventario(id: string) {
  await deleteDoc(doc(db, "inventario", id));
}

// --- Agenda ------------------------------------------------------------------
async function salvarAgendamento(agendamento: Omit<Agendamento, "id">) {
  await addDoc(collection(db, "agendamentos"), agendamento);
}
async function deletarAgendamento(id: string) {
  await deleteDoc(doc(db, "agendamentos", id));
}

// --- Usuários -----------------------------------------------------------------
/**
 * Cria um novo usuário sem deslogar o admin atual: usa uma segunda
 * instância temporária do Firebase App, exatamente como o app original.
 * ⚠️ Grava `senha` em texto puro no Firestore — decisão explícita do time
 * em 12/08/2026 para manter paridade com o app original nesta passada.
 * Fica marcado para remoção numa iteração futura de segurança.
 */
async function registrarUsuario(
  login: string,
  senha: string,
  nomeCompleto: string,
  perfil: Papel,
  predio: Unidade | string,
  inicio: number,
  saida: number,
  autor: string
) {
  const nomeAppTemp = "AppCadastroTemporario";
  const appTemp = getApps().find((a) => a.name === nomeAppTemp) ?? initializeApp(firebaseConfig, nomeAppTemp);
  const authTemp = getAuth(appTemp);

  const cred = await createUserWithEmailAndPassword(authTemp, gerarEmailFake(login), senha);

  await setDoc(doc(db, "usuarios", cred.user.uid), {
    login,
    senha,
    nomeCompleto,
    perfil,
    predio,
    inicio,
    saida,
    status: "ONLINE",
    uid: cred.user.uid,
  });

  await salvarLog(`CRIOU NOVO USUÁRIO: ${login} (${perfil})`, autor);
  await deleteApp(appTemp);
}

async function atualizarUsuario(uid: string, dados: Record<string, unknown>, autor: string) {
  if (dados.status) await salvarLog(`ALTEROU STATUS PARA: ${dados.status}`, autor);
  await updateDoc(doc(db, "usuarios", uid), dados);
}

async function deletarUsuario(uid: string, autor: string) {
  await salvarLog(`EXCLUIU UM USUÁRIO DO SISTEMA (ID: ${uid})`, autor);
  await deleteDoc(doc(db, "usuarios", uid));
}

/**
 * Admin redefine a senha de outra pessoa — via Cloud Function
 * `adminRedefinirSenha` (backend/functions/src/index.ts), porque o SDK
 * client só deixa trocar a senha da própria sessão.
 */
async function redefinirSenhaDeOutroUsuario(uid: string, novaSenha: string) {
  try {
    await httpsCallable(functions, "adminRedefinirSenha")({ uid, novaSenha });
    return { sucesso: true as const };
  } catch (error) {
    return { sucesso: false as const, erro: (error as { code?: string })?.code ?? "erro" };
  }
}

async function mudarMinhaSenha(senhaAtual: string, novaSenha: string) {
  const user = auth.currentUser;
  if (!user || !user.email) return { sucesso: false, erro: "Usuário não logado" };
  try {
    const cred = EmailAuthProvider.credential(user.email, senhaAtual);
    await reauthenticateWithCredential(user, cred);
    await updatePassword(user, novaSenha);
    // Réplica deliberada do app original — ver nota em registrarUsuario().
    await updateDoc(doc(db, "usuarios", user.uid), { senha: novaSenha });
    const userDoc = await getDoc(doc(db, "usuarios", user.uid));
    await salvarLog("ALTEROU A PRÓPRIA SENHA", userDoc.data()?.login ?? user.email);
    return { sucesso: true as const };
  } catch (error) {
    return { sucesso: false as const, erro: (error as { code?: string })?.code ?? "erro" };
  }
}

export const DataService = {
  salvarChamado,
  atualizarChamado,
  deletarChamado,
  anexarArquivo,
  removerAnexo,
  salvarEvento,
  atualizarEvento,
  deletarEvento,
  salvarItemInventario,
  atualizarItemInventario,
  deletarItemInventario,
  salvarAgendamento,
  deletarAgendamento,
  registrarUsuario,
  atualizarUsuario,
  deletarUsuario,
  mudarMinhaSenha,
  redefinirSenhaDeOutroUsuario,
  salvarLog,
};
