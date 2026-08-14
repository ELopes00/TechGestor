/**
 * TechGestor 2.0 — Cloud Functions: sistema de push notification.
 *
 * Reconstruído em 12/08/2026 depois de auditar o app original inteiro. O
 * app real tem DOIS canais de push, não um:
 *   1) Expo Push (app mobile) — token salvo em usuarios/{uid}.expoPushToken
 *   2) Firebase Cloud Messaging via service worker (navegador, painel web)
 *      — token salvo em usuarios/{uid}.fcmToken
 *
 * No app original o envio acontecia DIRETO DO CLIENTE, via fetch pra API
 * do Expo passando por um proxy CORS público (corsproxy.io) — fràgil (o
 * proxy pode cair/limitar) e evitável, já que rodando no servidor não
 * existe restrição de CORS. Aqui o envio roda inteiramente em Cloud
 * Functions, sem proxy nenhum, disparado por gatilhos do Firestore.
 *
 * ⚠️ NÃO ESTÁ IMPLANTADO (14/08/2026) — Cloud Functions exige o plano
 * Blaze, e o upgrade do projeto celab-7f3d9 não propagou (a CLI segue
 * recusando o deploy mesmo com o console mostrando Blaze ativo). Até
 * isso resolver, o time pediu pra rodar no plano gratuito: a MESMA
 * lógica do canal Expo (`onChamadoCriado`/`onChamadoAtualizado`/
 * `onEventoCriado`) foi replicada direto no cliente em
 * `web/src/lib/dataService.ts` (`enviarPushMobile`/
 * `notificarTecnicosDoPredio`), passando por uma API Route same-origin
 * (`web/src/app/api/push-mobile/route.ts`) pra fugir do bloqueio de CORS
 * do endpoint do Expo. O canal FCM (web) ficou de fora dessa versão
 * cliente — exige a chave de servidor do FCM, que não pode ficar
 * exposta no navegador.
 *
 * Se um dia o deploy destas Functions for feito COM o código cliente
 * ainda ativo, cada chamado/evento vai disparar duas notificações
 * (uma de cada canal) — nesse momento, apague a lógica de
 * `enviarPushMobile`/`notificarTecnicosDoPredio` do dataService.ts, ou
 * remova estas três Functions daqui. Não rode os dois ao mesmo tempo.
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";

initializeApp();
const db = getFirestore();

interface Notificacao {
  titulo: string;
  corpo: string;
  dados?: Record<string, string>;
}

/** Envia via Expo Push API — chamada direta, servidor a servidor, sem proxy. */
async function enviarExpoPush(tokens: string[], notificacao: Notificacao) {
  if (tokens.length === 0) return;
  const mensagens = tokens.map((to) => ({
    to,
    sound: "default",
    title: notificacao.titulo,
    body: notificacao.corpo,
    data: notificacao.dados ?? {},
  }));

  try {
    const resposta = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(mensagens),
    });
    if (!resposta.ok) {
      logger.error("Expo push falhou", { status: resposta.status, corpo: await resposta.text() });
    }
  } catch (erro) {
    logger.error("Erro ao chamar Expo push API", erro);
  }
}

/** Envia via Firebase Cloud Messaging (tokens do navegador/web). */
async function enviarFcmPush(tokens: string[], notificacao: Notificacao) {
  if (tokens.length === 0) return;
  try {
    await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title: notificacao.titulo, body: notificacao.corpo },
      data: notificacao.dados ?? {},
      webpush: { fcmOptions: { link: "/chamados" } },
    });
  } catch (erro) {
    logger.error("Erro ao enviar FCM push", erro);
  }
}

/**
 * Busca os tokens (Expo + FCM) de uma lista de `login`s e dispara os dois
 * canais em paralelo. `usuarios.login` é o identificador usado em todo o
 * app (não o uid) — mesma convenção do app original.
 */
async function notificarLogins(logins: string[], notificacao: Notificacao) {
  const loginsUnicos = [...new Set(logins.filter(Boolean))];
  if (loginsUnicos.length === 0) return;

  // "in" do Firestore aceita no máximo 30 valores por consulta.
  const lotes: string[][] = [];
  for (let i = 0; i < loginsUnicos.length; i += 30) lotes.push(loginsUnicos.slice(i, i + 30));

  const expoTokens: string[] = [];
  const fcmTokens: string[] = [];

  for (const lote of lotes) {
    const snap = await db.collection("usuarios").where("login", "in", lote).get();
    snap.forEach((doc) => {
      const dados = doc.data();
      if (dados.expoPushToken) expoTokens.push(dados.expoPushToken);
      if (dados.fcmToken) fcmTokens.push(dados.fcmToken);
    });
  }

  await Promise.all([enviarExpoPush(expoTokens, notificacao), enviarFcmPush(fcmTokens, notificacao)]);
}

