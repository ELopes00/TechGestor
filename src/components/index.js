import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const Btn = ({ title, onPress, danger, theme, style, outline }) => (
  <TouchableOpacity
    style={[
      styles.btn,
      {
        backgroundColor: outline ? 'transparent' : danger ? '#ff4444' : theme.primary,
        borderWidth: outline ? 1 : 0,
        borderColor: danger ? '#ff4444' : theme.primary,
      },
      style,
    ]}
    onPress={onPress}>
    <Text style={[styles.btnText, { color: outline ? (danger ? '#ff4444' : theme.primary) : '#fff' }]}>
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
  <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, style]}>
    {children}
  </View>
);

export const BackgroundImage = () => (
  <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
    <Image
      source={{ uri: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3' }}
      style={{ flex: 1, width: null, height: null, opacity: 0.2 }}
      resizeMode="cover"
    />
  </View>
);

const styles = StyleSheet.create({
  btn: { padding: 12, borderRadius: 12, marginTop: 10, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  card: { padding: 16, borderRadius: 15, marginBottom: 15, borderWidth: 1 },
});