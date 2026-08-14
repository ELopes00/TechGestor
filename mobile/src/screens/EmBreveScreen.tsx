import { StyleSheet, Text, View } from "react-native";
import { cores } from "../theme/colors";

interface Props {
  titulo: string;
  emoji: string;
  descricao: string;
}

/**
 * Placeholder pra abas já reservadas no Bottom Tabs (QR Code,
 * Notificações) mas cuja feature ainda não foi construída — ver
 * "O que falta" em mobile/README.md.
 */
export default function EmBreveScreen({ titulo, emoji, descricao }: Props) {
  return (
    <View style={styles.tela}>
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>{titulo}</Text>
      </View>
      <View style={styles.conteudo}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.titulo}>Em breve</Text>
        <Text style={styles.descricao}>{descricao}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.surfaceMuted },

  header: { backgroundColor: cores.institucional800, paddingTop: 54, paddingBottom: 16, paddingHorizontal: 18 },
  headerTitulo: { color: "#fff", fontSize: 19, fontWeight: "800" },

  conteudo: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emoji: { fontSize: 40, marginBottom: 12 },
  titulo: { fontSize: 16, fontWeight: "800", color: cores.textPrimary, marginBottom: 6 },
  descricao: { fontSize: 13, color: cores.textMuted, textAlign: "center" },
});
