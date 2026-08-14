import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { cores } from "../theme/colors";
import { sair } from "../lib/auth";
import { DataService } from "../lib/dataService";
import type { Usuario } from "../lib/types";

interface Props {
  usuario: Usuario;
}

/**
 * Aba "Perfil" — identidade, troca de senha (14/08/2026, mesmo padrão do
 * web) e logout. Ativar notificações fica pra uma próxima iteração.
 */
export default function PerfilScreen({ usuario }: Props) {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ erro: boolean; texto: string } | null>(null);

  function confirmarSair() {
    Alert.alert("Sair do sistema?", "Você precisará entrar novamente pra ver seus chamados.", [
      { text: "CANCELAR", style: "cancel" },
      { text: "SAIR", style: "destructive", onPress: () => sair() },
    ]);
  }

  async function trocarSenha() {
    setMensagem(null);
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setMensagem({ erro: true, texto: "Preencha todos os campos." });
      return;
    }
    if (novaSenha.length < 6) {
      setMensagem({ erro: true, texto: "A nova senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setMensagem({ erro: true, texto: "As senhas novas não coincidem." });
      return;
    }

    setSalvando(true);
    const resultado = await DataService.mudarMinhaSenha(senhaAtual, novaSenha);
    setSalvando(false);

    if (resultado.sucesso) {
      setMensagem({ erro: false, texto: "Senha alterada com sucesso." });
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } else {
      setMensagem({ erro: true, texto: "Senha atual incorreta ou erro ao salvar." });
    }
  }

  return (
    <View style={styles.tela}>
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Perfil</Text>
      </View>

      <View style={styles.conteudo}>
        <View style={styles.cardInfo}>
          <Text style={styles.rotulo}>Logado como</Text>
          <Text style={styles.login}>{usuario.login}</Text>
          <Text style={styles.linha}>Perfil: {usuario.perfil === "ADM" ? "Administrador" : "Técnico"}</Text>
          <Text style={styles.linha}>Unidade: {usuario.predio || "Geral"}</Text>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.tituloCard}>🔒 Alterar minha senha</Text>

          {mensagem && (
            <View style={[styles.msgBox, mensagem.erro ? styles.msgErro : styles.msgSucesso]}>
              <Text style={[styles.msgTexto, { color: mensagem.erro ? cores.critico : cores.ok }]}>{mensagem.texto}</Text>
            </View>
          )}

          <Text style={styles.campoRotulo}>Senha atual</Text>
          <TextInput
            style={styles.input}
            value={senhaAtual}
            onChangeText={setSenhaAtual}
            placeholder="Digite sua senha atual"
            placeholderTextColor={cores.textMuted}
            secureTextEntry
          />
          <Text style={styles.campoRotulo}>Nova senha</Text>
          <TextInput
            style={styles.input}
            value={novaSenha}
            onChangeText={setNovaSenha}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor={cores.textMuted}
            secureTextEntry
          />
          <Text style={styles.campoRotulo}>Confirmar nova senha</Text>
          <TextInput
            style={styles.input}
            value={confirmarSenha}
            onChangeText={setConfirmarSenha}
            placeholder="Repita a nova senha"
            placeholderTextColor={cores.textMuted}
            secureTextEntry
          />

          <TouchableOpacity style={styles.botaoSalvar} onPress={trocarSenha} disabled={salvando} activeOpacity={0.85}>
            {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoSalvarTexto}>Salvar nova senha</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.botaoSair} onPress={confirmarSair} activeOpacity={0.85}>
          <Text style={styles.botaoSairTexto}>Sair do sistema</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.surfaceMuted },

  header: { backgroundColor: cores.institucional800, paddingTop: 54, paddingBottom: 16, paddingHorizontal: 18 },
  headerTitulo: { color: "#fff", fontSize: 19, fontWeight: "800" },

  conteudo: { padding: 16 },

  cardInfo: { backgroundColor: cores.surface, borderRadius: 12, borderWidth: 1, borderColor: cores.border, padding: 16, marginBottom: 16 },
  rotulo: { fontSize: 11, color: cores.textMuted },
  login: { fontSize: 18, fontWeight: "800", color: cores.textPrimary, marginTop: 2, marginBottom: 8 },
  linha: { fontSize: 13.5, color: cores.textSecondary, marginTop: 2 },

  tituloCard: { fontSize: 14, fontWeight: "700", color: cores.textPrimary, marginBottom: 12 },
  campoRotulo: { fontSize: 12, color: cores.textMuted, marginBottom: 4, marginTop: 10 },
  input: { borderWidth: 1, borderColor: cores.border, backgroundColor: cores.surfaceMuted, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13.5, color: cores.textPrimary },

  msgBox: { borderRadius: 8, padding: 10, marginBottom: 10 },
  msgErro: { backgroundColor: cores.criticoBg },
  msgSucesso: { backgroundColor: cores.okBg },
  msgTexto: { fontSize: 12.5 },

  botaoSalvar: { backgroundColor: cores.institucional800, borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 14 },
  botaoSalvarTexto: { color: "#fff", fontSize: 14, fontWeight: "700" },

  botaoSair: { backgroundColor: cores.critico, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  botaoSairTexto: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
