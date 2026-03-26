import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DataService } from '../services/DataService';

export default function Sidebar({ theme, telaAtiva, setTelaAtiva, isDarkMode, setIsDarkMode, user, isMobile, isMenuOpen, setIsMenuOpen }) {
  
  const NavItem = ({ id, icon, label }) => (
    <TouchableOpacity 
      style={[styles.btnMenu, telaAtiva === id && { backgroundColor: theme.sidebarActive, borderRadius: 12 }]} 
      onPress={() => {
        setTelaAtiva(id);
        if (isMobile) setIsMenuOpen(false);
      }}>
      <Text style={{ fontSize: 24 }}>{icon}</Text>
      <Text style={[styles.txtMenu, { color: telaAtiva === id ? theme.primary : theme.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  const isAlmoco = user?.status === 'ALMOCO'; 

  const toggleAlmoco = async () => {
    const horaAtual = new Date().getHours();
    const horaInicio = user?.inicio || 8;
    const horaSaida = user?.saida || 17;
    
    let noHorario = false;
    if (horaInicio < horaSaida) {
      noHorario = horaAtual >= horaInicio && horaAtual < horaSaida;
    } else {
      noHorario = horaAtual >= horaInicio || horaAtual < horaSaida;
    }

    if (!noHorario) {
      return Alert.alert('Aviso', 'Fora do horário de expediente!');
    }

    const novoStatus = isAlmoco ? 'ONLINE' : 'ALMOCO';
    try {
      await DataService.atualizarUsuario(user.uid || user.id, { status: novoStatus });
      if (DataService.salvarLog) {
        DataService.salvarLog(`Técnico ${isAlmoco ? 'retornou do' : 'saiu para o'} almoço.`, user.login);
      }
    } catch (error) {
      console.log("Erro ao mudar status de almoço", error);
    }
  };

  return (
    <View style={[
      styles.sidebar, 
      { backgroundColor: theme.card, borderColor: theme.border },
      isMobile && { position: 'absolute', zIndex: 50, display: isMenuOpen ? 'flex' : 'none', height: '100%' }
    ]}>
      <View style={styles.logoContainer}><Text style={[styles.logo, { color: theme.primary }]}>TG</Text></View>
      
      <View style={styles.menuItems}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }}>
          <NavItem id="DASHBOARD" icon="🏠" label="Início" />
          <NavItem id="CHAMADOS" icon="📋" label="Chamados" />
          <NavItem id="EVENTOS" icon="🎉" label="Eventos" />
          <NavItem id="INVENTARIO" icon="📦" label="Estoque" />
          <NavItem id="AGENDAMENTO" icon="📅" label="Agenda" />
          
          <NavItem id="PERFIL" icon="👤" label="Perfil" />

          {user?.perfil === 'ADM' && (
            <>
              <NavItem id="ADMIN" icon="⚙️" label="Admin" />
              <NavItem id="LOGS" icon="📜" label="Logs" />
            </>
          )}
        </ScrollView>
      </View>

      <View style={{ alignItems: 'center', paddingBottom: 20, paddingTop: 10 }}>
        
        <TouchableOpacity 
          style={[styles.btnMenu, { marginBottom: 15, backgroundColor: isAlmoco ? theme.tert : 'transparent', borderRadius: 12 }]} 
          onPress={toggleAlmoco}
        >
          <Text style={{ fontSize: 22 }}>{isAlmoco ? '🍽️' : '🍔'}</Text>
          <Text style={[styles.txtMenu, { color: isAlmoco ? '#fff' : theme.text, fontSize: 8 }]}>ALMOÇO</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ marginBottom: 25 }} onPress={() => setIsDarkMode(!isDarkMode)}>
          <Text style={{ fontSize: 22 }}>{isDarkMode ? '☀️' : '🌑'}</Text>
        </TouchableOpacity>
        
      
        <TouchableOpacity onPress={() => DataService.logout()}>
          <Text style={{ fontSize: 22 }}>🚪</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 85, height: '100%', borderRightWidth: 1, paddingVertical: 30, justifyContent: 'space-between' },
  logoContainer: { alignItems: 'center', marginBottom: 20 },
  logo: { fontSize: 28, fontWeight: 'bold' },
  menuItems: { flex: 1, width: '100%' },
  btnMenu: { alignItems: 'center', paddingVertical: 15, width: '80%', marginVertical: 8 },
  txtMenu: { fontSize: 10, marginTop: 4, fontWeight: '600', textTransform: 'uppercase' }
});