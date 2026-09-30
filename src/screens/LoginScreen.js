import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

import { DataService } from '../services/DataService';
import { RADIUS, SHADOW } from '../theme/themes';

export default function LoginScreen({ theme }) {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manterConectado, setManterConectado] = useState(false);
  const [erro, setErro] = useState('');
  const [foco, setFoco] = useState('');
  const senhaRef = useRef(null);

  const handleLogin = async () => {
    if (loading) return;
    if (!login || !senha) return setErro('Preencha o login e a senha.');

    setErro('');
    setLoading(true);
    try {
      // 1. Grava a preferência do usuario na memoria ANTES do login
      if (manterConectado) {
        await AsyncStorage.setItem('@manter_logado', 'true');
      } else {
        await AsyncStorage.removeItem('@manter_logado');
      }

      // 2. Faz o login no Firebase
      const user = await DataService.login(login, senha);

      // 3. Lógica de Notificações
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: '3872bcd8-9f39-4a12-a3c7-41ed34b81626' });
          await DataService.salvarPushToken(user.uid, tokenData.data);
        }
      } catch (e) {
        console.log("Aviso: Falha ao gerar Push Token de Notificações", e);
      }

    } catch (error) {
      console.error(error);
      setErro('Login ou senha incorretos.');
      setLoading(false);
    }
  };

  const esqueciSenha = () => {
    const msg = 'Para redefinir sua senha, procure o administrador do TechGestor ou abra um chamado no Suporte DITEC.';
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Suporte DITEC', msg);
  };

  const inputStyle = (campo) => [
    styles.input,
    { backgroundColor: theme.shellInput, borderColor: foco === campo ? theme.shellActive : 'rgba(255,255,255,0.06)' },
    Platform.OS === 'web' && { outlineStyle: 'none' },
    Platform.OS === 'web' && foco === campo && { boxShadow: '0 0 0 2px rgba(42,120,214,0.35)' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Fundo institucional: halos azuis suaves e anéis concêntricos */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.halo, { top: -140, left: -160, backgroundColor: theme.primary, opacity: theme.mode === 'dark' ? 0.10 : 0.07 }]} />
        <View style={[styles.halo, { bottom: -180, right: -140, backgroundColor: theme.primary, opacity: theme.mode === 'dark' ? 0.10 : 0.06 }]} />
        <View style={[styles.ring, { width: 700, height: 700, borderRadius: 350, borderColor: theme.border, transform: [{ translateX: -350 }, { translateY: -350 }] }]} />
        <View style={[styles.ring, { width: 480, height: 480, borderRadius: 240, borderColor: theme.border, borderStyle: 'dashed', transform: [{ translateX: -240 }, { translateY: -240 }] }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: theme.mode === 'dark' ? theme.shellBg : '#1f2a3c' }, SHADOW.lg]}>
          <View style={styles.logoBadge}>
            <Image source={require('../../assets/images/brasao-tjrr.png')} style={styles.logoImg} resizeMode="contain" />
          </View>
          <Text style={styles.title}>TechGestor</Text>
          <Text style={styles.subtitle}>Gestão de TI — TJRR</Text>

          <View style={styles.divider} />

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <MaterialIcons name="person-outline" size={14} color="#a8c8ff" style={{ marginRight: 6 }} />
              <Text style={styles.label}>LOGIN</Text>
            </View>
            <TextInput
              style={inputStyle('login')}
              placeholder="ex: rodrigo.costa (usuário de rede TJRR)"
              placeholderTextColor="#7b8799"
              value={login}
              onChangeText={setLogin}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              blurOnSubmit={false}
              onFocus={() => setFoco('login')}
              onBlur={() => setFoco('')}
              onSubmitEditing={() => senhaRef.current?.focus()}
            />
            <Text style={styles.hint}>Credencial corporativa unificada DITEC (não utilize e-mail).</Text>
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <MaterialIcons name="lock-outline" size={14} color="#a8c8ff" style={{ marginRight: 6 }} />
              <Text style={styles.label}>SENHA</Text>
            </View>
            <View style={{ justifyContent: 'center' }}>
              <TextInput
                ref={senhaRef}
                style={[inputStyle('senha'), { paddingRight: 46 }]}
                placeholder="••••••••••••"
                placeholderTextColor="#7b8799"
                value={senha}
                onChangeText={setSenha}
                secureTextEntry={!verSenha}
                returnKeyType="go"
                onFocus={() => setFoco('senha')}
                onBlur={() => setFoco('')}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setVerSenha(!verSenha)} activeOpacity={0.7}>
                <MaterialIcons name={verSenha ? 'visibility-off' : 'visibility'} size={19} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity style={styles.checkboxContainer} onPress={() => setManterConectado(!manterConectado)} activeOpacity={0.7}>
              <View style={[styles.checkbox, { backgroundColor: manterConectado ? theme.shellActive : '#ffffff', borderColor: manterConectado ? theme.shellActive : '#cbd5e1' }]}>
                {manterConectado && <MaterialIcons name="check" size={13} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>Lembrar neste terminal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={esqueciSenha} activeOpacity={0.7}>
              <Text style={styles.link}>Esqueci minha senha / Suporte DITEC</Text>
            </TouchableOpacity>
          </View>

          {erro ? (
            <View style={styles.erroBox}>
              <MaterialIcons name="error-outline" size={16} color="#fca5a5" style={{ marginRight: 8 }} />
              <Text style={{ color: '#fecaca', fontSize: 12.5, flex: 1 }}>{erro}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.btnEntrar, { backgroundColor: theme.shellActive, opacity: loading ? 0.8 : 1 }]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.btnEntrarText}>ENTRAR NO SISTEMA</Text>
                <MaterialIcons name="login" size={18} color="#fff" style={{ marginLeft: 10 }} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.secureRow}>
            <MaterialIcons name="verified-user" size={13} color="#6b7a90" />
            <Text style={styles.secureText}>Acesso restrito • Ambiente monitorado pela DITEC</Text>
          </View>
        </View>

        <Text style={[styles.footer, { color: theme.subtext }]}>Poder Judiciário do Estado de Roraima • Diretoria de Tecnologia da Informação</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  halo: { position: 'absolute', width: 520, height: 520, borderRadius: 260 },
  ring: { position: 'absolute', top: '50%', left: '50%', borderWidth: 1, opacity: 0.7 },
  card: { width: '100%', maxWidth: 440, alignItems: 'center', paddingHorizontal: 24, paddingVertical: 26, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  logoBadge: { width: 64, height: 48, borderRadius: RADIUS.md, backgroundColor: '#ffffff', padding: 4, borderWidth: 1, borderColor: 'rgba(226,232,240,0.8)' },
  logoImg: { width: '100%', height: '100%' },
  title: { fontSize: 24, marginTop: 14, fontWeight: '700', color: '#f1f5f9', letterSpacing: -0.3 },
  subtitle: { fontSize: 12.5, marginTop: 4, color: '#aab4c3' },
  divider: { height: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 18 },

  field: { width: '100%', marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '700', color: '#cbd5e1', letterSpacing: 0.8 },
  input: { width: '100%', height: 40, paddingHorizontal: 14, borderRadius: RADIUS.md, borderWidth: 1, fontSize: 13.5, color: '#f1f5f9' },
  hint: { color: '#8b97a8', fontSize: 11, marginTop: 6 },
  eyeBtn: { position: 'absolute', right: 12, padding: 2 },

  optionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', width: '100%', marginBottom: 16, gap: 8 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 16, height: 16, borderWidth: 1, borderRadius: 3, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  checkboxLabel: { fontSize: 12.5, color: '#cbd5e1' },
  link: { fontSize: 12.5, color: '#8fb8ff', fontWeight: '500' },

  erroBox: { flexDirection: 'row', alignItems: 'center', width: '100%', padding: 10, borderRadius: RADIUS.md, backgroundColor: 'rgba(220,38,38,0.16)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.35)', marginBottom: 12 },

  btnEntrar: { width: '100%', height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md },
  btnEntrarText: { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  secureRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  secureText: { color: '#6b7a90', fontSize: 11, marginLeft: 6 },
  footer: { fontSize: 11.5, marginTop: 22, textAlign: 'center' },
});
