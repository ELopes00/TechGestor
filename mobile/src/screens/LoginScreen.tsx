import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { cores } from "../theme/colors";
import { entrar } from "../lib/auth";

/**
 * Mesmo fluxo do web/src/app/login: campo "Login" (não e-mail) + senha,
 * vira e-mail fake pro Firebase Auth. Sem "manter conectado" aqui — a
 * persistência do Firebase Auth no mobile já é local por padrão
 * (AsyncStorage, ver lib/firebase.ts).
 */
export default function LoginScreen() {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aoEntrar() {
    if (!login.trim() || !senha) return;
    setEnviando(true);
    setErro(null);
    try {
      await entrar(login, senha);
    } catch {
      setErro("Login ou senha incorretos.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.card}>
        <View style={styles.marca}>
          <View style={styles.logo}>
            <Text style={styles.logoTexto}>TG</Text>
          </View>
          <Text style={styles.titulo}>TechGestor 2.0</Text>
          <Text style={styles.subtitulo}>Acesso do técnico</Text>
        </View>

        {erro && (
          <View style={styles.erroBox}>
            <Text style={styles.erroTexto}>{erro}</Text>
          </View>
        )}

        <Text style={styles.rotulo}>Seu Login</Text>
        <TextInput
          style={styles.input}
          value={login}
          onChangeText={setLogin}
          placeholder="ex: admin"
          placeholderTextColor={cores.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.rotulo}>Sua Senha</Text>
        <TextInput
          style={styles.input}
          value={senha}
          onChangeText={setSenha}
          placeholder="••••••••"
          placeholderTextColor={cores.textMuted}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.botao, enviando && styles.botaoDesabilitado]}
          onPress={aoEntrar}
          disabled={enviando}
          activeOpacity={0.85}
        >
          {enviando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Entrar no sistema</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.institucional900, alignItems: "center", justifyContent: "center", padding: 24 },

  card: { width: "100%", maxWidth: 384, backgroundColor: cores.surface, borderRadius: 20, padding: 28 },

  marca: { alignItems: "center", marginBottom: 24 },
  logo: { width: 48, height: 48, borderRadius: 12, backgroundColor: cores.institucional800, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  logoTexto: { color: "#fff", fontSize: 17, fontWeight: "800" },
  titulo: { color: cores.institucional900, fontSize: 17, fontWeight: "700" },
  subtitulo: { color: cores.institucional500, fontSize: 13, marginTop: 2 },

  erroBox: { backgroundColor: cores.criticoBg, borderRadius: 8, padding: 10, marginBottom: 14 },
  erroTexto: { color: cores.critico, fontSize: 13 },

  rotulo: { fontSize: 12, fontWeight: "600", color: cores.institucional600, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: cores.border, backgroundColor: cores.surfaceMuted, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: cores.textPrimary },

  botao: { backgroundColor: cores.institucional800, borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 22 },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
