import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View, TouchableOpacity } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BackgroundImage, Btn, Card } from '../components';
import { DataService } from '../services/DataService';

export default function LoginScreen({ theme }) {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [manterConectado, setManterConectado] = useState(false);

  const handleLogin = async () => {
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
          const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: 'b0198725-e695-4696-8706-ec75061f83cf' });
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
      
      <BackgroundImage /> 

      <Card theme={theme} style={styles.card}>
        <Text style={[styles.logo, { color: theme.primary }]}>TG</Text>
        <Text style={[styles.title, { color: theme.text }]}>TechGestor</Text>

        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="Seu Login (ex: admin)"
          placeholderTextColor={theme.subtext}
          value={login}
          onChangeText={setLogin}
          autoCapitalize="none"
        />

        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="Sua Senha"
          placeholderTextColor={theme.subtext}
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
        />

        {/* OPÇÃO MANTENHA-ME CONECTADO */}
        <TouchableOpacity 
          style={styles.checkboxContainer} 
          onPress={() => setManterConectado(!manterConectado)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, { borderColor: theme.primary, backgroundColor: manterConectado ? theme.primary : 'transparent' }]}>
            {manterConectado && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={[styles.checkboxLabel, { color: theme.text }]}>Mantenha-me conectado</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
        ) : (
          <Btn title="ENTRAR NO SISTEMA" onPress={handleLogin} theme={theme} style={{ marginTop: 20, width: '100%' }} />
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 400, alignItems: 'center', padding: 40, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  logo: { fontSize: 50, fontWeight: 'bold', marginBottom: -5 },
  title: { fontSize: 22, marginBottom: 30, fontWeight: 'bold', letterSpacing: 2 },
  input: { width: '100%', padding: 15, borderRadius: 12, marginVertical: 10, borderWidth: 1 },
  
  // ESTILOS DA CAIXINHA DE SELEÇÃO
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 5, marginBottom: 15 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  checkmark: { color: '#000', fontSize: 14, fontWeight: 'bold' },
  checkboxLabel: { fontSize: 14 }
});