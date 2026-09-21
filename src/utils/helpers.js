export const getCorPrioridade = (p, theme) => {
  switch (p) {
    case 'CRITICA': return theme ? theme.offline : '#EF4444';
    case 'ALTA': return theme ? theme.sec : '#F59E0B';
    case 'MEDIA': return theme ? theme.primary : '#0284C7';
    default: return theme ? theme.online : '#10B981';
  }
};

export const getCorStatus = (s, theme) => {
  switch (s) {
    case 'ONLINE': return theme.online;
    case 'OFFLINE': return theme.offline;
    case 'ALMOCO': return theme.busy;
    default: return theme.subtext;
  }
};

export const getTempoDecorrido = (timestamp) => {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 24) return `${Math.floor(hours / 24)}d atrás`;
  return hours > 0 ? `${hours}h atrás` : `${minutes}m atrás`;
};

// Prazo de SLA por severidade (horas). Ajustável conforme a realidade do setor.
export const SLA_HORAS_POR_SEVERIDADE = { CRITICA: 1, ALTA: 4, MEDIA: 24, BAIXA: 72 };

export const isSlaVencido = (chamado) => {
  if (!chamado || !chamado.dataAbertura) return false;
  const horasLimite = SLA_HORAS_POR_SEVERIDADE[chamado.prioridade] || SLA_HORAS_POR_SEVERIDADE.MEDIA;
  const diff = Date.now() - chamado.dataAbertura;
  const horas = diff / (1000 * 60 * 60);
  return horas >= horasLimite;
};

// Fração do prazo de SLA já decorrida (0 a 1+). Usada para avisar antes do
// estouro, não só para marcar "ATRASADO" depois que já passou do prazo.
export const fracaoSlaDecorrida = (chamado) => {
  if (!chamado || !chamado.dataAbertura) return 0;
  const horasLimite = SLA_HORAS_POR_SEVERIDADE[chamado.prioridade] || SLA_HORAS_POR_SEVERIDADE.MEDIA;
  const horas = (Date.now() - chamado.dataAbertura) / (1000 * 60 * 60);
  return horas / horasLimite;
};

// Normaliza os vários textos de status usados historicamente nos chamados
// em 3 categorias, usadas pelos KPIs/gráficos do Dashboard.
export const getStatusCategoria = (status) => {
  if (!status) return 'ABERTO';
  const s = status.toLowerCase();
  if (s.includes('finalizad') || s.includes('fechad') || s.includes('conclu')) return 'CONCLUIDO';
  if (s.includes('aguardando')) return 'ABERTO';
  return 'ANDAMENTO';
};

// Data/hora de fechamento de um chamado: usa o campo dedicado quando existe
// (chamados fechados após esta atualização) ou procura no histórico
// (chamados antigos, fechados antes do campo existir).
export const getDataFechamento = (chamado) => {
  if (!chamado) return null;
  if (chamado.dataFechamento) return chamado.dataFechamento;
  const msgFinal = chamado.historico?.find(h =>
    h.texto?.includes('CHAMADO FINALIZADO') || h.texto?.includes('CHAMADO FECHADO') || h.texto?.includes('Status atualizado: finalizado')
  );
  return msgFinal ? msgFinal.time : null;
};

// % de chamados finalizados que fecharam dentro do prazo de SLA da própria severidade.
export const calcularSLA = (chamados = []) => {
  const finalizados = chamados.filter(c => getStatusCategoria(c.status) === 'CONCLUIDO' && c.dataAbertura);
  if (finalizados.length === 0) return null;
  const dentroDoPrazo = finalizados.filter(c => {
    const fechamento = getDataFechamento(c);
    if (!fechamento) return false;
    const horasLimite = SLA_HORAS_POR_SEVERIDADE[c.prioridade] || SLA_HORAS_POR_SEVERIDADE.MEDIA;
    const horasGastas = (fechamento - c.dataAbertura) / (1000 * 60 * 60);
    return horasGastas <= horasLimite;
  });
  return Math.round((dentroDoPrazo.length / finalizados.length) * 100);
};

// Tempo médio de resolução (MTTR), em minutos, dos chamados finalizados.
export const calcularMTTR = (chamados = []) => {
  const tempos = chamados
    .filter(c => getStatusCategoria(c.status) === 'CONCLUIDO' && c.dataAbertura)
    .map(c => {
      const fechamento = getDataFechamento(c);
      return fechamento ? fechamento - c.dataAbertura : null;
    })
    .filter(Boolean);
  if (tempos.length === 0) return null;
  const mediaMs = tempos.reduce((soma, t) => soma + t, 0) / tempos.length;
  return Math.round(mediaMs / 60000);
};

export const formatarMinutos = (minutos) => {
  if (minutos == null) return '—';
  if (minutos < 60) return `${minutos}min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto > 0 ? `${horas}h ${resto}min` : `${horas}h`;
};

// Interpreta datas em formato livre BR (DD/MM, DD/MM/AA ou DD/MM/AAAA), digitadas
// no campo "Data do Evento". Como o campo é texto livre (não um seletor de data),
// isso é best-effort: se o técnico digitar fora desse padrão, retorna null e o
// lembrete simplesmente não é agendado para aquele evento.
export const parseDataBR = (str, horaStr) => {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (!m) return null;
  const dia = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10) - 1;
  let ano = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
  if (ano < 100) ano += 2000;
  let hora = 9, minuto = 0;
  const hm = String(horaStr || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (hm) { hora = parseInt(hm[1], 10); minuto = parseInt(hm[2], 10); }
  const d = new Date(ano, mes, dia, hora, minuto, 0, 0);
  return isNaN(d.getTime()) ? null : d;
};

// Interpreta a data do evento no formato confiável YYYY-MM-DD, gerado pelo
// seletor de calendário (substituiu o campo de texto livre).
export const parseDataISO = (str) => {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 9, 0, 0, 0);
  return isNaN(d.getTime()) ? null : d;
};

export const formatDataISOParaBR = (str) => {
  const m = String(str || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return str || '';
  return `${m[3]}/${m[2]}/${m[1]}`;
};

// Constrói a data/hora de um agendamento a partir dos campos confiáveis
// `data` (YYYY-MM-DD, gerado pelo calendário) e `hora` (HH:MM).
export const getDataHoraAgendamento = (agendamento) => {
  if (!agendamento?.data) return null;
  const hm = String(agendamento.hora || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  const hora = hm ? parseInt(hm[1], 10) : 8;
  const minuto = hm ? parseInt(hm[2], 10) : 0;
  const [ano, mes, dia] = agendamento.data.split('-').map((n) => parseInt(n, 10));
  if (!ano || !mes || !dia) return null;
  const d = new Date(ano, mes - 1, dia, hora, minuto, 0, 0);
  return isNaN(d.getTime()) ? null : d;
};

export const simularDocumento = () => {
  const tipos = ['Relatorio.pdf', 'Foto_Local.jpg', 'Comprovante.pdf'];
  return { id: Date.now().toString(), nome: tipos[Math.floor(Math.random() * tipos.length)] };
};
