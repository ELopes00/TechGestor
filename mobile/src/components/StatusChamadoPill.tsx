import { View, Text, StyleSheet } from "react-native";
import { cores } from "../theme/colors";
import type { StatusChamado } from "../lib/types";

const CONFIG: Record<StatusChamado, { texto: string; ink: string; bg: string }> = {
  "Aguardando atendimento": { texto: "Aguardando atendimento", ink: cores.textSecondary, bg: cores.surfaceMuted },
  "Em andamento": { texto: "Em andamento", ink: cores.info, bg: cores.infoBg },
  "Em separação de equipamentos": { texto: "Em separação", ink: cores.atencao, bg: cores.atencaoBg },
  Instalado: { texto: "Instalado", ink: cores.institucional700, bg: cores.institucional100 },
  finalizado: { texto: "Finalizado", ink: cores.ok, bg: cores.okBg },
};

export function StatusChamadoPill({ status }: { status: StatusChamado }) {
  const cfg = CONFIG[status] ?? { texto: status, ink: cores.textMuted, bg: cores.surfaceMuted };
  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <View style={[styles.dot, { backgroundColor: cfg.ink }]} />
      <Text style={[styles.texto, { color: cfg.ink }]}>{cfg.texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 3.5, borderRadius: 999, alignSelf: "flex-start" },
  dot: { width: 5, height: 5, borderRadius: 999 },
  texto: { fontSize: 10.5, fontWeight: "700" },
});
