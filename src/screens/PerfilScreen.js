import React, { useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, ScrollView } from 'react-native';
import { Card, Btn } from '../components';
import { DataService } from '../services/DataService';

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
      <Text style={[styles.sectionTitle, { color: theme.primary }]}>Meu Perfil</Text>
      
      {/* INFORMAÇÕES DO usuario */}
      <Card theme={theme} style={{ marginBottom: 20 }}>
        <Text style={{ color: theme.subtext, fontSize: 12 }}>Logado como:</Text>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 5 }}>{user.login}</Text>
        <Text style={{ color: theme.primary, fontSize: 14, marginBottom: 5 }}>Perfil: {user.perfil}</Text>
        <Text style={{ color: theme.text, fontSize: 14 }}>Prédio: {user.predio || 'Geral'}</Text>
      </Card>

      {/* ALTERAR SENHA */}
      <Card theme={theme} style={{ marginBottom: 20 }}>
        <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16, marginBottom: 15 }}>🔒 Alterar Minha Senha</Text>
        
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
        <Btn title="SAIR DO SISTEMA (LOGOUT)" onPress={onLogout} danger theme={theme} />
      )}
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontWeight: 'bold', fontSize: 20, marginBottom: 20 },
  input: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 15 }
});