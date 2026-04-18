import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { DataService } from '../services/DataService';

export default function ProntuarioItem({ itemId, isAdmin, nomeUsuario }) {
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

  if (carregando) return <ActivityIndicator size="small" color="#1DB954" style={{ marginTop: 10 }} />;
  if (historico.length === 0) return null; 

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={styles.titulo}>Rastro de Auditoria:</Text>
        
        {/* Renderizacao condicional baseada nos privilegios */}
        {isAdmin && (
          <TouchableOpacity onPress={handleLimparHistorico} style={styles.btnLimpar}>
            <Text style={styles.txtLimpar}>LIMPAR HISTÓRICO</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView style={{ maxHeight: 140 }} nestedScrollEnabled={true}>
        {historico.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.data}>{formatarDataHora(item.data)}</Text>
            <Text style={styles.detalhes}>{item.detalhes}</Text>
            <Text style={styles.usuario}>Por: {item.usuario}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#333', paddingTop: 10, paddingBottom: 10 },
  titulo: { color: '#1DB954', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' },
  card: { backgroundColor: '#2a2a2a', padding: 10, borderRadius: 6, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#FFAE00' },
  data: { color: '#888', fontSize: 10, marginBottom: 4, fontWeight: 'bold' },
  detalhes: { color: '#fff', fontSize: 12, marginBottom: 4 },
  usuario: { color: '#aaa', fontSize: 10, fontStyle: 'italic' },
  btnLimpar: { backgroundColor: '#ff4444', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5 },
  txtLimpar: { color: '#fff', fontSize: 10, fontWeight: 'bold' }
});