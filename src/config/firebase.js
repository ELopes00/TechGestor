import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBpgjmA9h1yuExOKxCAbQBy7NYdH9PerJs",
  authDomain: "techgestor-bd.firebaseapp.com",
  projectId: "techgestor-bd",
  storageBucket: "techgestor-bd.firebasestorage.app",
  messagingSenderId: "1020969618268",
  appId: "1:1020969618268:web:afa267b785caaff9f58f99",
  measurementId: "G-RXE0E0R2ZX"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Banco de Dados e a Autenticação
export const db = getFirestore(app);

export const auth = getAuth(app);