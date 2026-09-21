import React, { useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, Btn } from '../components';
import { DataService } from '../services/DataService';
import { RADIUS } from '../theme/themes';

export default function PerfilScreen({ user, theme, onLogout }) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const handleTrocarSenha = async () => {
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      return Alert.alert("Aviso", "Preenche todos os campos.");
    }
    if (novaSenha.length < 6) {
      return Alert.alert("Erro", "A nova senha deve ter pelo menos 6 caracteres.");
    }
    if (novaSenha !== confirmarSenha) {
      return Alert.alert("Erro", "As senhas novas não coincidem.");
    }

    const result = await DataService.mudarMinhaSenha(senhaAtual, novaSenha);

    if (result.sucesso) {
      Alert.alert("Sucesso!", "A tua senha foi alterada com segurança.");
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    } else {
      const msgErro = result.erro === 'auth/invalid-credential' || result.erro === 'auth/wrong-password'
        ? "A senha atual está incorreta." 
        : "Erro ao atualizar. Tenta novamente.";
      Alert.alert("Erro", msgErro);
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <MaterialIcons name="person-outline" size={19} color={theme.primary} style={{ marginRight: 7 }} />
        <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Meu Perfil</Text>
      </View>

      {/* INFORMAÇÕES DO usuario */}
      <Card theme={theme} style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
        <View>
          <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
            <Text style={{ color: theme.primary, fontSize: 20, fontWeight: '800' }}>{(user.login || '?').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={[styles.onlineDot, { backgroundColor: theme.online, borderColor: theme.card }]} />
        </View>
        <View style={{ marginLeft: 14, flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>{user.login}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <View style={[styles.perfilBadge, { backgroundColor: theme.primarySoft }]}>
              <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '700' }}>{user.perfil}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <MaterialIcons name="apartment" size={12} color={theme.subtext} style={{ marginRight: 4 }} />
            <Text style={{ color: theme.subtext, fontSize: 12 }}>{user.predio || 'Geral'}</Text>
          </View>
        </View>
      </Card>

      {/* ALTERAR SENHA */}
      <Card theme={theme} style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <MaterialIcons name="lock-outline" size={16} color={theme.primary} style={{ marginRight: 6 }} />
          <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 15 }}>Alterar Minha Senha</Text>
        </View>

        <Text style={{ color: theme.subtext, fontSize: 12, marginBottom: 5 }}>Senha Atual:</Text>
        <TextInput
          secureTextEntry
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          value={senhaAtual}
          onChangeText={setSenhaAtual}
          placeholder="Digita a tua senha atual"
          placeholderTextColor={theme.subtext}
        />

        <Text style={{ color: theme.subtext, fontSize: 12, marginBottom: 5 }}>Nova Senha:</Text>
        <TextInput
          secureTextEntry
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          value={novaSenha}
          onChangeText={setNovaSenha}
          placeholder="Mínimo 6 caracteres"
          placeholderTextColor={theme.subtext}
        />

        <Text style={{ color: theme.subtext, fontSize: 12, marginBottom: 5 }}>Confirmar Nova Senha:</Text>
        <TextInput
          secureTextEntry
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, marginBottom: 15 }]}
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
          placeholder="Repete a nova senha"
          placeholderTextColor={theme.subtext}
        />

        <Btn title="SALVAR NOVA SENHA" onPress={handleTrocarSenha} theme={theme} />
      </Card>

      {/* BOTÃO DE SAIR FICA BEM AQUI */}
      {onLogout && (
        <TouchableOpacity onPress={onLogout} activeOpacity={0.85} style={[styles.logoutBtn, { backgroundColor: theme.offline }]}>
          <MaterialIcons name="logout" size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>SAIR DO SISTEMA</Text>
        </TouchableOpacity>
      )}
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontWeight: '800', fontSize: 22, marginBottom: 16 },
  avatar: { width: 52, height: 52, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  onlineDot: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  perfilBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.pill },
  input: { padding: 13, borderRadius: RADIUS.md, borderWidth: 1, marginBottom: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: RADIUS.md },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});