import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RADIUS } from '../theme/themes';

export const Btn = ({ title, onPress, danger, theme, style, outline, disabled }) => (
  <TouchableOpacity
    disabled={disabled}
    activeOpacity={0.82}
    style={[
      styles.btn,
      !outline && !danger && {
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 4,
      },
      {
        backgroundColor: outline ? 'transparent' : danger ? 'rgba(239, 68, 68, 0.12)' : theme.primary,
        borderWidth: outline || danger ? 1.5 : 0,
        borderColor: danger ? theme.offline : theme.primary,
        opacity: disabled ? 0.5 : 1,
      },
      style,
    ]}
    onPress={onPress}>
    <Text style={[styles.btnText, { color: outline || danger ? (danger ? theme.offline : theme.primary) : '#ffffff' }]}>
      {title}
    </Text>
  </TouchableOpacity>
);

export const PulseIcon = ({ icon, active }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (active) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.4, duration: 150, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [active]);
  return (
    <Animated.Text style={{ fontSize: 24, transform: [{ scale: scaleAnim }] }}>
      {icon}
    </Animated.Text>
  );
};

export const Card = ({ children, style, theme }) => (
  <View
    style={[
      styles.card,
      { backgroundColor: theme.card, borderColor: theme.border, borderTopColor: theme.cardTopBorder },
      style,
    ]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  btn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: RADIUS.md, marginTop: 10, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },
  card: { padding: 18, borderRadius: RADIUS.xl, marginBottom: 15, borderWidth: 1, borderTopWidth: 2 },
});
