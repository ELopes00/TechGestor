import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBpgjmA9h1yuExOKxCAbQBy7NYdH9PerJs",
  authDomain: "techgestor-bd.firebaseapp.com",
  projectId: "techgestor-bd",
  storageBucket: "techgestor-bd.firebasestorage.app",
  messagingSenderId: "1020969618268",
  appId: "1:1020969618268:web:afa267b785caaff9f58f99"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);