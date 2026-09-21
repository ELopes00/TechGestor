import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, View, TouchableOpacity } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

import { Card } from '../components';
import { DataService } from '../services/DataService';
import { RADIUS, SHADOW } from '../theme/themes';

export default function LoginScreen({ theme }) {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manterConectado, setManterConectado] = useState(false);
  const senhaRef = useRef(null);

  const handleLogin = async () => {
    if (loading) return;
    if (!login || !senha) return Alert.alert('Atenção', 'Preencha o login e a senha!');

    setLoading(true);
    try {
      // 1. Grava a preferência do usuario na memoria ANTES do login
      if (manterConectado) {
        await AsyncStorage.setItem('@manter_logado', 'true');
      } else {
        await AsyncStorage.removeItem('@manter_logado'); // Se não marcou, apaga o registo
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
      Alert.alert('Erro de Autenticação', 'Login ou senha incorretos.');
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Card theme={theme} style={[styles.card, { borderColor: theme.border }]}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <Image source={require('../../assets/images/logo-tjrr.png')} style={styles.logoImg} resizeMode="contain" />
          </View>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>TechGestor</Text>
        <Text style={[styles.subtitle, { color: theme.subtext }]}>Informe suas credenciais para acessar o sistema</Text>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <MaterialIcons name="person-outline" size={13} color={theme.subtext} style={{ marginRight: 4 }} />
            <Text style={[styles.label, { color: theme.subtext }]}>Usuário</Text>
          </View>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
            placeholder="seu.usuario"
            placeholderTextColor={theme.subtext}
            value={login}
            onChangeText={setLogin}
            autoCapitalize="none"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => senhaRef.current?.focus()}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <MaterialIcons name="lock-outline" size={13} color={theme.subtext} style={{ marginRight: 4 }} />
            <Text style={[styles.label, { color: theme.subtext }]}>Senha</Text>
          </View>
          <View style={{ position: 'relative', justifyContent: 'center' }}>
            <TextInput
              ref={senhaRef}
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, paddingRight: 44 }]}
              placeholder="••••••••"
              placeholderTextColor={theme.subtext}
              value={senha}
              onChangeText={setSenha}
              secureTextEntry={!verSenha}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setVerSenha(!verSenha)} activeOpacity={0.7}>
              <MaterialIcons name={verSenha ? 'visibility-off' : 'visibility'} size={19} color={theme.subtext} />
            </TouchableOpacity>
          </View>
        </View>

        {/* OPÇÃO MANTENHA-ME CONECTADO */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setManterConectado(!manterConectado)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, { borderColor: theme.border, backgroundColor: manterConectado ? theme.primary : 'transparent' }]}>
            {manterConectado && <MaterialIcons name="check" size={13} color="#fff" />}
          </View>
          <Text style={[styles.checkboxLabel, { color: theme.text }]}>Manter conectado neste dispositivo</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
        ) : (
          <TouchableOpacity
            style={[styles.btnEntrar, { backgroundColor: theme.primary }, SHADOW.sm]}
            onPress={handleLogin}
            activeOpacity={0.85}
          >
            <MaterialIcons name="lock" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.btnEntrarText}>Entrar</Text>
          </TouchableOpacity>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 380, alignItems: 'center', padding: 32, borderRadius: RADIUS.xl, borderWidth: 1, ...SHADOW.sm },
  logoRow: { marginBottom: 14, alignItems: 'center' },
  logoBadge: { width: 84, height: 64, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1220', padding: 8 },
  logoImg: { width: '100%', height: '100%' },
  title: { fontSize: 19, marginBottom: 6, fontWeight: '700' },
  subtitle: { fontSize: 12.5, marginBottom: 24, textAlign: 'center', lineHeight: 18 },

  field: { width: '100%', marginBottom: 14 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 12.5, fontWeight: '600' },
  input: { width: '100%', padding: 12, borderRadius: RADIUS.md, borderWidth: 1, fontSize: 14 },
  eyeBtn: { position: 'absolute', right: 12 },

  checkboxContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 2, marginBottom: 18 },
  checkbox: { width: 18, height: 18, borderWidth: 1.5, borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginRight: 9 },
  checkboxLabel: { fontSize: 13 },

  btnEntrar: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: RADIUS.md },
  btnEntrarText: { color: '#fff', fontWeight: '700', fontSize: 14.5 },
});
