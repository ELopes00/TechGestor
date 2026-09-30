import { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Avatar, useBreakpoints } from './index';
import { PERFIL_LABEL } from './Sidebar';
import { DataService } from '../services/DataService';
import { RADIUS, SHADOW } from '../theme/themes';
import { formatTempoRelativo, isChamadoFechado } from '../utils/helpers';

const TITULOS = {
  DASHBOARD: 'Painel Institucional',
  CHAMADOS: 'Central de Chamados',
  EVENTOS: 'Eventos e Audiências',
  INVENTARIO: 'Inventário Patrimonial',
  AGENDAMENTO: 'Agenda da Equipe',
  PERFIL: 'Meu Perfil',
  ADMIN: 'Administração',
  LOGS: 'Auditoria',
};

// Barra superior branca: brasão + breadcrumb, unidade do usuário, tema,
// sino de notificações e bloco do usuário (menu com Perfil / Sair).
export default function TopBar({ theme, user, telaAtiva, showMenu, onMenu, isDarkMode, setIsDarkMode, chamados = [], eventos = [], onNavigate }) {
  const { isMobile, isDesktop } = useBreakpoints();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  // Um chamado sem técnico só alerta quem está escalado no mesmo prédio;
  // depois de assumido, só continua relevante para quem assumiu.
  const relevante = (item, isChamado) => {
    if (!user || user.perfil === 'ADM') return true;
    if (isChamado) {
      if (!item.tecnico) return item.predio === user.predio;
      return item.tecnico === user.login;
    }
    return true;
  };

  const pendentes = chamados.filter((c) => {
    if (c.tecnico || isChamadoFechado(c.status)) return false;
    if (!user || user.perfil === 'ADM') return true;
    return c.predio === user.predio;
  });

  const feed = [...chamados, ...eventos]
    .filter((item) => relevante(item, item.descricao !== undefined))
    .map((item) => {
      const isChamado = item.descricao !== undefined;
      const fechado = isChamado ? isChamadoFechado(item.status) : item.status === 'CONCLUIDO';
      return {
        id: item.id,
        isChamado,
        icone: isChamado ? (fechado ? 'task-alt' : 'confirmation-number') : 'event',
        cor: fechado ? theme.online : isChamado ? (item.tecnico ? theme.primary : theme.offline) : theme.sec,
        titulo: isChamado ? (item.titulo || item.descricao) : item.nome,
        subtitulo: isChamado ? `Chamado • ${item.predio || '—'}` : `Evento ${item.tipo || ''}`,
        tecnico: item.tecnico,
        data: item.dataAbertura || item.data || 0,
      };
    })
    .sort((a, b) => b.data - a.data)
    .slice(0, 20);

  const nome = user?.nomeCompleto || user?.login || 'Usuário';

  return (
    <View style={[styles.bar, { backgroundColor: theme.barBg, borderBottomColor: theme.border, paddingHorizontal: isMobile ? 12 : 24 }]}>
      {showMenu && (
        <TouchableOpacity onPress={onMenu} style={styles.iconBtn} activeOpacity={0.7}>
          <MaterialIcons name="menu" size={24} color={theme.text} />
        </TouchableOpacity>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
        <View style={[styles.brasao, { backgroundColor: '#fff', borderColor: theme.border }]}>
          <Image source={require('../../assets/images/brasao-tjrr.png')} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        </View>
        <Text style={{ color: theme.text, fontSize: isMobile ? 16 : 18, fontWeight: '600', marginLeft: 10 }}>TechGestor</Text>
        {!isMobile && (
          <>
            <MaterialIcons name="chevron-right" size={18} color={theme.textCode} style={{ marginHorizontal: 8 }} />
            <Text style={{ color: theme.subtext, fontSize: 13.5 }} numberOfLines={1}>{TITULOS[telaAtiva] || ''}</Text>
          </>
        )}
      </View>

      {isDesktop && user?.predio ? (
        <View style={[styles.unitPill, { backgroundColor: theme.cardAlt }]}>
          <MaterialIcons name="apartment" size={17} color={theme.subtext} />
          <Text style={{ color: theme.text, fontSize: 13.5, marginLeft: 8, fontWeight: '500' }} numberOfLines={1}>Unidade: {user.predio}</Text>
        </View>
      ) : null}

      <TouchableOpacity onPress={() => setIsDarkMode(!isDarkMode)} style={styles.iconBtn} activeOpacity={0.7}>
        <MaterialIcons name={isDarkMode ? 'dark-mode' : 'light-mode'} size={21} color={theme.subtext} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setNotifOpen(true)} style={styles.iconBtn} activeOpacity={0.7}>
        <MaterialIcons name="notifications-none" size={23} color={theme.subtext} />
        {pendentes.length > 0 && (
          <View style={[styles.bellDot, { borderColor: theme.barBg }]}>
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{pendentes.length > 9 ? '9+' : pendentes.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      {!isMobile && <View style={{ width: 1, height: 28, backgroundColor: theme.border, marginHorizontal: 10 }} />}

      <TouchableOpacity onPress={() => setUserMenu(true)} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: isMobile ? 4 : 0 }} activeOpacity={0.8}>
        <Avatar nome={nome} size={36} theme={theme} online={user?.status !== 'OFFLINE'} />
        {!isMobile && (
          <View style={{ marginLeft: 10, maxWidth: 170 }}>
            <Text style={{ color: theme.text, fontSize: 13.5, fontWeight: '600' }} numberOfLines={1}>{nome}</Text>
            <Text style={{ color: theme.subtext, fontSize: 11.5 }} numberOfLines={1}>{PERFIL_LABEL[user?.perfil] || 'Usuário'}{user?.nivel ? ` • ${user.nivel}` : ''}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* MENU DO USUÁRIO */}
      <Modal visible={userMenu} transparent animationType="fade" onRequestClose={() => setUserMenu(false)}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setUserMenu(false)}>
          <View style={[styles.dropdown, { backgroundColor: theme.surface, borderColor: theme.border, right: isMobile ? 12 : 24 }, SHADOW.md]}>
            <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>{nome}</Text>
              <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 2 }}>@{user?.login} • {user?.predio || 'Base'}</Text>
            </View>
            <TouchableOpacity style={styles.dropItem} onPress={() => { setUserMenu(false); onNavigate && onNavigate('PERFIL'); }}>
              <MaterialIcons name="person-outline" size={18} color={theme.subtext} />
              <Text style={{ color: theme.text, marginLeft: 10 }}>Meu perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropItem} onPress={() => { setUserMenu(false); setIsDarkMode(!isDarkMode); }}>
              <MaterialIcons name={isDarkMode ? 'light-mode' : 'dark-mode'} size={18} color={theme.subtext} />
              <Text style={{ color: theme.text, marginLeft: 10 }}>{isDarkMode ? 'Modo claro' : 'Modo escuro'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dropItem, { borderTopWidth: 1, borderTopColor: theme.border }]} onPress={() => { setUserMenu(false); DataService.logout(); }}>
              <MaterialIcons name="logout" size={18} color={theme.offline} />
              <Text style={{ color: theme.offline, marginLeft: 10, fontWeight: '600' }}>Sair do sistema</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* PAINEL DE NOTIFICAÇÕES */}
      <Modal visible={notifOpen} transparent animationType="fade" onRequestClose={() => setNotifOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: theme.overlay }} activeOpacity={1} onPress={() => setNotifOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.notifPanel, { backgroundColor: theme.surface, borderColor: theme.border, width: isMobile ? '100%' : 420 }, SHADOW.lg]}>
            <View style={[styles.notifHeader, { borderBottomColor: theme.border }]}>
              <View>
                <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>Notificações</Text>
                <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 2 }}>{pendentes.length} chamado(s) aguardando técnico</Text>
              </View>
              <TouchableOpacity onPress={() => setNotifOpen(false)} style={styles.iconBtn}>
                <MaterialIcons name="close" size={22} color={theme.subtext} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              {feed.length === 0 ? (
                <Text style={{ color: theme.subtext, textAlign: 'center', marginTop: 40 }}>Nenhuma atividade registrada.</Text>
              ) : feed.map((item) => (
                <TouchableOpacity
                  key={`${item.isChamado ? 'c' : 'e'}-${item.id}`}
                  activeOpacity={0.8}
                  onPress={() => { setNotifOpen(false); onNavigate && onNavigate(item.isChamado ? 'CHAMADOS' : 'EVENTOS'); }}
                  style={[styles.feedItem, { borderColor: theme.border, backgroundColor: theme.card }]}
                >
                  <View style={{ width: 34, height: 34, borderRadius: RADIUS.md, backgroundColor: item.cor + '1a', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <MaterialIcons name={item.icone} size={18} color={item.cor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13.5 }} numberOfLines={2}>{item.titulo || 'Sem título'}</Text>
                    <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 2 }}>{item.subtitulo}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                      <Text style={{ color: item.tecnico ? theme.primary : theme.offline, fontSize: 11, fontWeight: '700' }}>{item.tecnico || 'SEM TÉCNICO'}</Text>
                      <Text style={{ color: theme.textCode, fontSize: 11 }}>{formatTempoRelativo(item.data)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 64, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  brasao: { width: 46, height: 34, borderRadius: RADIUS.sm, borderWidth: 1, padding: 3 },
  iconBtn: { width: 40, height: 40, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  unitPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 36, borderRadius: RADIUS.md, marginRight: 10, maxWidth: 320 },
  bellDot: { position: 'absolute', top: 4, right: 3, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3, backgroundColor: '#dc2626', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dropdown: { position: 'absolute', top: 60, width: 240, borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  dropItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  notifPanel: { position: 'absolute', right: 0, top: 0, bottom: 0, borderLeftWidth: 1 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  feedItem: { flexDirection: 'row', padding: 12, borderRadius: RADIUS.lg, borderWidth: 1, marginBottom: 10 },
});
