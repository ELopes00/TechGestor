"use client";

import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Usuario } from "@/lib/types";

/**
 * O app original não usa e-mail de verdade para login — o técnico digita
 * um "login" (ex: "admin", "Rafael Soares") e o Firebase Auth recebe um
 * e-mail fake gerado a partir dele. Mantido aqui por compatibilidade com
 * as contas já existentes no projeto Firebase.
 */
export function gerarEmailFake(login: string) {
  return `${login.trim().toLowerCase().replace(/\s+/g, "")}@techgestor.app`;
}

export async function entrar(login: string, senha: string, manterConectado: boolean) {
  await setPersistence(auth, manterConectado ? browserLocalPersistence : browserSessionPersistence);
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
