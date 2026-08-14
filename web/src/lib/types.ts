/**
 * Tipos compartilhados — realinhados com o app real (repositório exportado
 * em 12/08/2026: App.js, src/services/DataService.js, src/screens/*.js).
 * Timestamps seguem o padrão do app original: number (Date.now()), não
 * Firestore Timestamp — é o que já está gravado no banco de produção.
 */

// ---------------------------------------------------------------------------
// Usuários
// ---------------------------------------------------------------------------

export type Papel = "ADM" | "TECNICO";
export type StatusUsuario = "ONLINE" | "OFFLINE" | "EVENTO" | "ALMOCO" | "INDISPONIVEL";

/** As 7 unidades usadas em chamados/eventos/usuários (diferente do grande
 *  diretório de prédios/setores do TJRR, que só o Inventário usa). */
export const UNIDADES = [
  "Administrativo",
  "Criminal",
  "Civel",
  "Palacio",
  "Latife",
  "Chamado Externo",
  "SUBCS",
] as const;
export type Unidade = (typeof UNIDADES)[number];

export interface Usuario {
  /** ID do documento Firestore (usuarios/{id}) — sempre presente, vem de
   *  toda leitura via hooks.ts. `uid` (abaixo) só existe garantidamente
   *  quando lido via useUsuarioAtual(); em listas (useUsuarios()) pode
   *  faltar se a conta foi criada sem gravar o campo `uid` no próprio
   *  documento — use `id` pra key de lista e referências a documento. */
  id?: string;
  uid: string;
  login: string;
  nomeCompleto?: string;
  emailContato?: string;
  /** ⚠️ Réplica deliberada do comportamento do app original (decisão do
   *  time em 12/08/2026, ver README) — senha em texto puro no Firestore.
   *  Não é boa prática; marcado para remoção numa iteração futura. */
  senha?: string;
  perfil: Papel;
  predio: Unidade | string;
  inicio: number;
  saida: number;
  status: StatusUsuario;
  /** Token do app mobile (Expo push) — técnico. */
  expoPushToken?: string;
  /** Token do navegador (Firebase Cloud Messaging) — normalmente gestor/web. */
  fcmToken?: string;
}

/** ONLINE/OFFLINE reais dependem do horário de expediente do usuário. */
export function statusRealUsuario(u: Pick<Usuario, "inicio" | "saida" | "status">, horaAtual = new Date().getHours()): StatusUsuario {
  const inicio = u.inicio ?? 8;
  const saida = u.saida ?? 17;
  const noHorario = inicio < saida ? horaAtual >= inicio && horaAtual < saida : horaAtual >= inicio || horaAtual < saida;
  if (!noHorario) return "OFFLINE";
  if (!u.status || u.status === "OFFLINE") return "ONLINE";
  return u.status;
}

// ---------------------------------------------------------------------------
// Chamados
// ---------------------------------------------------------------------------

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

export interface Anexo {
  id: string;
  nome: string;
  uri: string;
  type: "doc" | "imagem";
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
  predio: Unidade | string;
  status: StatusChamado;
  tecnico: string;
  prioridade: Prioridade;
  dataAbertura: number;
  equipamento?: EquipamentoVinculado | null;
  historico: MensagemHistorico[];
  anexos?: Anexo[];
  checklist: ItemChecklist[];
  abertoPor: string;
}

export const CHECKLIST_PADRAO: ItemChecklist[] = [
  { id: 1, text: "Verificou cabos de energia/rede", checked: false },
  { id: 2, text: "Reiniciou o equipamento", checked: false },
  { id: 3, text: "Testou a solução com usuário", checked: false },
  { id: 4, text: "Preencheu o log de sistema", checked: false },
];

export function chamadoFechado(status: StatusChamado): boolean {
  return status === "finalizado";
}

/** SLA vencido = mais de 2h aberto sem chegar a um status final. */
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

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

export type TipoEvento = "INTERNO" | "EXTERNO";

export interface Evento {
  id: string;
  nome: string;
  tipo: TipoEvento;
  tecnico: string;
  status: StatusChamado;
  data: number;

  local?: string | null;
  ramal?: string | null;
  cliente?: string | null;
  endereco?: string | null;

  solicitante?: string;
  contato?: string;
  material?: string;
  dataInstalacao?: string;
  dataEvento?: string;

  historico: MensagemHistorico[];
  notas?: string;
  transporte?: string;
  km?: number;
}

// ---------------------------------------------------------------------------
// Inventário
// ---------------------------------------------------------------------------

export interface EquipamentoUnificado {
  id: string;
  tipo: string;
  marca: string;
  tombo: string;
  status: "Disponível" | "Indisponível";
}

export interface RegistoAuditoria {
  data: number;
  texto: string;
  autor: string;
}

export interface ItemInventario {
  id: string;
  nome: string;
  pat: string;
  responsavel: string;
  matricula?: string;
  setor: string;
  predio: string;
  local?: string;
  responsavelPeca?: string;
  cpuMarca?: string;
  cpuTombo?: string;
  equipamentosUnificados: EquipamentoUnificado[];
  emprestadoPara: string | null;
  dataEmprestimo?: number | null;
  dataCadastro: number;
  /** Rastro de auditoria do "Painel Analítico" (falhas apontadas, registro
   *  inicial etc.) — ver web/src/app/(painel)/inventario/page.tsx. */
  auditoria?: RegistoAuditoria[];
}

// ---------------------------------------------------------------------------
// Agenda / Logs
// ---------------------------------------------------------------------------

export interface Agendamento {
  id: string;
  data: string; // "YYYY-MM-DD"
  servico: string;
  hora: string; // "HH:mm"
  tecnico: string;
  status: string;
  marcadoPor: string;
}

export interface LogEntry {
  id: string;
  mensagem: string;
  usuario: string;
  data: number;
}

// ---------------------------------------------------------------------------
// Diretórios de referência (TJRR real — só o Inventário usa; ver
// backend/seed/). Independentes das UNIDADES acima.
// ---------------------------------------------------------------------------

export interface Predio {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface Setor {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface CategoriaEquipamento {
  categoria: string;
  marcasModelos: string[];
}

export interface Servidor {
  nome: string;
  matricula: string;
}
