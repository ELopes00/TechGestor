// Importa os scripts do Firebase diretamente da CDN do Google
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

// Inicializa o Firebase no Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyBpgjmA9h1yuExOKxCAbQBy7NYdH9PerJs",
  authDomain: "techgestor-bd.firebaseapp.com",
  projectId: "techgestor-bd",
  storageBucket: "techgestor-bd.firebasestorage.app",
  messagingSenderId: "1020969618268",
  appId: "1:1020969618268:web:afa267b785caaff9f58f99"
});

const messaging = firebase.messaging();

// O "Guarda-Costas": Fica à escuta de mensagens quando o site está fechado ou em 2º plano
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Notificação recebida em background: ', payload);
  
  // Customiza a aparência da notificação que vai pular no canto do monitor
  const notificationTitle = payload.notification?.title || 'TechGestor - Nova Atividade';
  const notificationOptions = {
    body: payload.notification?.body || 'Verifique o sistema para mais detalhes.',
    icon: '/favicon.ico' // Usa o ícone que já existe na sua pasta public/assets
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});