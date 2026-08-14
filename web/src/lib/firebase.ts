/**
 * Inicialização única do Firebase no client.
 * Reaproveita a instância existente em hot-reload (Next.js) para não
 * disparar "Firebase App already exists".
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage, connectStorageEmulator } from "firebase/storage";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

/**
 * Modo emulador (Firestore + Auth locais, sem tocar em nenhum projeto
 * Firebase real): `firebase emulators:start` na raiz + esta env var.
 * globalThis guarda se já conectou pra sobreviver ao hot-reload do Next.
 */
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
  const g = globalThis as unknown as { __techgestorEmulatorConectado?: boolean };
  if (!g.__techgestorEmulatorConectado) {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    g.__techgestorEmulatorConectado = true;
  }
}
