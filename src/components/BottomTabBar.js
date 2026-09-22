import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { RADIUS } from '../theme/themes';

const TABS = [
  { id: 'DASHBOARD', label: 'Início', icon: 'space-dashboard' },
  { id: 'CHAMADOS', label: 'Chamados', icon: 'assignment' },
  { id: 'EVENTOS', label: 'Eventos', icon: 'event' },
  { id: 'AGENDAMENTO', label: 'Agenda', icon: 'calendar-month' },
  { id: 'MAIS', label: 'Mais', icon: 'more-horiz' },
];

function TabButton({ tab, active, onPress, theme }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      style={styles.tabBtn}
      onPress={onPress}
      onPressIn={() => { scale.value = withTiming(0.85, { duration: 100 }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: 150 }); }}
    >
      <Animated.View style={[styles.tabIconWrap, active && { backgroundColor: theme.sidebarActive }, animatedStyle]}>
        <MaterialIcons name={tab.icon} size={22} color={active ? theme.primary : theme.subtext} />
      </Animated.View>
      <Text style={[styles.tabLabel, { color: active ? theme.primary : theme.subtext, fontWeight: active ? '700' : '500' }]}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

export default function BottomTabBar({ theme, telaAtiva, onSelect, onOpenMais, maisAtivo }) {
  return (
    <View style={[styles.container, { backgroundColor: theme.barBg, borderColor: theme.border }]}>
      {TABS.map((tab) => {
        const isMais = tab.id === 'MAIS';
        const active = isMais ? maisAtivo : telaAtiva === tab.id;
        return (
          <TabButton
            key={tab.id}
            tab={tab}
            active={active}
            theme={theme}
            onPress={() => (isMais ? onOpenMais() : onSelect(tab.id))}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 12,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIconWrap: { width: 42, height: 30, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  tabLabel: { fontSize: 10.5 },
});

export const TAB_BAR_HEIGHT = 62;
