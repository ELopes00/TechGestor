import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";
import type { Chamado } from "./types";

/** Assina em tempo real todos os chamados, mais recentes primeiro. */
export function useChamados() {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "chamados"), orderBy("dataAbertura", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setChamados(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Chamado)));
        setCarregando(false);
      },
      (erro) => {
        console.error("Erro ao assinar chamados:", erro);
        setCarregando(false);
      }
    );
    return () => unsubscribe();
  }, []);

  return { chamados, carregando };
}
