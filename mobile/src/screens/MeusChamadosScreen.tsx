import { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, RefreshControl } from "react-native";
import { cores } from "../theme/colors";
import { useChamados } from "../lib/hooks";
import { StatusChamadoPill } from "../components/StatusChamadoPill";
import { chamadoFechado, corPrioridade, slaVencido, type Chamado } from "../lib/types";

type Aba = "MEUS" | "FILA";

interface Props {
  meuLogin: string;
  meuPredio: string;
  souAdmin?: boolean;
  onAbrirChamado: (chamado: Chamado) => void;
}

/**
 * "Início" do app do técnico — mesma fila do ChamadosScreen.js original,
 * abas MEUS/FILA, cartão por chamado com prioridade/SLA/status. Tocar
 * num cartão abre a ChamadoDetalheScreen (onde "Assumir" e o resto
 * acontece — ver a tela de detalhes pra essa lógica).
 */
export default function MeusChamadosScreen({ meuLogin, meuPredio, souAdmin, onAbrirChamado }: Props) {
  const { chamados, carregando } = useChamados();
  const [aba, setAba] = useState<Aba>("MEUS");
  const [busca, setBusca] = useState("");

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return chamados.filter((c) => {
      const bateBusca =
        !termo ||
        c.titulo?.toLowerCase().includes(termo) ||
        c.solicitante?.toLowerCase().includes(termo) ||
        c.tecnico?.toLowerCase().includes(termo);
      if (!bateBusca) return false;

      if (aba === "MEUS") {
        return souAdmin ? true : c.tecnico === meuLogin;
      }
      // FILA: sem técnico, na minha unidade (ou qualquer uma se ADM), ainda não fechado.
      const semTecnico = !c.tecnico;
      const mesmaUnidade = souAdmin || c.predio === meuPredio;
      return semTecnico && mesmaUnidade && !chamadoFechado(c.status);
    });
  }, [chamados, aba, busca, meuLogin, meuPredio, souAdmin]);

  return (
    <View style={styles.tela}>
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Meus Chamados</Text>
        <Text style={styles.headerSub}>{meuLogin} · {meuPredio}</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, aba === "MEUS" && styles.tabAtiva]} onPress={() => setAba("MEUS")}>
          <Text style={[styles.tabTexto, aba === "MEUS" && styles.tabTextoAtivo]}>👤 Meus Chamados</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, aba === "FILA" && styles.tabAtiva]} onPress={() => setAba("FILA")}>
          <Text style={[styles.tabTexto, aba === "FILA" && styles.tabTextoAtivo]}>🏢 Fila ({meuPredio})</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buscaBox}>
        <TextInput
          style={styles.buscaInput}
          placeholder="🔍 Buscar por erro, assunto ou técnico…"
          placeholderTextColor={cores.textMuted}
          value={busca}
          onChangeText={setBusca}
        />
      </View>

      <FlatList
        data={visiveis}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => {}} tintColor={cores.institucional700} />}
        ListEmptyComponent={
          !carregando ? (
            <View style={styles.vazio}>
              <Text style={styles.vazioTexto}>
                {aba === "MEUS" ? "Nenhum chamado atribuído a você ainda." : "Fila vazia por aqui — bom sinal."}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => <CartaoChamado chamado={item} onPress={() => onAbrirChamado(item)} />}
      />
    </View>
  );
}

function CartaoChamado({ chamado, onPress }: { chamado: Chamado; onPress: () => void }) {
  const fechado = chamadoFechado(chamado.status);
  const vencido = !fechado && slaVencido(chamado.dataAbertura);
  const corBorda = fechado ? cores.textMuted : vencido ? cores.atencao : corPrioridade(chamado.prioridade);

  return (
    <TouchableOpacity style={[styles.cartao, { borderLeftColor: corBorda }]} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cartaoBadgeRow}>
        <View style={[styles.badge, { backgroundColor: corBorda }]}>
          <Text style={styles.badgeTexto}>
            {fechado ? "FINALIZADO" : vencido ? "ATRASADO — SLA" : chamado.prioridade}
          </Text>
        </View>
        {!chamado.tecnico && !fechado && (
          <View style={styles.badgeFila}>
            <Text style={styles.badgeFilaTexto}>NA FILA</Text>
          </View>
        )}
      </View>

      <Text style={styles.cartaoTitulo} numberOfLines={1}>{chamado.titulo}</Text>
      <Text style={styles.cartaoSub} numberOfLines={1}>
        {chamado.solicitante} · {chamado.sala}
      </Text>

      <View style={styles.cartaoRodape}>
        <StatusChamadoPill status={chamado.status} />
        <Text style={styles.cartaoLocal} numberOfLines={1}>
          📍 {chamado.predio}{chamado.tecnico ? ` · ${chamado.tecnico}` : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.surfaceMuted },

  header: { backgroundColor: cores.institucional800, paddingTop: 54, paddingBottom: 16, paddingHorizontal: 18 },
  headerTitulo: { color: "#fff", fontSize: 19, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 },

  tabs: { flexDirection: "row", gap: 8, padding: 14, paddingBottom: 6 },
  tab: { flex: 1, backgroundColor: cores.surface, borderWidth: 1, borderColor: cores.border, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  tabAtiva: { backgroundColor: cores.institucional100, borderColor: cores.institucional700 },
  tabTexto: { fontSize: 12, fontWeight: "700", color: cores.textMuted },
  tabTextoAtivo: { color: cores.institucional800 },

  buscaBox: { paddingHorizontal: 14, paddingBottom: 6 },
  buscaInput: { backgroundColor: cores.surface, borderWidth: 1, borderColor: cores.border, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: cores.textPrimary },

  lista: { padding: 14, paddingTop: 6, gap: 10, flexGrow: 1 },

  cartao: { backgroundColor: cores.surface, borderRadius: 12, borderWidth: 1, borderColor: cores.border, borderLeftWidth: 5, padding: 13 },
  cartaoBadgeRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  badgeTexto: { color: "#fff", fontSize: 9.5, fontWeight: "800" },
  badgeFila: { backgroundColor: cores.atencaoBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  badgeFilaTexto: { color: cores.atencao, fontSize: 9.5, fontWeight: "800" },

  cartaoTitulo: { fontSize: 14.5, fontWeight: "700", color: cores.textPrimary },
  cartaoSub: { fontSize: 12, color: cores.textMuted, marginTop: 2 },

  cartaoRodape: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 8 },
  cartaoLocal: { fontSize: 11, color: cores.textSecondary, flexShrink: 1, textAlign: "right" },

  vazio: { paddingTop: 60, alignItems: "center" },
  vazioTexto: { fontSize: 13, color: cores.textMuted, fontStyle: "italic" },
});
