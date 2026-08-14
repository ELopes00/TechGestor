/**
 * Mesmo padrão de login do painel web (web/src/lib/auth.ts): o técnico
 * digita um "login", que vira e-mail fake pro Firebase Auth. Mantido
 * assim por compatibilidade com as contas já existentes.
 */
import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { Usuario } from "./types";

export function gerarEmailFake(login: string) {
  return `${login.trim().toLowerCase().replace(/\s+/g, "")}@techgestor.app`;
}

export async function entrar(login: string, senha: string) {
  const cred = await signInWithEmailAndPassword(auth, gerarEmailFake(login), senha);
  await updateDoc(doc(db, "usuarios", cred.user.uid), { status: "ONLINE" }).catch(() => {});
  return cred.user;
}

export async function sair() {
  if (auth.currentUser) {
    await updateDoc(doc(db, "usuarios", auth.currentUser.uid), { status: "OFFLINE" }).catch(() => {});
  }
  await signOut(auth);
}

export function useUsuarioAtual() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribeDoc?.();
      unsubscribeDoc = null;

      if (!firebaseUser) {
        setUsuario(null);
        setCarregando(false);
        return;
      }

      unsubscribeDoc = onSnapshot(doc(db, "usuarios", firebaseUser.uid), (snap) => {
        setUsuario(snap.exists() ? ({ uid: firebaseUser.uid, ...snap.data() } as Usuario) : null);
        setCarregando(false);
      });
    });

    return () => {
      unsubscribeDoc?.();
      unsubscribeAuth();
    };
  }, []);

  return { usuario, carregando };
}
