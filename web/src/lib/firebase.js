// Mesmo projeto Firebase do app TechGestor (Expo): usuários e dados compartilhados.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: 'AIzaSyBpgjmA9h1yuExOKxCAbQBy7NYdH9PerJs',
  authDomain: 'techgestor-bd.firebaseapp.com',
  projectId: 'techgestor-bd',
  storageBucket: 'techgestor-bd.firebasestorage.app',
  messagingSenderId: '1020969618268',
  appId: '1:1020969618268:web:afa267b785caaff9f58f99',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
