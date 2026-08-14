import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
} from "react-native";
import { cores } from "../theme/colors";
import { DataService } from "../lib/dataService";
import {
  STATUS_CHAMADO_OPCOES,
  chamadoFechado,
  corPrioridade,
  slaVencido,
  type Chamado,
  type StatusChamado,
} from "../lib/types";

interface Props {
  chamadoInicial: Chamado;
  meuLogin: string;
  onVoltar: () => void;
}

/**
 * Tela de detalhes do chamado — mesmas funções do modal de detalhes do
 * app original (ChamadosScreen.js): status, checklist, chat e fechamento
 * ficam disponíveis pra qualquer um que abrir o chamado, sem trava por
 * "de quem é" — é assim que o sistema real funciona (confiança entre a
 * equipe, sem bloqueio de propriedade).
 *
 * A única ação condicionada é "Assumir": só aparece enquanto o chamado
 * está na fila (sem técnico), com confirmação — mesmo texto e mesma
 * mutação do `confirmarAssumir()` do app original.
 */
export default function ChamadoDetalheScreen({ chamadoInicial, meuLogin, onVoltar }: Props) {
  const [chamado, setChamado] = useState(chamadoInicial);
  const [mensagem, setMensagem] = useState("");
  const [solucao, setSolucao] = useState("");
  const [novoStatus, setNovoStatus] = useState<StatusChamado | null>(null);
  const [enviando, setEnviando] = useState(false);

  const naFila = chamado.tecnico === "";
  const fechado = chamadoFechado(chamado.status);
  const vencido = !fechado && slaVencido(chamado.dataAbertura);

  function confirmarAssumir() {
    Alert.alert(
      "🤝 Assumir Chamado?",
      "Este chamado sairá da fila do prédio e ficará sob sua responsabilidade.",
      [
        { text: "CANCELAR", style: "cancel" },
        { text: "SIM, ASSUMIR", onPress: assumirChamado },
      ]
    );
  }

  async function assumirChamado() {
    const msg = { user: "SISTEMA", texto: `✅ ${meuLogin} assumiu o chamado da fila.`, time: Date.now() };
    const historico = [msg, ...chamado.historico];
    await DataService.atualizarChamado(chamado.id, { tecnico: meuLogin, status: "Em andamento", historico });
    await DataService.salvarLog(`ASSUMIU CHAMADO #${chamado.id.slice(0, 4)}`, meuLogin);
    setChamado({ ...chamado, tecnico: meuLogin, status: "Em andamento", historico });
  }

  async function confirmarMudarStatus() {
    if (!novoStatus || novoStatus === "finalizado") return;
    const msg = { user: "SISTEMA", texto: `🔄 Status atualizado: ${novoStatus}`, time: Date.now() };
    const historico = [msg, ...chamado.historico];
    await DataService.atualizarChamado(chamado.id, { status: novoStatus, historico });
    setChamado({ ...chamado, status: novoStatus, historico });
    setNovoStatus(null);
  }

  async function toggleCheck(id: number) {
    const checklist = chamado.checklist.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item));
    await DataService.atualizarChamado(chamado.id, { checklist });
    setChamado({ ...chamado, checklist });
  }

  async function enviarMensagem() {
    if (!mensagem.trim()) return;
    const msg = { user: meuLogin, texto: mensagem, time: Date.now() };
    const historico = [msg, ...chamado.historico];
    setEnviando(true);
    try {
      await DataService.atualizarChamado(chamado.id, { historico });
      setChamado({ ...chamado, historico });
      setMensagem("");
    } finally {
      setEnviando(false);
    }
  }

  async function fecharChamado() {
    if (!solucao.trim()) return Alert.alert("Atenção", "Descreva a solução antes de fechar o chamado.");
    const msg = { user: "SISTEMA", texto: `🏁 CHAMADO FINALIZADO POR ${meuLogin}. SOLUÇÃO: ${solucao}`, time: Date.now() };
    const historico = [msg, ...chamado.historico];
    const tecnicoFinal = chamado.tecnico || meuLogin;
    setEnviando(true);
    try {
      await DataService.atualizarChamado(chamado.id, { status: "finalizado", tecnico: tecnicoFinal, historico });
      await DataService.salvarLog(`FECHOU CHAMADO #${chamado.id.slice(0, 4)}`, meuLogin);
      setChamado({ ...chamado, status: "finalizado", tecnico: tecnicoFinal, historico });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={styles.tela}>
      <View style={styles.appBar}>
        <TouchableOpacity onPress={onVoltar} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.appBarVoltar}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.appBarTitulo}>Chamado #{chamado.id.slice(0, 4)}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.badgeRow}>
          <View style={[styles.badgePrioridade, { backgroundColor: fechado ? cores.textMuted : corPrioridade(chamado.prioridade) }]}>
            <Text style={styles.badgePrioridadeTexto}>
              {fechado ? "FINALIZADO" : vencido ? "ATRASADO — SLA" : chamado.prioridade}
            </Text>
          </View>
          {naFila && !fechado && (
            <View style={styles.badgeFila}>
              <Text style={styles.badgeFilaTexto}>NA FILA · SEM TÉCNICO</Text>
            </View>
          )}
        </View>

        <Text style={styles.titulo}>{chamado.titulo}</Text>

        <View style={styles.cardInfo}>
          <LinhaInfo rotulo="Solicitante" valor={chamado.solicitante} />
          <LinhaInfo rotulo="Unidade / Sala" valor={`${chamado.predio} / ${chamado.sala}`} />
          <LinhaInfo rotulo="Descrição do problema" valor={chamado.descricao} />
          {chamado.observacao ? <LinhaInfo rotulo="Observação" valor={chamado.observacao} /> : null}
          {chamado.equipamento ? (
            <LinhaInfo rotulo="Equipamento vinculado" valor={`${chamado.equipamento.nome} (${chamado.equipamento.pat})`} />
          ) : null}
          <LinhaInfo rotulo="Técnico" valor={chamado.tecnico || "Aguardando técnico"} />
        </View>

        {naFila && !fechado && (
          <TouchableOpacity style={styles.botaoAssumir} onPress={confirmarAssumir} activeOpacity={0.85}>
            <Text style={styles.botaoAssumirTexto}>🙋‍♂️ ASSUMIR CHAMADO</Text>
          </TouchableOpacity>
        )}

        {!fechado && (
          <>
            <View style={styles.statusHeadRow}>
              <Text style={styles.statusAtual}>Status: {chamado.status}</Text>
              <TouchableOpacity onPress={() => setNovoStatus(novoStatus ? null : chamado.status)}>
                <Text style={styles.linkMudarStatus}>MUDAR STATUS</Text>
              </TouchableOpacity>
            </View>

            {novoStatus && (
              <View style={styles.cardInfo}>
                <View style={styles.chipRow}>
                  {STATUS_CHAMADO_OPCOES.map((st) => (
                    <TouchableOpacity
                      key={st}
                      onPress={() => setNovoStatus(st)}
                      style={[styles.chip, novoStatus === st && styles.chipAtivo]}
                    >
                      <Text style={[styles.chipTexto, novoStatus === st && styles.chipTextoAtivo]}>{st}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.confirmRow}>
                  <TouchableOpacity style={styles.botaoSecundario} onPress={() => setNovoStatus(null)}>
                    <Text style={styles.botaoSecundarioTexto}>CANCELAR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.botaoPrimario} onPress={confirmarMudarStatus}>
                    <Text style={styles.botaoPrimarioTexto}>CONFIRMAR</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        <Text style={styles.secaoLabel}>Protocolo de atendimento</Text>
        <View style={styles.cardInfo}>
          {chamado.checklist.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.checklistItem}
              disabled={fechado}
              onPress={() => toggleCheck(item.id)}
            >
              <View style={[styles.checkbox, item.checked && styles.checkboxMarcado]}>
                {item.checked && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={[styles.checklistTexto, item.checked && styles.checklistTextoFeito]}>{item.text}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!fechado && (
          <>
            <Text style={styles.secaoLabel}>Solução / notas (obrigatório para fechar)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: "top" }]}
              placeholder="Descreva o que foi feito…"
              placeholderTextColor={cores.textMuted}
              value={solucao}
              onChangeText={setSolucao}
              multiline
            />
            <TouchableOpacity style={styles.botaoFechar} onPress={fecharChamado} disabled={enviando}>
              <Text style={styles.botaoFecharTexto}>Fechar chamado definitivamente</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.secaoLabel}>Histórico / chat</Text>
        <View style={styles.cardInfo}>
          {chamado.historico.length === 0 ? (
            <Text style={styles.chatVazio}>Nenhuma mensagem ainda.</Text>
          ) : (
            chamado.historico.map((msg, i) => (
              <View key={i} style={styles.chatBolha}>
                <Text style={styles.chatAutor}>{msg.user}</Text>
                <Text style={styles.chatTexto}>{msg.texto}</Text>
              </View>
            ))
          )}
        </View>

        {!fechado && (
          <View style={styles.chatInputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Digite uma mensagem…"
              placeholderTextColor={cores.textMuted}
              value={mensagem}
              onChangeText={setMensagem}
            />
            <TouchableOpacity style={styles.botaoEnviar} onPress={enviarMensagem} disabled={enviando}>
              <Text style={styles.botaoEnviarTexto}>Enviar</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function LinhaInfo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.linhaInfo}>
      <Text style={styles.linhaInfoRotulo}>{rotulo}</Text>
      <Text style={styles.linhaInfoValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.surfaceMuted },

  appBar: {
    height: 56,
    backgroundColor: cores.institucional800,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  appBarVoltar: { color: "#fff", fontSize: 14, fontWeight: "600", width: 60 },
  appBarTitulo: { color: "#fff", fontSize: 15, fontWeight: "700" },

  conteudo: { padding: 16, paddingBottom: 8 },

  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  badgePrioridade: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgePrioridadeTexto: { color: "#fff", fontSize: 11, fontWeight: "800" },
  badgeFila: { backgroundColor: cores.atencaoBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeFilaTexto: { color: cores.atencao, fontSize: 11, fontWeight: "800" },

  titulo: { fontSize: 20, fontWeight: "800", color: cores.textPrimary, marginBottom: 14 },

  cardInfo: { backgroundColor: cores.surface, borderRadius: 12, borderWidth: 1, borderColor: cores.border, padding: 14, marginBottom: 14 },
  linhaInfo: { marginBottom: 10 },
  linhaInfoRotulo: { fontSize: 11, color: cores.textMuted, marginBottom: 2 },
  linhaInfoValor: { fontSize: 14, color: cores.textPrimary },

  botaoAssumir: {
    backgroundColor: cores.ok,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 14,
    shadowColor: cores.ok,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  botaoAssumirTexto: { color: "#fff", fontSize: 14.5, fontWeight: "800", letterSpacing: 0.2 },

  statusHeadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  statusAtual: { fontSize: 14, fontWeight: "700", color: cores.atencao },
  linkMudarStatus: { fontSize: 11, fontWeight: "800", color: cores.institucional700, backgroundColor: cores.institucional100, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7 },

  secaoLabel: { fontSize: 12, fontWeight: "700", color: cores.textSecondary, marginBottom: 8, marginTop: 4 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderColor: cores.border, backgroundColor: cores.surfaceMuted, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  chipAtivo: { backgroundColor: cores.institucional800, borderColor: cores.institucional800 },
  chipTexto: { fontSize: 12, color: cores.textSecondary, fontWeight: "600" },
  chipTextoAtivo: { color: "#fff" },

  confirmRow: { flexDirection: "row", gap: 10 },
  botaoSecundario: { flex: 1, borderWidth: 1, borderColor: cores.institucional700, borderRadius: 9, paddingVertical: 10, alignItems: "center" },
  botaoSecundarioTexto: { color: cores.institucional700, fontSize: 12.5, fontWeight: "700" },
  botaoPrimario: { flex: 1, backgroundColor: cores.institucional800, borderRadius: 9, paddingVertical: 10, alignItems: "center" },
  botaoPrimarioTexto: { color: "#fff", fontSize: 12.5, fontWeight: "700" },

  checklistItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: cores.institucional500, alignItems: "center", justifyContent: "center" },
  checkboxMarcado: { backgroundColor: cores.institucional700, borderColor: cores.institucional700 },
  checkboxCheck: { color: "#fff", fontSize: 12, fontWeight: "800" },
  checklistTexto: { fontSize: 13.5, color: cores.textPrimary, flexShrink: 1 },
  checklistTextoFeito: { color: cores.textMuted, textDecorationLine: "line-through" },

  input: { borderWidth: 1, borderColor: cores.border, backgroundColor: cores.surface, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13.5, color: cores.textPrimary, marginBottom: 10 },

  botaoFechar: { backgroundColor: cores.critico, borderRadius: 9, paddingVertical: 12, alignItems: "center", marginBottom: 14 },
  botaoFecharTexto: { color: "#fff", fontSize: 13.5, fontWeight: "700" },

  chatVazio: { fontSize: 12.5, color: cores.textMuted, fontStyle: "italic" },
  chatBolha: { backgroundColor: cores.surfaceMuted, borderRadius: 9, padding: 10, marginBottom: 8 },
  chatAutor: { fontSize: 11, fontWeight: "700", color: cores.institucional700, marginBottom: 2 },
  chatTexto: { fontSize: 13, color: cores.textPrimary },

  chatInputRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  botaoEnviar: { backgroundColor: cores.institucional800, borderRadius: 9, paddingHorizontal: 16, paddingVertical: 10 },
  botaoEnviarTexto: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
