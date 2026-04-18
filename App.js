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

import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

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

import Sidebar from './src/components/Sidebar';
import { DataService } from './src/services/DataService';

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
  const [isDarkMode, setIsDarkMode] = useState(true);

  const { width } = useWindowDimensions();
  const isMobile = width < 768; 
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const theme = isDarkMode ? {
    background: '#000000', primary: '#1DB954', text: '#ffffff', card: '#111111',
    border: '#333333', subtext: '#aaaaaa', online: '#00cc66', offline: '#ff4444',
    sec: '#FFAE00', tert: '#4488FF', inputBg: '#1a1a1a', sidebarActive: '#1DB95420'
  } : {
    background: '#f4f4f4', primary: '#1DB954', text: '#000000', card: '#ffffff',
    border: '#dddddd', subtext: '#555555', online: '#00cc66', offline: '#ff4444',
    sec: '#FFAE00', tert: '#4488FF', inputBg: '#eeeeee', sidebarActive: '#1DB95420'
  };

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
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: 'b0198725-e695-4696-8706-ec75061f83cf' });
        if (tokenData && tokenData.data && DataService.salvarPushToken) {
          await DataService.salvarPushToken(user.uid, tokenData.data);
        }
      } catch (e) { console.log("Aviso de Notificacao:", e.message); }
    }
    if (user && user.uid) setupPush();
  }, [user?.uid]);

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

  if (isInitializing) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}><ActivityIndicator size="large" color={theme.primary} /></View>;
  if (!user) return <LoginScreen theme={theme} />;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {isMobile && isMenuOpen && (
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.overlay} 
          onPress={() => setIsMenuOpen(false)} 
        />
      )}

      <Sidebar 
        theme={theme} telaAtiva={telaAtiva} setTelaAtiva={setTelaAtiva} 
        isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} 
        user={user} isMobile={isMobile} isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} 
      />

      <View style={styles.mainContent}>
        
        {isMobile && (
          <View style={[styles.headerMobile, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity onPress={() => setIsMenuOpen(true)}>
              <Text style={{ fontSize: 28, color: theme.text }}>☰</Text>
            </TouchableOpacity>
            <Text style={{ marginLeft: 15, fontSize: 18, fontWeight: 'bold', color: theme.primary }}>TechGestor</Text>
          </View>
        )}

        {telaAtiva === 'DASHBOARD' && <DashboardScreen chamados={chamados} eventos={eventos} users={users} theme={theme} />}
        {telaAtiva === 'CHAMADOS' && <ChamadosScreen user={user} chamados={chamados} eventos={eventos} users={users} inventario={inventario} theme={theme} addLog={gerirLogs} showPush={(msg) => console.log(msg)} />}
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

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },
  mainContent: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 40 },
  headerMobile: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1 }
});