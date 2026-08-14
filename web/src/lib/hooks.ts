"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  Agendamento,
  CategoriaEquipamento,
  Chamado,
  Evento,
  ItemInventario,
  LogEntry,
  Predio,
  Servidor,
  Setor,
  Usuario,
} from "@/lib/types";

/** Assina em tempo real uma coleção inteira, ordenada por um campo. */
function useColecao<T>(colecao: string, campoOrdenacao?: string) {
  const [itens, setItens] = useState<T[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const q = campoOrdenacao
      ? query(collection(db, colecao), orderBy(campoOrdenacao, "desc"))
      : query(collection(db, colecao));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItens(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T)));
      setCarregando(false);
    });

    return () => unsubscribe();
  }, [colecao, campoOrdenacao]);

  return { itens, carregando };
}

export function useChamados() {
  const { itens, carregando } = useColecao<Chamado>("chamados", "dataAbertura");
  return { chamados: itens, carregando };
}

export function useInventario() {
  const { itens, carregando } = useColecao<ItemInventario>("inventario", "dataCadastro");
  return { itens, carregando };
}

export function useEventos() {
  const { itens, carregando } = useColecao<Evento>("eventos", "data");
  return { eventos: itens, carregando };
}

export function useUsuarios() {
  const { itens, carregando } = useColecao<Usuario>("usuarios");
  return { usuarios: itens, carregando };
}

export function useAgendamentos() {
  const { itens, carregando } = useColecao<Agendamento>("agendamentos");
  return { agendamentos: itens, carregando };
}

export function useLogs() {
  const { itens, carregando } = useColecao<LogEntry>("logs", "data");
  return { logs: itens.slice(0, 150), carregando };
}

// --- Diretórios de referência (Inventário) -----------------------------------

export function usePredios() {
  const { itens } = useColecao<Predio>("predios");
  return itens;
}

export function useSetores() {
  const { itens } = useColecao<Setor>("setores");
  return itens;
}

export function useServidores() {
  const { itens } = useColecao<Servidor>("servidores");
  return itens;
}

export function useCategoriasEquipamento() {
  const { itens } = useColecao<CategoriaEquipamento>("categoriasEquipamento");
  return itens;
}
