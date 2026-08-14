"use client";

import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { app, db, firebaseConfig } from "@/lib/firebase";

/**
 * Ativa push no navegador (Firebase Cloud Messaging) pro usuário logado.
 * Pede permissão, registra o service worker (passando a config do Firebase
 * via query string — service workers não leem env do Next.js) e salva o
 * token em usuarios/{uid}.fcmToken, de onde a Cloud Function de push lê.
 */
export async function registrarPush(uid: string): Promise<{ sucesso: boolean; erro?: string }> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return { sucesso: false, erro: "Navegador sem suporte a notificações." };
  }
  if (!(await isSupported())) {
    return { sucesso: false, erro: "Navegador sem suporte a Firebase Messaging." };
  }

  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") {
    return { sucesso: false, erro: "Permissão de notificações negada." };
  }

  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(firebaseConfig).map(([k, v]) => [k, v ?? ""]))
  ).toString();
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`);

  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) return { sucesso: false, erro: "Não foi possível gerar o token de notificação." };

  await updateDoc(doc(db, "usuarios", uid), { fcmToken: token });
  return { sucesso: true };
}

/** Notificação chegando com a aba aberta (background message não dispara aqui). */
export function ouvirPushEmPrimeiroPlano(aoReceber: (titulo: string, corpo: string) => void) {
  if (typeof window === "undefined") return () => {};
  const messaging = getMessaging(app);
  return onMessage(messaging, (payload) => {
    aoReceber(payload.notification?.title ?? "TechGestor", payload.notification?.body ?? "");
  });
}
