/**
 * Service Worker de push do navegador (Firebase Cloud Messaging).
 * Mesmo mecanismo do app original — mostra notificação quando a aba do
 * painel está fechada ou em segundo plano.
 *
 * Service workers são arquivos estáticos: não dá pra ler variáveis de
 * ambiente do Next.js em tempo de execução. Por isso a config do Firebase
 * chega via query string na hora do registro (ver src/lib/push.ts,
 * registrarPush()), não hardcoded aqui.
 */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

const params = new URLSearchParams(self.location.search);
firebase.initializeApp({
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const titulo = payload.notification?.title || "TechGestor — Nova atividade";
  const corpo = payload.notification?.body || "Verifique o sistema para mais detalhes.";
  self.registration.showNotification(titulo, { body: corpo, icon: "/favicon.ico" });
});
