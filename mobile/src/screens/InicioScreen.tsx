import { useState } from "react";
import MeusChamadosScreen from "./MeusChamadosScreen";
import ChamadoDetalheScreen from "./ChamadoDetalheScreen";
import type { Chamado, Usuario } from "../lib/types";

interface Props {
  usuario: Usuario;
}

/**
 * Aba "Início" — lista de chamados com abertura de detalhe por cima,
 * mesmo padrão simples (sem biblioteca de navegação) que já existia
 * no App.tsx antes dos Bottom Tabs.
 */
export default function InicioScreen({ usuario }: Props) {
  const [chamadoSelecionado, setChamadoSelecionado] = useState<Chamado | null>(null);

  if (chamadoSelecionado) {
    return (
      <ChamadoDetalheScreen
        chamadoInicial={chamadoSelecionado}
        meuLogin={usuario.login}
        onVoltar={() => setChamadoSelecionado(null)}
      />
    );
  }

  return (
    <MeusChamadosScreen
      meuLogin={usuario.login}
      meuPredio={usuario.predio}
      souAdmin={usuario.perfil === "ADM"}
      onAbrirChamado={setChamadoSelecionado}
    />
  );
}
