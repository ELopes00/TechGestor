import 'react-native-gesture-handler';

/**
 * ==========================================
 * TECHGESTOR - Sistema de Gestão de TI
 * ==========================================
 * Desenvolvido por: Pedro Gabriel Pereira das Neves e Ezequiel Castro
 * Ano: 2026
 * Todos os direitos reservados.
 * ==========================================
 */

import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import AdminScreen from './src/screens/AdminScreen';
import AgendamentoScreen from './src/screens/AgendamentoScreen';
import ChamadosScreen from './src/screens/ChamadosScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import EventosScreen from './src/screens/EventosScreen';
import InventarioScreen from './src/screens/InventarioScreen';
import LoginScreen from './src/screens/LoginScreen';
import LogsScreen from './src/screens/LogsScreen';
import PerfilScreen from './src/screens/PerfilScreen';
import WebDownloadWidget from './src/components/WebDownloadWidget';

import Sidebar from './src/components/Sidebar';
import { DataService } from './src/services/DataService';
import { THEMES } from './src/theme/themes';
import { fracaoSlaDecorrida, getDataHoraAgendamento, parseDataBR, parseDataISO } from './src/utils/helpers';

// COMENTADO PARA PERMITIR VER ERROS NO TELEFONE DURANTE OS TESTES
// LogBox.ignoreAllLogs();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const [authUser, setAuthUser] = useState(null); 
  const [user, setUser] = useState(null); 
  const [isInitializing, setIsInitializing] = useState(true);

  const [users, setUsers] = useState([]);
  const [chamados, setChamados] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [inventario, setInventario] = useState([]); 
  const [agendamentos, setAgendamentos] = useState([]); 
  const [logs, setLogs] = useState([]); 

  const [telaAtiva, setTelaAtiva] = useState('DASHBOARD');
  const [filtroChamadosInicial, setFiltroChamadosInicial] = useState('TODOS');
  const [origemDashboard, setOrigemDashboard] = useState(false);

  const irParaChamados = (statusFiltro) => {
    setFiltroChamadosInicial(statusFiltro);
    setOrigemDashboard(true);
    setTelaAtiva('CHAMADOS');
  };

  // Navegação normal (sidebar): sempre restaura o formulário de Novo Chamado,
  // só fica oculto quando se chega via um card filtrado do Dashboard.
  const mudarTela = (tela) => {
    setOrigemDashboard(false);
    setTelaAtiva(tela);
  };
  const [isDarkMode, setIsDarkMode] = useState(true);

  const { width } = useWindowDimensions();
  const isMobile = width < 768; 
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const theme = THEMES[isDarkMode ? 'dark' : 'light'];

  // 1. Verifica quem está logado antes de tudo
  useEffect(() => {
    const unsubAuth = DataService.observarAuth((fbUser) => {
      setAuthUser(fbUser);
      if (!fbUser) setUser(null); 
      setIsInitializing(false);
    });
    return () => unsubAuth();
  }, []);

  // 2. So puxa as listas se o Firebase confirmar o login
  useEffect(() => {
    let unsubU = () => {};
    let unsubC = () => {};
    let unsubE = () => {};
    let unsubI = () => {};
    let unsubA = () => {};
    let unsubL = () => {};

    if (authUser) {
      unsubU = DataService.subscribeUsuarios(setUsers);
      unsubC = DataService.subscribeChamados(setChamados);
      unsubE = DataService.subscribeEventos(setEventos);
      unsubI = DataService.subscribeInventario(setInventario); 
      unsubA = DataService.subscribeAgendamentos(setAgendamentos); 
      if (DataService.subscribeLogs) unsubL = DataService.subscribeLogs(setLogs);
    }

    return () => { unsubU(); unsubC(); unsubE(); unsubI(); unsubA(); unsubL(); };
  }, [authUser]);

  // 3. TERCEIRO: Define o perfil do utilizador (ADM, Tecnico, etc)
  useEffect(() => {
    if (authUser) {
      const dadosUsuario = users.find(u => u.uid === authUser.uid || u.id === authUser.uid);
      if (dadosUsuario) {
        setUser(dadosUsuario);
      } else {
        setUser({ login: authUser.email ? authUser.email.split('@')[0] : 'Admin', perfil: 'ADM', predio: 'Base', uid: authUser.uid });
      }
    } else {
      setUser(null); 
    }
  }, [authUser, users]);

  useEffect(() => {
    async function setupPush() {
      if (!Device.isDevice) return;
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return; 
        
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#1DB954',
          });
        }

        // CORRECAO: ID Oficial do Projeto
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: '3872bcd8-9f39-4a12-a3c7-41ed34b81626' });
        if (tokenData && tokenData.data && DataService.salvarPushToken) {
          await DataService.salvarPushToken(user.uid, tokenData.data);
        }
      } catch (e) { console.log("Aviso de Notificacao:", e.message); }
    }
    if (user && user.uid) setupPush();
  }, [user?.uid]);

  // NOTIFICAÇÃO LOCAL: alerta o técnico (no próprio celular, via barra de
  // notificações do sistema) quando surge um chamado sem técnico designado
  // no prédio em que ele está escalado hoje. Não usa servidor — dispara
  // localmente a partir do listener em tempo real do Firestore, então só
  // funciona enquanto o app estiver aberto ou em segundo plano (não com o
  // app finalizado/forçado a fechar).
  const notificadosRef = useRef(new Map()); // chamadoId -> identifier da notificação local
  const ultimoUidRef = useRef(null);

  useEffect(() => {
    if (!user || user.perfil !== 'TECNICO' || Platform.OS === 'web') return;

    const semTecnicoNoMeuPredio = chamados.filter((c) => {
      const semTecnico = !c.tecnico || c.tecnico === '';
      const mesmoPredio = c.predio === user.predio;
      const naoEstaFechado = c.status !== 'FECHADO' && c.status !== 'finalizado';
      return semTecnico && mesmoPredio && naoEstaFechado;
    });
    const idsAindaPendentes = new Set(semTecnicoNoMeuPredio.map((c) => c.id));

    // Ao logar (ou trocar de usuário), só marca os já existentes como "vistos"
    // sem notificar — evita disparar notificação de chamados antigos ao abrir o app.
    if (ultimoUidRef.current !== user.uid) {
      ultimoUidRef.current = user.uid;
      notificadosRef.current = new Map(semTecnicoNoMeuPredio.map((c) => [c.id, null]));
      return;
    }

    // Chamado saiu da lista de pendentes (foi assumido, fechado ou mudou de
    // prédio) — cancela a notificação que ainda estiver na barra do sistema.
    notificadosRef.current.forEach((identifier, chamadoId) => {
      if (!idsAindaPendentes.has(chamadoId)) {
        if (identifier) Notifications.dismissNotificationAsync(identifier).catch(() => {});
        notificadosRef.current.delete(chamadoId);
      }
    });

    semTecnicoNoMeuPredio.forEach((c) => {
      if (!notificadosRef.current.has(c.id)) {
        notificadosRef.current.set(c.id, null);
        Notifications.scheduleNotificationAsync({
          content: {
            title: `Novo chamado em ${c.predio}`,
            body: c.descricao || c.titulo || 'Chamado aguardando técnico designado.',
            sound: true,
          },
          trigger: null,
        }).then((identifier) => {
          if (notificadosRef.current.has(c.id)) notificadosRef.current.set(c.id, identifier);
        });
      }
    });
  }, [chamados, user]);

  // LEMBRETES DE EVENTOS E AGENDAMENTOS: alerta o técnico designado 1 dia antes
  // e no próprio dia. Também é local (sem servidor) — para não duplicar o
  // lembrete toda vez que o app reabre, marca `lembreteAgendado: true` no
  // documento assim que agenda, e só processa quem ainda não tem essa marca.
  useEffect(() => {
    if (!user || !user.login || Platform.OS === 'web') return;

    const agendarLembretes = async (alvo, titulo, corpo) => {
      const agora = Date.now();
      const umDiaAntes = new Date(alvo);
      umDiaAntes.setDate(umDiaAntes.getDate() - 1);

      if (umDiaAntes.getTime() > agora) {
        await Notifications.scheduleNotificationAsync({
          content: { title: titulo, body: `Amanhã: ${corpo}`, sound: true },
          trigger: umDiaAntes,
        });
      }
      if (alvo.getTime() > agora) {
        await Notifications.scheduleNotificationAsync({
          content: { title: titulo, body: `Hoje: ${corpo}`, sound: true },
          trigger: alvo,
        });
      }
    };

    eventos
      .filter((ev) => ev.tecnico === user.login && !ev.lembreteAgendado)
      .forEach((ev) => {
        // Eventos novos usam o seletor de calendário (YYYY-MM-DD); eventos
        // antigos ainda podem ter o texto livre DD/MM/AAAA digitado antes.
        const alvo = parseDataISO(ev.dataEvento) || parseDataBR(ev.dataEvento);
        DataService.atualizarEvento(ev.id, { lembreteAgendado: true }).catch(() => {});
        if (!alvo) return;
        const corpo = ev.tipo === 'EXTERNO' ? (ev.endereco || ev.cliente || ev.nome) : (ev.local || ev.nome);
        agendarLembretes(alvo, `Evento: ${ev.nome}`, corpo).catch(() => {});
      });

    agendamentos
      .filter((a) => a.tecnico === user.login && !a.lembreteAgendado)
      .forEach((a) => {
        const alvo = getDataHoraAgendamento(a);
        DataService.atualizarAgendamento(a.id, { lembreteAgendado: true }).catch(() => {});
        if (!alvo) return;
        agendarLembretes(alvo, `Agendamento: ${a.servico}`, `às ${a.hora}`).catch(() => {});
      });
  }, [eventos, agendamentos, user]);

  // ALERTA DE SLA EM RISCO: avisa o Admin (no celular) quando um chamado ainda
  // aberto já consumiu 80% do prazo de SLA da sua severidade — antes de
  // estourar, não só depois. Marca `slaAlertaEnviado: true` para não repetir.
  useEffect(() => {
    if (!user || user.perfil !== 'ADM' || Platform.OS === 'web') return;

    chamados
      .filter((c) => {
        const naoEstaFechado = c.status !== 'FECHADO' && c.status !== 'finalizado';
        if (!naoEstaFechado || c.slaAlertaEnviado || !c.dataAbertura) return false;
        return fracaoSlaDecorrida(c) >= 0.8;
      })
      .forEach((c) => {
        DataService.atualizarChamado(c.id, { slaAlertaEnviado: true }).catch(() => {});
        Notifications.scheduleNotificationAsync({
          content: {
            title: `SLA em risco: ${c.predio}`,
            body: `${c.descricao || c.titulo || 'Chamado'} está perto do prazo (${c.prioridade || 'MEDIA'}).`,
            sound: true,
          },
          trigger: null,
        }).catch(() => {});
      });
  }, [chamados, user]);

  // FUNCAO DE LOGS
  const gerirLogs = (msg) => {
    const autorDoLog = user ? (user.login || user.nomeCompleto) : "Administrador (Auto)";

    if (DataService.salvarLog) {
      DataService.salvarLog(msg, autorDoLog);
    } else {
      console.log("Log Simulado: ", msg, " | Por: ", autorDoLog);
    }
  };

  // LOGOUT PARA PASSAR PARA A TELA DE PERFIL
  const handleLogout = async () => {
    try {
      await DataService.logout();
    } catch (error) {
      console.log("Erro ao sair:", error);
    }
  };

  let content;

  if (isInitializing) {
    content = <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}><ActivityIndicator size="large" color={theme.primary} /></View>;
  } else if (!user) {
    content = <LoginScreen theme={theme} />;
  } else {
    content = (
      <View style={[styles.container, { backgroundColor: theme.background }]}>

        {isMobile && isMenuOpen && (
          <TouchableOpacity
            activeOpacity={1}
            style={styles.overlay}
            onPress={() => setIsMenuOpen(false)}
          />
        )}

        <Sidebar
          theme={theme} telaAtiva={telaAtiva} setTelaAtiva={mudarTela}
          isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}
          user={user} isMobile={isMobile} isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen}
        />

        <View style={styles.mainContent}>

          {isMobile && (
            <View style={[styles.headerMobile, { backgroundColor: theme.barBg, borderColor: theme.border }]}>
              <TouchableOpacity onPress={() => setIsMenuOpen(true)} style={styles.menuBtn} activeOpacity={0.7}>
                <Text style={{ fontSize: 22, color: theme.text }}>☰</Text>
              </TouchableOpacity>
              <Image source={require('./assets/images/logo-techgestor.png')} style={styles.headerLogo} resizeMode="contain" />
              <Text style={{ marginLeft: 8, fontSize: 17, fontWeight: '700', color: theme.text, letterSpacing: 0.2 }}>
                Tech<Text style={{ color: theme.primary }}>Gestor</Text>
              </Text>
            </View>
          )}

          {telaAtiva === 'DASHBOARD' && <DashboardScreen chamados={chamados} eventos={eventos} users={users} theme={theme} setTelaAtiva={setTelaAtiva} irParaChamados={irParaChamados} />}
          {telaAtiva === 'CHAMADOS' && <ChamadosScreen user={user} chamados={chamados} eventos={eventos} users={users} inventario={inventario} theme={theme} addLog={gerirLogs} showPush={(msg) => console.log(msg)} filtroStatusInicial={filtroChamadosInicial} mostrarNovoChamado={!origemDashboard} />}
          {telaAtiva === 'EVENTOS' && <EventosScreen user={user} eventos={eventos} users={users} theme={theme} addLog={gerirLogs} />}
          {telaAtiva === 'INVENTARIO' && <InventarioScreen inventario={inventario} setInventario={setInventario} chamados={chamados} users={users} theme={theme} addLog={gerirLogs} />}
          {telaAtiva === 'AGENDAMENTO' && <AgendamentoScreen user={user} agendamentos={agendamentos} setAgendamentos={setAgendamentos} users={users} theme={theme} addLog={gerirLogs} />}
          {telaAtiva === 'ADMIN' && <AdminScreen user={user} users={users} chamados={chamados} eventos={eventos} theme={theme} addLog={gerirLogs} />}
          {telaAtiva === 'LOGS' && <LogsScreen logs={logs} theme={theme} />}

          {/* ROTA PARA A TELA DE PERFIL */}
          {telaAtiva === 'PERFIL' && <PerfilScreen user={user} theme={theme} onLogout={handleLogout} />}
        </View>
      </View>
    );
  }

  return (
    <>
      {content}
      {Platform.OS === 'web' && !isInitializing && !user && <WebDownloadWidget theme={theme} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },
  mainContent: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(4,6,8,0.6)', zIndex: 40 },
  headerMobile: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  menuBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerLogo: { width: 26, height: 20, marginLeft: 6 },
});