import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { RADIUS, SHADOW } from '../theme/themes';
import { getIniciais, getPrioridadeVisual, getStatusVisual } from '../utils/helpers';

export const useBreakpoints = () => {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1100,
    isDesktop: width >= 1100,
    isPhone: Math.min(width, height) < 768,
  };
};

// Botão padrão do DESIGN.md: rótulo em caixa alta, peso 700, espaçamento 0.08em.
// variant: 'solid' (azul sólido), 'soft' (azul translúcido), 'outline', 'danger', 'ghost'
export const Btn = ({ title, onPress, danger, theme, style, outline, disabled, variant, icon, compact, textStyle }) => {
  const v = variant || (danger ? 'danger' : outline ? 'outline' : 'solid');
  const palette = {
    solid: { bg: theme.primary, border: theme.primary, fg: '#ffffff' },
    soft: { bg: theme.primarySoft, border: theme.primaryBorder, fg: theme.primary },
    outline: { bg: 'transparent', border: theme.border, fg: theme.text },
    danger: { bg: theme.criticalWash, border: theme.offline + '66', fg: theme.offline },
    ghost: { bg: 'transparent', border: 'transparent', fg: theme.primary },
    success: { bg: theme.online, border: theme.online, fg: '#ffffff' },
  }[v];

  return (
    <TouchableOpacity
      disabled={disabled}
      activeOpacity={0.82}
      style={[
        styles.btn,
        { height: compact ? 38 : 44, backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.5 : 1 },
        v === 'solid' && SHADOW.glow,
        style,
      ]}
      onPress={onPress}>
      {icon ? <MaterialIcons name={icon} size={16} color={palette.fg} style={{ marginRight: title ? 8 : 0 }} /> : null}
      {title ? <Text style={[styles.btnText, { color: palette.fg }, textStyle]} numberOfLines={1}>{title}</Text> : null}
    </TouchableOpacity>
  );
};

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

export const PulseDot = ({ color, size = 8, style }) => {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: anim }, style]} />;
};

// Card nível 1: fundo elevado, borda de 1px, raio 12 e sombra ambiente sutil.
export const Card = ({ children, style, theme }) => {
  const { isPhone } = useBreakpoints();
  return (
    <View style={[styles.card, isPhone && styles.cardMobile, { backgroundColor: theme.card, borderColor: theme.border }, SHADOW.sm, style]}>
      {children}
    </View>
  );
};

export const Avatar = ({ nome, size = 36, color, theme, online, textColor }) => {
  const bg = color || theme?.primary || '#2a78d6';
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: textColor || '#ffffff', fontWeight: '700', fontSize: Math.max(10, size * 0.36) }}>{getIniciais(nome)}</Text>
      </View>
      {online !== undefined && (
        <View style={{ position: 'absolute', right: -1, bottom: -1, width: size * 0.3, height: size * 0.3, borderRadius: size, borderWidth: 2, borderColor: theme?.card || '#fff', backgroundColor: online ? '#1a9c5c' : '#8493ab' }} />
      )}
    </View>
  );
};

export const Badge = ({ label, color, bg, border, style, icon, solid }) => (
  <View style={[styles.badge, { backgroundColor: solid ? color : bg, borderColor: solid ? color : border || 'transparent' }, style]}>
    {icon ? <MaterialIcons name={icon} size={11} color={solid ? '#fff' : color} style={{ marginRight: 4 }} /> : null}
    <Text style={[styles.badgeText, { color: solid ? '#ffffff' : color }]} numberOfLines={1}>{label}</Text>
  </View>
);

export const PriorityBadge = ({ prioridade, style }) => {
  const v = getPrioridadeVisual(prioridade);
  return <Badge label={v.label} color={v.color} bg={v.bg} border={v.border} style={style} />;
};

export const StatusChip = ({ status, style, upper = true }) => {
  const v = getStatusVisual(status);
  return (
    <View style={[styles.badge, { backgroundColor: v.bg, borderColor: v.border }, style]}>
      <Text style={[styles.badgeText, { color: v.color }]} numberOfLines={2}>{upper ? String(status || 'Aguardando').toUpperCase() : status}</Text>
    </View>
  );
};

export const SlaBadge = ({ label = 'SLA > 2h' }) => (
  <View style={[styles.badge, { backgroundColor: '#dc2626', borderColor: '#dc2626' }]}>
    <MaterialIcons name="alarm" size={11} color="#fff" style={{ marginRight: 4 }} />
    <Text style={[styles.badgeText, { color: '#fff', fontWeight: '800' }]}>{label}</Text>
  </View>
);

