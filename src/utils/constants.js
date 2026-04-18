export const SETORES = ['Administrativo', 'Criminal', 'Civel', 'Palacio', 'Latife', 'Chamado Externo', 'SUBCS'];

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

export const DEFAULT_USERS = [
  { login: 'admin', senha: '123', perfil: 'ADM', status: 'ONLINE', predio: 'Administrativo', inicio: 8, saida: 17 },
  { login: 'Adriel Carvalho', senha: '123', perfil: 'TECNICO', status: 'ONLINE', predio: 'Administrativo', inicio: 8, saida: 17 },
  { login: 'Rafael Soares', senha: '123', perfil: 'TECNICO', status: 'ONLINE', predio: 'Administrativo', inicio: 9, saida: 18 },
  { login: 'Filipe Costa', senha: '123', perfil: 'TECNICO', status: 'ONLINE', predio: 'Palacio', inicio: 8, saida: 17 },
  { login: 'Gabrielle Batistot', senha: '123', perfil: 'TECNICO', status: 'ONLINE', predio: 'Palacio', inicio: 9, saida: 18 },
  { login: 'Keittony Rodrigo', senha: '123', perfil: 'TECNICO', status: 'ONLINE', predio: 'Latife', inicio: 8, saida: 17 },
  { login: 'Ricardo Marques', senha: '123', perfil: 'TECNICO', status: 'ONLINE', predio: 'Latife', inicio: 9, saida: 18 },
  { login: 'Fabio Lima', senha: '123', perfil: 'TECNICO', status: 'ONLINE', predio: 'Criminal', inicio: 8, saida: 17 },
  { login: 'Fernando Nascimento', senha: '123', perfil: 'TECNICO', status: 'ONLINE', predio: 'Criminal', inicio: 9, saida: 18 },
  { login: 'Hellen Crys', senha: '123', perfil: 'TECNICO', status: 'ONLINE', predio: 'Civel', inicio: 8, saida: 17 },
  { login: 'James Viana', senha: '123', perfil: 'TECNICO', status: 'ONLINE', predio: 'Civel', inicio: 9, saida: 18 },
  { login: 'Jonas Silva', nomeCompleto: 'JONAS DE SOUSA SILVA', senha: '123', perfil: 'TECNICO', status: 'ONLINE', predio: 'SUBCS', inicio: 8, saida: 17 },
  { login: 'Angel Lima', nomeCompleto: 'ANGEL FABIO REBELO DE LIMA', senha: '123', perfil: 'TECNICO', status: 'ONLINE', predio: 'SUBCS', inicio: 8, saida: 17 },
  { login: 'Bruno Benedetto', nomeCompleto: 'BRUNO MELO DE BENEDETTO', senha: '123', perfil: 'TECNICO', status: 'ONLINE', predio: 'SUBCS', inicio: 8, saida: 17 },
  { login: 'Francisco Junior', nomeCompleto: 'FRANCISCO WILKER SOUSA CASTRO JÚNIOR', senha: '123', perfil: 'TECNICO', status: 'ONLINE', predio: 'SUBCS', inicio: 8, saida: 17 },
];