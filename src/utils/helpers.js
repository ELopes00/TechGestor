export const getCorPrioridade = (p) => {
  switch (p) {
    case 'ALTA': return '#ff4444';
    case 'MEDIA': return '#ffae00';
    default: return '#1DB954';
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

export const isSlaVencido = (timestamp) => {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return hours >= 2;
};

export const simularDocumento = () => {
  const tipos = ['Relatorio.pdf', 'Foto_Local.jpg', 'Comprovante.pdf'];
  return { id: Date.now().toString(), nome: tipos[Math.floor(Math.random() * tipos.length)] };
};