// Chip de filtro (pílula). Ativo = azul sólido.
export const FilterChip = ({ label, active, onPress, theme, count }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    style={[styles.filterChip, { backgroundColor: active ? theme.primary : theme.cardAlt, borderColor: active ? theme.primary : theme.border }]}
  >
    <Text style={{ color: active ? '#ffffff' : theme.text, fontSize: 12, fontWeight: active ? '700' : '500', letterSpacing: 0.2 }}>{label}</Text>
    {count !== undefined && (
      <View style={{ marginLeft: 6, paddingHorizontal: 6, borderRadius: 999, backgroundColor: active ? 'rgba(255,255,255,0.25)' : theme.primarySoft }}>
        <Text style={{ color: active ? '#fff' : theme.primary, fontSize: 11, fontWeight: '700' }}>{count}</Text>
      </View>
    )}
  </TouchableOpacity>
);

// Cabeçalho padrão das telas: trilha "TJRR • DITEC • SEÇÃO", título e ação.
export const PageHeader = ({ theme, trail, title, subtitle, icon, right, style }) => {
  const { isMobile } = useBreakpoints();
  return (
    <Card theme={theme} style={[{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', paddingVertical: 18 }, style]}>
      <View style={{ flex: isMobile ? undefined : 1, marginRight: isMobile ? 0 : 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          {icon ? <MaterialIcons name={icon} size={14} color={theme.primary} style={{ marginRight: 6 }} /> : null}
          <Text style={{ color: theme.primary, fontSize: 11.5, fontWeight: '700', letterSpacing: 0.9, textTransform: 'uppercase' }}>
            {trail ? `TJRR • DITEC • ${trail}` : 'TJRR • DITEC'}
          </Text>
        </View>
        <Text style={{ color: theme.text, fontSize: isMobile ? 20 : 24, fontWeight: '700', letterSpacing: -0.3, marginTop: 4 }}>{title}</Text>
        {subtitle ? <Text style={{ color: theme.subtext, fontSize: 13, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={{ marginTop: isMobile ? 14 : 0, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{right}</View> : null}
    </Card>
  );
};

export const SectionTitle = ({ theme, title, subtitle, right, icon }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
    <View style={{ flex: 1, marginRight: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {icon ? <MaterialIcons name={icon} size={18} color={theme.primary} style={{ marginRight: 6 }} /> : null}
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600', letterSpacing: -0.2 }}>{title}</Text>
      </View>
      {subtitle ? <Text style={{ color: theme.subtext, fontSize: 12.5, marginTop: 2 }}>{subtitle}</Text> : null}
    </View>
    {right}
  </View>
);

// Campo de texto com anel de foco azul (DESIGN.md §4).
export const Field = ({ theme, style, inputStyle, icon, label, multiline, ...props }) => {
  const [focus, setFocus] = useState(false);
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      {label ? <Text style={{ color: theme.subtext, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>{label}</Text> : null}
      <View style={[styles.fieldBox, { backgroundColor: theme.inputBg, borderColor: focus ? theme.primary : theme.border, minHeight: multiline ? 84 : 44 }, focus && Platform.OS === 'web' && { boxShadow: `0 0 0 2px ${theme.primarySoft}` }]}>
        {icon ? <MaterialIcons name={icon} size={18} color={theme.subtext} style={{ marginRight: 8, marginTop: multiline ? 12 : 0 }} /> : null}
        <TextInput
          placeholderTextColor={theme.textCode}
          {...props}
          multiline={multiline}
          onFocus={(e) => { setFocus(true); props.onFocus && props.onFocus(e); }}
          onBlur={(e) => { setFocus(false); props.onBlur && props.onBlur(e); }}
          style={[{ flex: 1, color: theme.text, fontSize: 14, paddingVertical: multiline ? 10 : 0, minHeight: multiline ? 80 : 42, textAlignVertical: multiline ? 'top' : 'center' }, Platform.OS === 'web' && { outlineStyle: 'none' }, inputStyle]}
        />
      </View>
    </View>
  );
};

export const EmptyState = ({ theme, icon = 'inbox', text }) => (
  <View style={{ alignItems: 'center', paddingVertical: 36 }}>
    <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: theme.cardAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
      <MaterialIcons name={icon} size={24} color={theme.subtext} />
    </View>
    <Text style={{ color: theme.subtext, fontSize: 13 }}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', paddingHorizontal: 18, borderRadius: RADIUS.md, marginTop: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  btnText: { fontWeight: '700', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  card: { padding: 20, borderRadius: RADIUS.lg, marginBottom: 16, borderWidth: 1 },
  cardMobile: { padding: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.pill, borderWidth: 1, marginRight: 8, marginBottom: 8 },
  fieldBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12 },
});
