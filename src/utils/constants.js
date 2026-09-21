export const SETORES = ['Administrativo', 'Criminal', 'Civel', 'Palacio', 'Latife', 'Chamado Externo', 'SUBCS'];

export const PRIORIDADES = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];

export const NIVEIS_TECNICO = ['N1', 'N2', 'N3'];

// Hospedado no próprio Firebase Hosting (public/techgestor-app.dat) — link
// permanente, ao contrário do artefato do EAS Build que expira em 30 dias.
// Sem extensão .apk na URL porque o plano gratuito do Firebase Hosting bloqueia
// arquivos executáveis por extensão; o nome/tipo de download corretos são
// forçados via header Content-Disposition (ver firebase.json).
export const APK_DOWNLOAD_URL = 'https://techgestor-tjrr.web.app/techgestor-app.dat';

export const FRASES_RAPIDAS = [
  '✅ Serviço finalizado.', '📍 Estou a caminho.', '⏳ Aguardando peça.', '👤 Usuário ausente.', '🔧 Testes em andamento.'
];

export const CHECKLIST_PADRAO = [
  { id: 1, text: 'Verificou cabos de energia/rede', checked: false },
  { id: 2, text: 'Reiniciou o equipamento', checked: false },
  { id: 3, text: 'Testou a solução com usuário', checked: false },
  { id: 4, text: 'Preencheu o log de sistema', checked: false },
];

export const CHECKLIST_EVENTO = [
  { id: 1, text: 'Verificar equipamentos de som/vídeo', checked: false },
  { id: 2, text: 'Organizar cabeamento no local', checked: false },
  { id: 3, text: 'Testar conexão de internet', checked: false },
  { id: 4, text: 'Validar setup com responsável', checked: false },
];
