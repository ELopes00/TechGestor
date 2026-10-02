// MODO DEMONSTRAÇÃO: substitui src/lib/data.js com dados fictícios em memória. Gravações não fazem nada.
const now = Date.now(), H = 3600000;
const users = [
  { id: 'u1', uid: 'u1', login: 'demo', nomeCompleto: 'Usuário Demonstração', perfil: 'ADM', predio: 'SUBCS', status: 'ONLINE', inicio: 8, saida: 17 },
  { id: 'u2', login: 'lucas.p', nomeCompleto: 'Lucas Pinheiro', perfil: 'TECNICO', nivel: 'N2', predio: 'Criminal', status: 'ONLINE', inicio: 8, saida: 17 },
  { id: 'u3', login: 'mariana.v', nomeCompleto: 'Mariana Vasconcelos', perfil: 'TECNICO', nivel: 'N3', predio: 'Civel', status: 'ALMOCO', inicio: 7, saida: 16 },
  { id: 'u4', login: 'eduardo.y', nomeCompleto: 'Eduardo Yanomami', perfil: 'TECNICO', nivel: 'N1', predio: 'Palacio', status: 'OFFLINE', inicio: 12, saida: 19 },
];
const chamados = [
  { id: 'c1', protocolo: '2026-11841', titulo: 'Falha de áudio no gravador de audiência', descricao: 'Microfone sem sinal na sala de audiências.', solicitante: 'Dr. Eduardo Vasconcelos', sala: 'Plenário 03', predio: 'Criminal', prioridade: 'CRITICA', status: 'Em andamento', tecnico: 'lucas.p', dataAbertura: now - 2 * H, checklist: [{ id: 1, text: 'Verificou cabos', checked: true }, { id: 2, text: 'Reiniciou', checked: false }], historico: [{ user: 'lucas.p', texto: 'Estou a caminho.', time: now - H }, { user: 'SISTEMA', texto: '✅ lucas.p assumiu o chamado da fila.', time: now - 1.5 * H }], notasInternas: [] },
  { id: 'c2', protocolo: '2026-11839', titulo: 'Token PJe não reconhecido', descricao: 'Assinador não encontra o certificado.', solicitante: 'Ana Souza', sala: 'Gabinete 12', predio: 'Civel', prioridade: 'ALTA', status: 'Aguardando atendimento', tecnico: '', dataAbertura: now - 30 * 60000, historico: [] },
  { id: 'c3', protocolo: '2026-11835', titulo: 'Switch PoE sem link', descricao: 'Rack do 2º andar.', solicitante: 'Marcos Silva', sala: 'Rack 2', predio: 'Palacio', prioridade: 'MEDIA', status: 'Aguardando peça', tecnico: 'mariana.v', dataAbertura: now - 5 * H, historico: [] },
  { id: 'c4', protocolo: '2026-11829', titulo: 'Ponto de rede para estagiários', descricao: 'Instalar tomada RJ-45.', solicitante: 'Secretaria Geral', sala: 'Sala 4', predio: 'Palacio', prioridade: 'BAIXA', status: 'finalizado', tecnico: 'eduardo.y', dataAbertura: now - 6 * H, dataFechamento: now - H, historico: [] },
];
const logs = Array.from({ length: 30 }, (_, i) => ({ id: 'l' + i, data: now - i * 40 * 60000, usuario: users[i % 4].login, mensagem: ['LOGOU NO SISTEMA (Dentro do expediente)', '📝 COMENTOU CHAMADO #2026-11841', 'ALERTA: LOGOU NO SISTEMA FORA DO EXPEDIENTE (20h)', 'CRIOU ITEM INVENTÁRIO: Ana', 'ALTEROU STATUS PARA: ALMOCO'][i % 5] }));
const inventario = [{ id: 'i1', nome: 'Ana Souza', responsavel: 'Ana Souza', matricula: '00123', predio: 'Civel', setor: '2ª Vara Cível', local: 'Gab 12', dataCadastro: now - 50 * H, equipamentosUnificados: [{ id: 'e1', tipo: 'CPU', marca: 'Dell', tombo: 'TJ1001', status: 'Disponível' }, { id: 'e2', tipo: 'Monitor', marca: 'LG', tombo: 'TJ1002', status: 'Indisponível' }] }];
const iso = (d) => new Date(now + d * 864e5).toISOString().slice(0, 10);
const eventos = [{ id: 'v1', nome: 'Sessão Solene', tipo: 'INTERNO', local: 'Auditório', solicitante: 'Cerimonial', tecnico: 'lucas.p', status: 'Em andamento', dataEvento: iso(2), dataInstalacao: iso(1), material: '2 microfones', data: now, historico: [] }];
const agendamentos = [{ id: 'a1', data: iso(0), hora: '09:00', servico: 'Formatar PC do gabinete 3', tecnico: 'mariana.v', marcadoPor: 'demo' }];
const live = (arr) => (cb) => { setTimeout(() => cb(structuredClone(arr)), 50); return () => {}; };
const ok = async () => ({ id: 'novo' });
export const emailDoLogin = (l) => l;
export const subscribeChamados = live(chamados);
export const subscribeChamado = (id, cb) => { setTimeout(() => cb(chamados.find((c) => c.id === id) || null), 50); return () => {}; };
export const subscribeUsuarios = live(users);
export const subscribeLogs = live(logs);
export const subscribeInventario = live(inventario);
export const subscribeEventos = live(eventos);
export const subscribeAgendamentos = live(agendamentos);
export const subscribeProntuario = (id, cb) => { setTimeout(() => cb([{ acao: 'CADASTRO', detalhes: 'Equipamento registrado.', usuario: 'carlos.m', data: now }]), 50); return () => {}; };
export const buscarLogs = async (de, ate) => logs.filter((l) => l.data >= de && l.data <= ate).reverse();
export const getUsuario = async () => users[0];
export const salvarChamado = ok, atualizarChamado = ok, atualizarUsuario = ok, deletarUsuario = ok, registrarUsuario = ok, mudarMinhaSenha = ok,
  salvarItemInventario = ok, atualizarItemInventario = ok, deletarItemInventario = ok, registrarNoProntuario = ok, salvarEvento = ok,
  atualizarEvento = ok, deletarEvento = ok, salvarAgendamento = ok, atualizarAgendamento = ok, deletarAgendamento = ok, salvarLog = ok;
