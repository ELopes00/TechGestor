/**
 * Subconjunto de web/src/lib/types.ts necessário pra tela de detalhes do
 * chamado. Ver backend/firestore-schema.md pro modelo completo.
 */

export type Papel = "ADM" | "TECNICO";
export type StatusUsuario = "ONLINE" | "OFFLINE" | "EVENTO" | "ALMOCO" | "INDISPONIVEL";

export interface Usuario {
  uid: string;
  login: string;
  nome?: string;
  nomeCompleto?: string;
  perfil: Papel;
  predio: string;
  status: StatusUsuario;
  expoPushToken?: string;
}

export type StatusChamado =
  | "Aguardando atendimento"
  | "Em andamento"
  | "Em separação de equipamentos"
  | "Instalado"
  | "finalizado";

export const STATUS_CHAMADO_OPCOES: StatusChamado[] = [
  "Aguardando atendimento",
  "Em andamento",
  "Em separação de equipamentos",
  "Instalado",
  "finalizado",
];

export type Prioridade = "NORMAL" | "MEDIA" | "ALTA";

export interface MensagemHistorico {
  user: string;
  texto: string;
  time: number;
}

export interface ItemChecklist {
  id: number;
  text: string;
  checked: boolean;
}

export interface EquipamentoVinculado {
  nome: string;
  pat: string;
}

export interface Chamado {
  id: string;
  titulo: string;
  solicitante: string;
  sala: string;
  descricao: string;
  observacao?: string;
  predio: string;
  status: StatusChamado;
  tecnico: string;
  prioridade: Prioridade;
  dataAbertura: number;
  equipamento?: EquipamentoVinculado | null;
  historico: MensagemHistorico[];
  checklist: ItemChecklist[];
  abertoPor: string;
}

export function chamadoFechado(status: StatusChamado): boolean {
  return status === "finalizado";
}

export function slaVencido(dataAbertura: number): boolean {
  return Date.now() - dataAbertura >= 2 * 60 * 60 * 1000;
}

export function corPrioridade(p: Prioridade): string {
  switch (p) {
    case "ALTA":
      return "#d63b3b";
    case "MEDIA":
      return "#e6a817";
    default:
      return "#1a9c5c";
  }
}
