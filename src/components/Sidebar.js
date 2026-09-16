import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { DataService } from '../services/DataService';
import { RADIUS } from '../theme/themes';

const NAV_ICONS = {
  DASHBOARD: 'space-dashboard',
  CHAMADOS: 'assignment',
  EVENTOS: 'event',
  INVENTARIO: 'inventory-2',
  AGENDAMENTO: 'calendar-month',
  PERFIL: 'person-outline',
  ADMIN: 'tune',
  LOGS: 'receipt-long',
};

export default function Sidebar({ theme, telaAtiva, setTelaAtiva, isDarkMode, setIsDarkMode, user, isMobile, isMenuOpen, setIsMenuOpen }) {

  const NavItem = ({ id, label }) => {
    const active = telaAtiva === id;
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        style={[styles.btnMenu, active && { backgroundColor: theme.sidebarActive }]}
        onPress={() => {
          setTelaAtiva(id);
          if (isMobile) setIsMenuOpen(false);
        }}>
        <MaterialIcons name={NAV_ICONS[id]} size={22} color={active ? theme.primary : theme.subtext} />
        <Text style={[styles.txtMenu, { color: active ? theme.primary : theme.subtext }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

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
        DataService.salvarLog(`Técnico ${isAlmoco ? 'retornou da' : 'entrou em'} pausa.`, user.login);
      }
    } catch (error) {
      console.log("Erro ao mudar status", error);
    }
  };

  return (
    <View style={[
      styles.sidebar,
      { backgroundColor: theme.barBg, borderColor: theme.border },
      isMobile && { position: 'absolute', zIndex: 50, display: isMenuOpen ? 'flex' : 'none', height: '100%' }
    ]}>
      <View style={styles.logoContainer}>
        <View style={[styles.logoBadge, { backgroundColor: theme.primarySoft }]}>
          <Text style={[styles.logo, { color: theme.primary }]}>TG</Text>
        </View>
      </View>

      <View style={styles.menuItems}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }}>
          <NavItem id="DASHBOARD" label="Início" />
          <NavItem id="CHAMADOS" label="Chamados" />
          <NavItem id="EVENTOS" label="Eventos" />
          <NavItem id="INVENTARIO" label="Estoque" />
          <NavItem id="AGENDAMENTO" label="Agenda" />
          <NavItem id="PERFIL" label="Perfil" />

          {user?.perfil === 'ADM' && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <NavItem id="ADMIN" label="Admin" />
              <NavItem id="LOGS" label="Logs" />
            </>
          )}
        </ScrollView>
      </View>

      <View style={{ alignItems: 'center', paddingBottom: 18, paddingTop: 10 }}>

        <TouchableOpacity
          activeOpacity={0.75}
          style={[styles.btnMenu, { marginBottom: 12, backgroundColor: isAlmoco ? theme.tert : 'transparent' }]}
          onPress={toggleAlmoco}
        >
          <MaterialIcons name={isAlmoco ? 'play-arrow' : 'pause'} size={22} color={isAlmoco ? '#fff' : theme.subtext} />
          <Text style={[styles.txtMenu, { color: isAlmoco ? '#fff' : theme.subtext, fontSize: 8 }]}>{isAlmoco ? 'RETORNAR' : 'PAUSA'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconOnlyBtn} onPress={() => setIsDarkMode(!isDarkMode)} activeOpacity={0.7}>
          <MaterialIcons name={isDarkMode ? 'light-mode' : 'dark-mode'} size={20} color={theme.subtext} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.iconOnlyBtn, { marginTop: 4 }]} onPress={() => DataService.logout()} activeOpacity={0.7}>
          <MaterialIcons name="logout" size={20} color={theme.offline} />
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 92, height: '100%', borderRightWidth: 1, paddingVertical: 24, justifyContent: 'space-between' },
  logoContainer: { alignItems: 'center', marginBottom: 24 },
  logoBadge: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  menuItems: { flex: 1, width: '100%' },
  btnMenu: { alignItems: 'center', paddingVertical: 12, width: '78%', marginVertical: 4, borderRadius: RADIUS.md },
  txtMenu: { fontSize: 9.5, marginTop: 5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.2 },
  divider: { width: '60%', height: 1, marginVertical: 10 },
  iconOnlyBtn: { width: 36, height: 36, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
});
