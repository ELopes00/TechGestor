import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RADIUS, SHADOW } from '../theme/themes';

export const Btn = ({ title, onPress, danger, theme, style, outline, disabled }) => (
  <TouchableOpacity
    disabled={disabled}
    activeOpacity={0.82}
    style={[
      styles.btn,
      !outline && SHADOW.sm,
      {
        backgroundColor: outline ? 'transparent' : danger ? theme.offline : theme.primary,
        borderWidth: outline ? 1.5 : 0,
        borderColor: danger ? theme.offline : theme.primary,
        opacity: disabled ? 0.5 : 1,
      },
      style,
    ]}
    onPress={onPress}>
    <Text style={[styles.btnText, { color: outline ? (danger ? theme.offline : theme.primary) : '#ffffff' }]}>
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
  <View style={[styles.card, SHADOW.sm, { backgroundColor: theme.card, borderColor: theme.border }, style]}>
    {children}
  </View>
);

export const BackgroundImage = () => (
  <View style={[StyleSheet.absoluteFill, { zIndex: -1, backgroundColor: '#0A0E13' }]}>
    <Image
      source={{ uri: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3' }}
      style={{ flex: 1, width: null, height: null, opacity: 0.28 }}
      resizeMode="cover"
    />
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,14,19,0.55)' }]} />
  </View>
);

const styles = StyleSheet.create({
  btn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: RADIUS.md, marginTop: 10, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },
  card: { padding: 18, borderRadius: RADIUS.lg, marginBottom: 15, borderWidth: 1 },
});