// ---------------------------------------------------------------------------
// Chamados
// ---------------------------------------------------------------------------

/**
 * Chamado criado: se já nasce atribuído a um técnico, avisa só ele. Se
 * nasce na fila (sem técnico), avisa todos os técnicos da mesma unidade —
 * mesma lógica de "quem pode assumir" usada em ChamadosScreen (aba FILA).
 */
export const onChamadoCriado = onDocumentCreated("chamados/{chamadoId}", async (event) => {
  const chamado = event.data?.data();
  if (!chamado) return;

  if (chamado.tecnico) {
    await notificarLogins([chamado.tecnico], {
      titulo: "🚨 Novo chamado atribuído a você",
      corpo: `${chamado.titulo} — ${chamado.predio} / ${chamado.sala}`,
      dados: { chamadoId: event.params.chamadoId, tipo: "CHAMADO_ATRIBUIDO" },
    });
    return;
  }

  const tecnicosDaUnidade = await db
    .collection("usuarios")
    .where("perfil", "==", "TECNICO")
    .where("predio", "==", chamado.predio)
    .get();
  const logins = tecnicosDaUnidade.docs.map((d) => d.data().login as string);

  await notificarLogins(logins, {
    titulo: `🔔 Novo chamado na fila (${chamado.predio})`,
    corpo: chamado.titulo,
    dados: { chamadoId: event.params.chamadoId, tipo: "CHAMADO_NA_FILA" },
  });
});

/** Chamado transferido/assumido: o técnico recém-atribuído (tecnico
 *  passou de vazio/outro pra um novo login) recebe um aviso. */
export const onChamadoAtualizado = onDocumentUpdated("chamados/{chamadoId}", async (event) => {
  const antes = event.data?.before.data();
  const depois = event.data?.after.data();
  if (!antes || !depois) return;

  const foiAtribuidoAgora = depois.tecnico && depois.tecnico !== antes.tecnico;
  if (!foiAtribuidoAgora) return;

  await notificarLogins([depois.tecnico], {
    titulo: "🙋‍♂️ Chamado atribuído a você",
    corpo: `${depois.titulo} — ${depois.predio} / ${depois.sala}`,
    dados: { chamadoId: event.params.chamadoId, tipo: "CHAMADO_ATRIBUIDO" },
  });
});

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

export const onEventoCriado = onDocumentCreated("eventos/{eventoId}", async (event) => {
  const evento = event.data?.data();
  if (!evento?.tecnico) return;

  await notificarLogins([evento.tecnico], {
    titulo: `🎉 Novo evento escalado: ${evento.tipo === "EXTERNO" ? "externo" : "interno"}`,
    corpo: `${evento.nome} — ${evento.tipo === "INTERNO" ? evento.local : evento.endereco}`,
    dados: { eventoId: event.params.eventoId, tipo: "EVENTO_ESCALADO" },
  });
});

// ---------------------------------------------------------------------------
// Administração de usuários
// ---------------------------------------------------------------------------

/**
 * Admin redefine a senha de outro usuário (pedido do time em 14/08/2026,
 * pro fluxo de onboarding dos técnicos com senha inicial "12345678").
 * Precisa ser Cloud Function porque o SDK client do Firebase Auth só deixa
 * `updatePassword` na própria sessão (`auth.currentUser`) — mudar a senha
 * de outro uid exige Admin SDK, que só roda em servidor.
 */
export const adminRedefinirSenha = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Faça login antes de tentar de novo.");
  }

  const chamadorDoc = await db.doc(`usuarios/${request.auth.uid}`).get();
  const chamador = chamadorDoc.data();
  if (chamador?.perfil !== "ADM") {
    throw new HttpsError("permission-denied", "Só administradores podem redefinir a senha de outra pessoa.");
  }

  const { uid, novaSenha } = (request.data ?? {}) as { uid?: string; novaSenha?: string };
  if (!uid || !novaSenha || novaSenha.length < 6) {
    throw new HttpsError("invalid-argument", "Informe uid e uma nova senha com pelo menos 6 caracteres.");
  }

  await getAuth().updateUser(uid, { password: novaSenha });
  // ⚠️ Réplica deliberada do app original (ver README) — senha em texto
  // puro espelhada no Firestore, igual ao resto do sistema de usuários.
  await db.doc(`usuarios/${uid}`).update({ senha: novaSenha });

  const alvoDoc = await db.doc(`usuarios/${uid}`).get();
  await db.collection("logs").add({
    mensagem: `REDEFINIU A SENHA DE: ${alvoDoc.data()?.login ?? uid}`,
    usuario: chamador?.login ?? request.auth.uid,
    data: Date.now(),
  });

  return { sucesso: true };
});
