// Regras e formatações dos chamados — portadas de src/utils/helpers.js do app.

export const SETORES = ['Administrativo', 'Criminal', 'Civel', 'Palacio', 'Latife', 'Chamado Externo', 'SUBCS'];
export const PRIORIDADES = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];
export const NIVEIS_TECNICO = ['N1', 'N2', 'N3'];
export const STATUS_CHAMADO = ['Aguardando atendimento', 'Em andamento', 'Aguardando peça', 'Em deslocamento', 'finalizado'];
export const CHECKLIST_PADRAO = [
  { id: 1, text: 'Verificou cabos de energia/rede', checked: false },
  { id: 2, text: 'Reiniciou o equipamento', checked: false },
  { id: 3, text: 'Testou a solução com usuário', checked: false },
  { id: 4, text: 'Preencheu o log de sistema', checked: false },
];
export const FRASES_RAPIDAS = ['✅ Serviço finalizado.', '📍 Estou a caminho.', '⏳ Aguardando peça.', '👤 Usuário ausente.', '🔧 Testes em andamento.'];

export const SLA_HORAS = { CRITICA: 1, ALTA: 4, MEDIA: 24, BAIXA: 72 };

export const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const getStatusCategoria = (status) => {
  if (!status) return 'ABERTO';
  const s = status.toLowerCase();
  if (s.includes('finalizad') || s.includes('fechad') || s.includes('conclu')) return 'CONCLUIDO';
  if (s.includes('aguardando')) return 'ABERTO';
  return 'ANDAMENTO';
};
export const isFechado = (status) => getStatusCategoria(status) === 'CONCLUIDO';

// Data de fechamento: campo próprio ou, em chamados antigos, a mensagem de fechamento no histórico.
export function getDataFechamento(c) {
  if (!c) return null;
  if (c.dataFechamento) return c.dataFechamento;
  const msg = c.historico?.find((h) => /CHAMADO FINALIZADO|CHAMADO FECHADO|Status atualizado: finalizado/.test(h.texto || ''));
  return msg ? msg.time : null;
}

export const slaLimiteMs = (c) => (SLA_HORAS[c?.prioridade] || SLA_HORAS.MEDIA) * 3600000;
export const isSlaVencido = (c) => !!c?.dataAbertura && Date.now() - c.dataAbertura >= slaLimiteMs(c);
export const fracaoSla = (c) => (c?.dataAbertura ? (Date.now() - c.dataAbertura) / slaLimiteMs(c) : 0);

/** Texto do SLA restante ("18m restantes", "Vencido há 2h"). */
export function slaTexto(c) {
  if (!c?.dataAbertura) return '—';
  const resta = c.dataAbertura + slaLimiteMs(c) - Date.now();
  const fmt = (ms) => {
    const m = Math.round(Math.abs(ms) / 60000);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h}h ${m % 60}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
  };
  return resta >= 0 ? `${fmt(resta)} restantes` : `Vencido há ${fmt(resta)}`;
}

export const formatProtocolo = (c) => {
  if (!c) return '#----';
  if (c.protocolo) return `#${c.protocolo}`;
  const ano = c.dataAbertura ? new Date(c.dataAbertura).getFullYear() : new Date().getFullYear();
  return `#${ano}-${String(c.id || '').substring(0, 4).toUpperCase()}`;
};
export const gerarProtocolo = () => `${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

export const getIniciais = (nome) => {
  const p = String(nome || '').replace(/[._-]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '--';
  return p.length === 1 ? p[0].substring(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

export function tempoRelativo(ts) {
  if (!ts) return '—';
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'Ontem' : `${d}d atrás`;
}

const TZ = 'America/Boa_Vista';
export const dataHora = (ts) =>
  ts ? new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }).format(new Date(ts)) : '—';
export const hora = (ts) =>
  ts ? new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(ts)) : '';
export const ehHoje = (ts) => !!ts && new Date(ts).toDateString() === new Date().toDateString();

// Selos no estilo do DESIGN.md (P1 crítica ... P4 baixa).
export const PRIORIDADE_UI = {
  CRITICA: { label: 'Crítica', cls: 'bg-error-container text-on-error-container', dot: 'bg-error' },
  ALTA: { label: 'Alta', cls: 'bg-[#fffbeb] text-[#b45309] dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
  MEDIA: { label: 'Média', cls: 'bg-secondary-fixed text-on-secondary-fixed-variant', dot: 'bg-secondary' },
  BAIXA: { label: 'Baixa', cls: 'bg-surface-container text-on-surface-variant', dot: 'bg-outline' },
};
export const prioridadeUI = (p) => PRIORIDADE_UI[p] || PRIORIDADE_UI.BAIXA;

export function statusUI(status) {
  const cat = getStatusCategoria(status);
  const label = status === 'finalizado' ? 'Concluído' : status || 'Aguardando atendimento';
  if (cat === 'CONCLUIDO') return { label, cls: 'bg-tertiary-fixed text-on-tertiary-fixed-variant', icon: 'check_circle' };
  if (cat === 'ABERTO') return { label, cls: 'bg-surface-container-high text-on-surface-variant', icon: 'schedule' };
  return { label, cls: 'bg-secondary-fixed text-on-secondary-fixed-variant', icon: 'autorenew' };
}

export const USUARIO_STATUS_UI = {
  ONLINE: { label: 'Disponível', dot: 'bg-on-tertiary-container' },
  ALMOCO: { label: 'Almoço', dot: 'bg-amber-500' },
  EVENTO: { label: 'Em evento', dot: 'bg-secondary' },
  INDISPONIVEL: { label: 'Indisponível', dot: 'bg-error' },
  OFFLINE: { label: 'Offline', dot: 'bg-outline' },
};
export const usuarioStatusUI = (s) => USUARIO_STATUS_UI[s] || USUARIO_STATUS_UI.OFFLINE;
