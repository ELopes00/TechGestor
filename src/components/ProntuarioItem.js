import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { DataService } from '../services/DataService';
import { RADIUS } from '../theme/themes';

export default function ProntuarioItem({ itemId, isAdmin, nomeUsuario, theme }) {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!itemId) return;
    const unsubscribe = DataService.subscribeProntuarioItem(itemId, (dados) => {
      setHistorico(dados);
      setCarregando(false);
    });
    return () => unsubscribe();
  }, [itemId]);

  const formatarDataHora = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleLimparHistorico = () => {
    const acao = async () => {
      await DataService.limparProntuarioItem(itemId, nomeUsuario);
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Confirma a exclusão permanente do histórico deste equipamento?")) {
        acao();
      }
    } else {
      Alert.alert(
        "Confirmação de Exclusão",
        "Confirma a exclusão permanente do histórico deste equipamento?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Confirmar", style: "destructive", onPress: acao }
        ]
      );
    }
  };

  if (carregando) return <ActivityIndicator size="small" color={theme?.primary || '#0284C7'} style={{ marginTop: 10 }} />;
  if (historico.length === 0) return null;

  const t = theme || { primary: '#0284C7', text: '#F8FAFC', subtext: '#94A3B8', cardAlt: '#243248', border: '#2A3B52', sec: '#F5A524', offline: '#F04438' };

  return (
    <View style={[styles.container, { borderTopColor: t.border }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={[styles.titulo, { color: t.primary }]}>Rastro de Auditoria</Text>

        {/* Renderizacao condicional baseada nos privilegios */}
        {isAdmin && (
          <TouchableOpacity onPress={handleLimparHistorico} style={[styles.btnLimpar, { backgroundColor: t.offline }]} activeOpacity={0.75}>
            <Text style={styles.txtLimpar}>LIMPAR HISTÓRICO</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={{ maxHeight: 140 }} nestedScrollEnabled={true}>
        {historico.map((item) => (
          <View key={item.id} style={[styles.card, { backgroundColor: t.cardAlt, borderLeftColor: t.sec }]}>
            <Text style={[styles.data, { color: t.subtext }]}>{formatarDataHora(item.data)}</Text>
            <Text style={[styles.detalhes, { color: t.text }]}>{item.detalhes}</Text>
            <Text style={[styles.usuario, { color: t.subtext }]}>Por: {item.usuario}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 15, borderTopWidth: 1, paddingTop: 10, paddingBottom: 10 },
  titulo: { fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3 },
  card: { padding: 12, borderRadius: RADIUS.sm, marginBottom: 8, borderLeftWidth: 3 },
  data: { fontSize: 10, marginBottom: 4, fontWeight: '700' },
  detalhes: { fontSize: 12, marginBottom: 4 },
  usuario: { fontSize: 10, fontStyle: 'italic' },
  btnLimpar: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm },
  txtLimpar: { color: '#fff', fontSize: 10, fontWeight: '700' }
});