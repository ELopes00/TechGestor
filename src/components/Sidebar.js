import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
        style={[styles.btnMenu, active && { backgroundColor: theme.primarySoft }]}
        onPress={() => {
          setTelaAtiva(id);
          if (isMobile) setIsMenuOpen(false);
        }}>
        <MaterialIcons name={NAV_ICONS[id]} size={20} color={active ? theme.primary : theme.subtext} />
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
        <View style={styles.logoBadge}>
          <Image source={require('../../assets/images/logo-techgestor.png')} style={styles.logoImg} resizeMode="contain" />
        </View>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary, marginRight: 6 }} />
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' }}>TechGestor</Text>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 18, marginBottom: 4 }}>
        <Text style={{ color: theme.textCode, fontSize: 9.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 }}>Operações</Text>
      </View>

      <View style={styles.menuItems}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 12 }}>
          <NavItem id="DASHBOARD" label="Início" />
          <NavItem id="CHAMADOS" label="Chamados" />
          <NavItem id="EVENTOS" label="Eventos" />
          <NavItem id="INVENTARIO" label="Inventário" />
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

      <View style={{ paddingHorizontal: 12, paddingBottom: 18, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border }}>

        <TouchableOpacity
          activeOpacity={0.75}
          style={[styles.btnMenu, { marginBottom: 8, backgroundColor: isAlmoco ? theme.tert : 'transparent' }]}
          onPress={toggleAlmoco}
        >
          <MaterialIcons name={isAlmoco ? 'play-arrow' : 'pause'} size={20} color={isAlmoco ? '#fff' : theme.subtext} />
          <Text style={[styles.txtMenu, { color: isAlmoco ? '#fff' : theme.subtext }]}>{isAlmoco ? 'Retornar' : 'Pausa'}</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 }}>
          <TouchableOpacity style={styles.iconOnlyBtn} onPress={() => setIsDarkMode(!isDarkMode)} activeOpacity={0.7}>
            <MaterialIcons name={isDarkMode ? 'light-mode' : 'dark-mode'} size={18} color={theme.subtext} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconOnlyBtn} onPress={() => DataService.logout()} activeOpacity={0.7}>
            <MaterialIcons name="logout" size={18} color={theme.offline} />
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 216, height: '100%', borderRightWidth: 1, paddingVertical: 20, justifyContent: 'flex-start' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginBottom: 18 },
  logoBadge: { width: 48, height: 38, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1220', padding: 4 },
  logoImg: { width: '100%', height: '100%' },
  menuItems: { flex: 1, width: '100%' },
  btnMenu: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, width: '100%', marginVertical: 2, borderRadius: RADIUS.md },
  txtMenu: { fontSize: 12.5, marginLeft: 10, fontWeight: '700' },
  divider: { height: 1, marginVertical: 10 },
  iconOnlyBtn: { width: 32, height: 32, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
});
