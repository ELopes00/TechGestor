import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { DataService } from '../services/DataService';
import { RADIUS } from '../theme/themes';

const SHEET_OFFSET = 420;

export default function MoreSheet({ theme, visible, onClose, onNavigate, user, isDarkMode, setIsDarkMode }) {
  const translateY = useSharedValue(SHEET_OFFSET);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : SHEET_OFFSET, { duration: visible ? 260 : 200 });
  }, [visible]);

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
    if (!noHorario) return;

    const novoStatus = isAlmoco ? 'ONLINE' : 'ALMOCO';
    try {
      await DataService.atualizarUsuario(user.uid || user.id, { status: novoStatus });
      if (DataService.salvarLog) {
        DataService.salvarLog(`Técnico ${isAlmoco ? 'retornou da' : 'entrou em'} pausa.`, user.login);
      }
    } catch (e) { console.log('Erro ao mudar status', e); }
  };

  const fechar = () => onClose();

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 100) {
        translateY.value = withTiming(SHEET_OFFSET, { duration: 200 });
        runOnJS(fechar)();
      } else {
        translateY.value = withSpring(0, { damping: 18 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, { duration: 200 }),
  }));

  if (!visible) return null;

  const Item = ({ icon, label, onPress, danger }) => (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <MaterialIcons name={icon} size={21} color={danger ? theme.offline : theme.text} style={{ marginRight: 14 }} />
      <Text style={[styles.itemLabel, { color: danger ? theme.offline : theme.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={fechar} />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }, sheetStyle]}>
          <View style={styles.handle} />

          <Item icon="inventory-2" label="Inventário" onPress={() => onNavigate('INVENTARIO')} />
          <Item icon="person-outline" label="Perfil" onPress={() => onNavigate('PERFIL')} />

          {user?.perfil === 'ADM' && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Item icon="tune" label="Admin" onPress={() => onNavigate('ADMIN')} />
              <Item icon="receipt-long" label="Logs" onPress={() => onNavigate('LOGS')} />
            </>
          )}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {user?.perfil !== 'ADM' && (
            <Item icon={isAlmoco ? 'play-arrow' : 'pause'} label={isAlmoco ? 'Retornar do almoço' : 'Entrar em pausa'} onPress={toggleAlmoco} />
          )}
          <Item icon={isDarkMode ? 'light-mode' : 'dark-mode'} label={isDarkMode ? 'Tema claro' : 'Tema escuro'} onPress={() => setIsDarkMode(!isDarkMode)} />
          <Item icon="logout" label="Sair" onPress={() => DataService.logout()} danger />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(148,163,184,0.4)', alignSelf: 'center', marginBottom: 10 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderRadius: RADIUS.md },
  itemLabel: { fontSize: 15, fontWeight: '600' },
  divider: { height: 1, marginVertical: 6, marginHorizontal: 10 },
});
