import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { DataService } from '../services/DataService';
import { RADIUS } from '../theme/themes';

export const APP_VERSION = 'v2.5.0';

const NAV_ICONS = {
  DASHBOARD: 'dashboard',
  CHAMADOS: 'confirmation-number',
  EVENTOS: 'event-available',
  INVENTARIO: 'inventory-2',
  AGENDAMENTO: 'calendar-today',
  PERFIL: 'person-outline',
  ADMIN: 'admin-panel-settings',
  LOGS: 'receipt-long',
};

export const PERFIL_LABEL = { ADM: 'Administrador', TECNICO: 'Técnico Operacional' };

// Shell escuro persistente (#14181f claro / #121212 escuro), com o brasão do
// TJRR sempre dentro de um selo branco para manter o contraste.
export default function Sidebar({ theme, telaAtiva, setTelaAtiva, user, isMobile, isMenuOpen, setIsMenuOpen, chamadosBadge = 0 }) {

  const NavItem = ({ id, label, badge }) => {
    const active = telaAtiva === id;
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        style={[styles.btnMenu, active && { backgroundColor: theme.shellActive }]}
        onPress={() => {
          setTelaAtiva(id);
          if (isMobile) setIsMenuOpen(false);
        }}>
        <MaterialIcons name={NAV_ICONS[id]} size={20} color={active ? '#ffffff' : theme.shellSubtext} />
        <Text style={[styles.txtMenu, { color: active ? '#ffffff' : '#cbd5e1', fontWeight: active ? '600' : '500' }]}>{label}</Text>
        {badge > 0 && (
          <View style={[styles.navBadge, { backgroundColor: active ? 'rgba(255,255,255,0.22)' : '#dc2626' }]}>
            <Text style={styles.navBadgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
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

  const statusOnline = !user?.status || user?.status === 'ONLINE';
  const statusLabel = isAlmoco ? 'Pausa' : statusOnline ? 'Online' : user?.status === 'INDISPONIVEL' ? 'Ocupado' : 'Offline';
  const statusColor = isAlmoco ? '#f59e0b' : statusOnline ? '#22c55e' : '#94a3b8';

  return (
    <View style={[
      styles.sidebar,
      { backgroundColor: theme.shellBg, borderColor: theme.shellBorder },
      isMobile && { position: 'absolute', zIndex: 50, display: isMenuOpen ? 'flex' : 'none', height: '100%', width: 280 }
    ]}>
      <View style={[styles.logoContainer, { borderBottomColor: theme.shellBorder }]}>
        <View style={styles.logoBadge}>
          <Image source={require('../../assets/images/brasao-tjrr.png')} style={styles.logoImg} resizeMode="contain" />
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16, letterSpacing: -0.2 }}>TechGestor</Text>
          <Text style={{ color: theme.shellSubtext, fontSize: 11.5, letterSpacing: 0.6, marginTop: 1 }}>TJRR - TI</Text>
        </View>
        {isMobile && (
          <TouchableOpacity onPress={() => setIsMenuOpen(false)} style={{ padding: 6 }}>
            <MaterialIcons name="close" size={20} color={theme.shellSubtext} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.menuItems}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 10, paddingTop: 14 }}>
          <NavItem id="DASHBOARD" label="Início" />
          <NavItem id="CHAMADOS" label="Chamados" badge={chamadosBadge} />
          <NavItem id="EVENTOS" label="Eventos" />
          <NavItem id="INVENTARIO" label="Inventário" />
          <NavItem id="AGENDAMENTO" label="Agenda" />
          <NavItem id="PERFIL" label="Perfil" />

          {user?.perfil === 'ADM' && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.shellBorder }]} />
              <Text style={[styles.sectionLabel, { color: '#7c8799' }]}>ADMINISTRAÇÃO</Text>
              <NavItem id="ADMIN" label="Admin" />
              <NavItem id="LOGS" label="Logs" />
            </>
          )}
        </ScrollView>
      </View>

      <View style={[styles.footer, { borderTopColor: theme.shellBorder }]}>
        <TouchableOpacity
          activeOpacity={0.75}
          style={[styles.pauseBtn, { borderColor: isAlmoco ? '#f59e0b66' : theme.shellBorder, backgroundColor: isAlmoco ? 'rgba(245,158,11,0.14)' : 'rgba(255,255,255,0.03)' }]}
          onPress={toggleAlmoco}
        >
          <MaterialIcons name={isAlmoco ? 'play-arrow' : 'coffee'} size={16} color={isAlmoco ? '#f59e0b' : theme.shellSubtext} />
          <Text style={{ color: isAlmoco ? '#f59e0b' : '#cbd5e1', fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginLeft: 8, textTransform: 'uppercase' }}>{isAlmoco ? 'Retornar da pausa' : 'Pausa regimental'}</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor, marginRight: 8 }} />
            <Text style={{ color: '#e2e8f0', fontSize: 12.5, fontWeight: '500' }} numberOfLines={1}>{PERFIL_LABEL[user?.perfil] || 'Usuário'}</Text>
          </View>
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: statusColor + '66', backgroundColor: statusColor + '1f' }}>
            <Text style={{ color: statusColor, fontSize: 11, fontWeight: '700' }}>{statusLabel}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ color: '#6b7587', fontSize: 11 }}>{APP_VERSION} TJRR • DITEC</Text>
          <TouchableOpacity onPress={() => DataService.logout()} style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }} activeOpacity={0.7}>
            <MaterialIcons name="logout" size={15} color="#f87171" />
            <Text style={{ color: '#f87171', fontSize: 11, fontWeight: '600', marginLeft: 4 }}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 260, height: '100%', borderRightWidth: 1, justifyContent: 'flex-start' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  logoBadge: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: 'rgba(226,232,240,0.8)', padding: 4 },
  logoImg: { width: '100%', height: '100%' },
  menuItems: { flex: 1, width: '100%' },
  btnMenu: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, width: '100%', marginVertical: 2, borderRadius: RADIUS.md },
  txtMenu: { fontSize: 14.5, marginLeft: 12, flex: 1 },
  navBadge: { minWidth: 22, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  navBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  divider: { height: 1, marginVertical: 12, marginHorizontal: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, paddingHorizontal: 12, marginBottom: 6 },
  footer: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 14, borderTopWidth: 1 },
  pauseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: RADIUS.md, borderWidth: 1 },
});
