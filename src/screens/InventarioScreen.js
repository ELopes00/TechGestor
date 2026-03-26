import { useState, useEffect } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import { CameraView, Camera } from 'expo-camera'; 
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { Btn, Card } from '../components';
import { DataService } from '../services/DataService'; 

export default function InventarioScreen({ inventario, chamados, addLog, theme, users }) {

  const [search, setSearch] = useState('');
  const [itemEmprestimo, setItemEmprestimo] = useState(null);
  const [quemVaiPegar, setQuemVaiPegar] = useState('');
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedItemHistory, setSelectedItemHistory] = useState(null);

  // CÂMERA
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState('');


  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [responsavel, setResponsavel] = useState('');
  const [matricula, setMatricula] = useState('');
  const [setor, setSetor] = useState('');
  const [cpuMarca, setCpuMarca] = useState('');
  const [cpuTombo, setCpuTombo] = useState('');
  const [monitor1, setMonitor1] = useState('');
  const [monitor2, setMonitor2] = useState('');
  const [ipImpressora, setIpImpressora] = useState('');
  const [nobreak, setNobreak] = useState('');

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    if (Platform.OS !== 'web') {
      getCameraPermissions();
    }
  }, []);

  const adicionarItem = async () => {
    if (!responsavel || !cpuTombo) return Alert.alert('Erro', 'Preencha o Nome do Responsável e o Tombo da CPU');
    try {
      const payload = { 
        nome: responsavel,
        pat: cpuTombo,
        responsavel, matricula, setor, cpuMarca, cpuTombo, monitor1, monitor2, ipImpressora, nobreak,
        emprestadoPara: null, dataCadastro: Date.now() 
      };
      
      await DataService.salvarItemInventario(payload);
      if(addLog) addLog(`CRIOU ITEM INVENTÁRIO: ${responsavel} (${cpuTombo})`);
      
      setResponsavel(''); setMatricula(''); setSetor(''); setCpuMarca('');
      setCpuTombo(''); setMonitor1(''); setMonitor2(''); setIpImpressora(''); setNobreak('');
      setIsAddModalOpen(false);
    } catch (error) { Alert.alert('Erro', 'Falha ao salvar no banco.'); }
  };

  const exportarPDF = async () => {
    const html = `
      <html><head><style>body{font-family:sans-serif; padding:20px;} table{width:100%; border-collapse:collapse; margin-top:20px;} th,td{border:1px solid #ddd; padding:10px; text-align:left;} th{background-color:#1DB954; color:white;}</style></head>
      <body><h2>TechGestor - Relatório de Inventário</h2>
      <table><tr><th>Responsável</th><th>Setor</th><th>Tombo CPU</th><th>IP Impressora</th></tr>
      ${inventarioFiltrado.map(i => `<tr><td>${i.responsavel || i.nome}</td><td>${i.setor || 'N/A'}</td><td>${i.cpuTombo || i.pat}</td><td>${i.ipImpressora || 'N/A'}</td></tr>`).join('')}
      </table></body></html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
      if(addLog) addLog(`Exportou PDF do Inventário`);
    } catch (e) { Alert.alert('Erro', 'Falha ao gerar PDF.'); }
  };

  const exportarExcel = () => {
    Alert.alert('Aviso', 'A exportação direta para Excel nativo estará disponível em futuras atualizações.');
  };

  const emprestar = async () => {
    if (!quemVaiPegar) return;
    try {
      await DataService.atualizarItemInventario(itemEmprestimo.id, { emprestadoPara: quemVaiPegar, dataEmprestimo: Date.now() });
      if(addLog) addLog(`EMPRESTOU ${itemEmprestimo.nome} PARA ${quemVaiPegar}`);
      setItemEmprestimo(null); setQuemVaiPegar('');
    } catch (error) { Alert.alert('Erro', 'Falha ao atualizar o empréstimo.'); }
  };

  const devolver = async (item) => {
    try {
      await DataService.atualizarItemInventario(item.id, { emprestadoPara: null, dataEmprestimo: null });
      if(addLog) addLog(`RECEBEU DEVOLUÇÃO: ${item.nome} DE ${item.emprestadoPara}`);
    } catch (error) { Alert.alert('Erro', 'Falha ao processar devolução.'); }
  };

  const handleExcluir = async (item) => {
    const acao = async () => {
      try {
        await DataService.deletarItemInventario(item.id);
        if(addLog) addLog(`EXCLUIU ITEM INVENTÁRIO: ${item.nome}`);
      } catch (e) { Alert.alert('Erro', 'Falha ao excluir.'); }
    };
    if (Platform.OS === 'web') {
      if (window.confirm("Deseja apagar este equipamento permanentemente?")) acao();
    } else {
      Alert.alert("Excluir Item", "Deseja apagar permanentemente?", [{ text: "Cancelar", style: "cancel" }, { text: "Apagar", style: "destructive", onPress: acao }]);
    }
  };

  const abrirProntuario = (item) => {
    const history = chamados ? chamados.filter((c) => c.equipamento && c.equipamento.id === item.id) : [];
    setSelectedItemHistory({ ...item, history });
    setHistoryModalVisible(true);
  };

  const getHealthStatus = (qtd) => {
    if (qtd === 0) return { label: 'Excelente', color: theme.online };
    if (qtd < 3) return { label: 'Atenção', color: theme.busy || theme.sec };
    return { label: 'Crítico', color: '#ff4444' };
  };

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    setIsScannerOpen(false);
    if (scannerTarget === 'busca') setSearch(data);
    else if (scannerTarget === 'cadastro') setCpuTombo(data); 
  };

  const openScanner = (target) => {
    if (Platform.OS === 'web') return Alert.alert('Aviso', 'Leitor funciona apenas no app mobile.');
    if (hasPermission === null) return Alert.alert('Aviso', 'A pedir permissão da câmara...');
    if (hasPermission === false) return Alert.alert('Erro', 'Sem acesso à câmara.');
    setScannerTarget(target); setScanned(false); setIsScannerOpen(true);
  };

  const inventarioFiltrado = inventario.filter((i) => {
    const termo = search.toLowerCase();
    return ((i.nome && i.nome.toLowerCase().includes(termo)) || (i.pat && i.pat.includes(termo)) || (i.responsavel && i.responsavel.toLowerCase().includes(termo)) || (i.ipImpressora && i.ipImpressora.includes(termo)));
  });

  return (
    <ScrollView style={{ padding: 16 }}>
      
      {/* CABEÇALHO */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 22, color: '#1DB954' }}>📦 Inventário</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={exportarPDF} style={{ backgroundColor: '#1DB954', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6, marginLeft: 10, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>📄 PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={exportarExcel} style={{ backgroundColor: '#FFAE00', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6, marginLeft: 10, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>📊 EXCEL</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* BARRA DE PESQUISA */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e1e', borderRadius: 8, borderWidth: 1, borderColor: '#333', paddingHorizontal: 12, marginBottom: 15 }}>
        <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
        <TextInput 
          style={{ flex: 1, color: '#fff', paddingVertical: 12, fontSize: 14 }} 
          placeholder="Buscar Responsável, Tombo ou IP..." 
          placeholderTextColor="#888" 
          value={search} 
          onChangeText={setSearch} 
        />
        <TouchableOpacity onPress={() => openScanner('busca')} style={{ padding: 5 }}>
          <Text style={{ fontSize: 18 }}>📷</Text>
        </TouchableOpacity>
      </View>
      
      {/* BOTÃO ADICIONAR NOVO (Para abrir o formulário) */}
      <TouchableOpacity onPress={() => setIsAddModalOpen(true)} style={{ backgroundColor: '#1DB954', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>+ ADICIONAR NOVO REGISTRO</Text>
      </TouchableOpacity>

      {/* LÓGICA DE EMPRÉSTIMO MANTIDA */}
      {itemEmprestimo && (
        <Card theme={theme} style={{ borderColor: '#FFAE00', borderWidth: 2, marginBottom: 20 }}>
          <Text style={{ color: theme.text, fontWeight: 'bold', marginBottom: 5 }}>Emprestar: {itemEmprestimo.nome}</Text>
          <Text style={{ color: theme.subtext, marginBottom: 5 }}>Selecione quem está retirando:</Text>
          {users.map((u) => (
            <TouchableOpacity key={u.login} style={{ padding: 10, borderBottomWidth: 1, borderColor: theme.border }} onPress={() => setQuemVaiPegar(u.login)}>
              <Text style={{ color: quemVaiPegar === u.login ? '#FFAE00' : theme.text }}>{u.login}</Text>
            </TouchableOpacity>
          ))}
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <Btn title="CONFIRMAR" onPress={emprestar} theme={theme} style={{ flex: 1, marginRight: 5, backgroundColor: '#FFAE00' }} />
            <Btn title="CANCELAR" onPress={() => setItemEmprestimo(null)} theme={theme} danger style={{ flex: 1 }} />
          </View>
        </Card>
      )}

      {/* LISTAGEM DOS ITENS */}
      {inventarioFiltrado.map((item) => (
        <Card key={item.id} theme={theme} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderColor: item.emprestadoPara ? '#FFAE00' : theme.border, marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>{item.responsavel || item.nome}</Text>
              {item.emprestadoPara && <Text style={{ color: '#FFAE00', fontSize: 10, fontWeight: 'bold', marginLeft: 5 }}>(EMPRESTADO)</Text>}
            </View>
            <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 2 }}>💻 Tombo: {item.cpuTombo || item.pat} | 🏢 {item.setor || 'Sem setor'}</Text>
            {item.ipImpressora ? <Text style={{ color: theme.subtext, fontSize: 12 }}>🖨️ IP: {item.ipImpressora}</Text> : null}
            {item.emprestadoPara && <Text style={{ color: '#FFAE00', fontSize: 12, marginTop: 4 }}>Com: {item.emprestadoPara}</Text>}
          </View>
          
          <View style={{ alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <TouchableOpacity onPress={() => abrirProntuario(item)} style={{ backgroundColor: theme.inputBg, padding: 8, borderRadius: 5, marginRight: 8, borderWidth: 1, borderColor: theme.border }}>
                <Text style={{ fontSize: 16 }}>🏥</Text>
              </TouchableOpacity>
              {item.emprestadoPara ? (
                <TouchableOpacity onPress={() => devolver(item)} style={{ backgroundColor: '#FFAE00', padding: 8, borderRadius: 5, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 10, color: '#000', fontWeight: 'bold' }}>DEVOLVER</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setItemEmprestimo(item)} style={{ backgroundColor: '#1DB954', padding: 8, borderRadius: 5, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 10, color: '#fff', fontWeight: 'bold' }}>EMPRESTAR</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => handleExcluir(item)} style={{ padding: 4 }}>
              <Text style={{ fontSize: 18 }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}

            <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 15 }}>
          <View style={{ width: '100%', maxWidth: 500, backgroundColor: '#121212', borderRadius: 12, padding: 20, maxHeight: '95%' }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)} style={{ backgroundColor: '#ff4444', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>✖ FECHAR</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitleModal}>Identificação</Text>
              <TextInput style={styles.inputModal} placeholder="Nome do Responsável" placeholderTextColor="#666" value={responsavel} onChangeText={setResponsavel} />
              <TextInput style={styles.inputModal} placeholder="Matrícula" placeholderTextColor="#666" value={matricula} onChangeText={setMatricula} />
              <TextInput style={styles.inputModal} placeholder="Setor / Unidade" placeholderTextColor="#666" value={setor} onChangeText={setSetor} />

              <Text style={[styles.sectionTitleModal, { marginTop: 15 }]}>Hardware Principais</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TextInput style={[styles.inputModal, { width: '48%' }]} placeholder="CPU Marca" placeholderTextColor="#666" value={cpuMarca} onChangeText={setCpuMarca} />
                <View style={{ width: '48%', flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <TextInput style={[styles.inputModal, { flex: 1, marginBottom: 0 }]} placeholder="CPU Tombo" placeholderTextColor="#666" value={cpuTombo} onChangeText={setCpuTombo} keyboardType="numeric" />
                  <TouchableOpacity onPress={() => openScanner('cadastro')} style={{ backgroundColor: '#1DB954', padding: 12, borderRadius: 8, marginLeft: 5 }}>
                    <Text style={{ fontSize: 16 }}>📷</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TextInput style={[styles.inputModal, { width: '48%' }]} placeholder="Monitor 1 Tombo" placeholderTextColor="#666" value={monitor1} onChangeText={setMonitor1} />
                <TextInput style={[styles.inputModal, { width: '48%' }]} placeholder="Monitor 2 Tombo" placeholderTextColor="#666" value={monitor2} onChangeText={setMonitor2} />
              </View>

              <Text style={[styles.sectionTitleModal, { marginTop: 15 }]}>Impressora & Rede</Text>
              <TextInput style={styles.inputModal} placeholder="IP da Impressora (Ex: 192.168...)" placeholderTextColor="#666" value={ipImpressora} onChangeText={setIpImpressora} />
              <TextInput style={styles.inputModal} placeholder="Tombo Nobreak" placeholderTextColor="#666" value={nobreak} onChangeText={setNobreak} />

              <TouchableOpacity onPress={adicionarItem} style={{ backgroundColor: '#1DB954', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>SALVAR INVENTÁRIO</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/*CAMERA */}
      <Modal visible={isScannerOpen} animationType="slide" transparent={false} onRequestClose={() => setIsScannerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView style={{ flex: 1 }} facing="back" onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}>
            <View style={{ flex: 1, backgroundColor: 'transparent', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 40 }}>
              <TouchableOpacity onPress={() => setIsScannerOpen(false)} style={{ backgroundColor: '#ff4444', padding: 15, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>CANCELAR LEITURA</Text>
              </TouchableOpacity>
            </View>
          </CameraView>
          <View style={{ position: 'absolute', top: '35%', left: '15%', width: '70%', height: '30%', borderWidth: 2, borderColor: '#1DB954', borderRadius: 10, backgroundColor: 'rgba(29, 185, 84, 0.1)' }} pointerEvents="none" />
        </View>
      </Modal>

      {/* PRONTUÁRIO */}
      <Modal visible={historyModalVisible} animationType="slide" transparent={true} onRequestClose={() => setHistoryModalVisible(false)}>
        {selectedItemHistory && (
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
            <View style={{ backgroundColor: theme.card, borderRadius: 15, padding: 20, maxHeight: '80%', borderWidth: 1, borderColor: theme.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 10 }}>
                <Text style={{ fontSize: 28, marginRight: 10 }}>🏥</Text>
                <View>
                  <Text style={{ color: theme.tert || '#1DB954', fontSize: 16, fontWeight: 'bold' }}>Prontuário da Máquina</Text>
                  <Text style={{ color: theme.text, fontSize: 14 }}>{selectedItemHistory.responsavel || selectedItemHistory.nome}</Text>
                  <Text style={{ color: theme.subtext, fontSize: 10 }}>Patrimônio: {selectedItemHistory.cpuTombo || selectedItemHistory.pat}</Text>
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: theme.inputBg, padding: 10, borderRadius: 10, marginBottom: 15 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold' }}>{selectedItemHistory.history.length}</Text>
                  <Text style={{ color: theme.subtext, fontSize: 10 }}>CHAMADOS</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: getHealthStatus(selectedItemHistory.history.length).color, fontSize: 18, fontWeight: 'bold' }}>{getHealthStatus(selectedItemHistory.history.length).label}</Text>
                  <Text style={{ color: theme.subtext, fontSize: 10 }}>SAÚDE</Text>
                </View>
              </View>

              <Text style={{ color: theme.text, fontWeight: 'bold', marginBottom: 10 }}>Histórico de Intervenções:</Text>
              <ScrollView>
                {selectedItemHistory.history.length === 0 ? (
                  <Text style={{ color: theme.subtext, fontStyle: 'italic', textAlign: 'center', marginVertical: 10 }}>Esta máquina nunca deu problemas. Excelente estado!</Text>
                ) : (
                  selectedItemHistory.history.map((h) => (
                    <View key={h.id} style={{ backgroundColor: theme.inputBg, padding: 12, borderRadius: 8, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: h.status === 'FECHADO' ? '#1DB954' : '#ff4444' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ color: h.status === 'FECHADO' ? '#1DB954' : '#ff4444', fontWeight: 'bold', fontSize: 10 }}>{h.status}</Text>
                        <Text style={{ color: theme.subtext, fontSize: 10 }}>{new Date(h.dataAbertura).toLocaleDateString()}</Text>
                      </View>
                      <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 12 }}>{h.descricao}</Text>
                      <Text style={{ color: theme.subtext, fontSize: 10, marginTop: 4 }}>👨‍🔧 Técnico: {h.tecnico}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
              <Btn title="FECHAR PRONTUÁRIO" onPress={() => setHistoryModalVisible(false)} theme={theme} style={{ marginTop: 15 }} />
            </View>
          </View>
        )}
      </Modal>

      <View style={{ height: 40 }}/>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitleModal: { fontWeight: 'bold', fontSize: 14, color: '#1DB954', marginBottom: 10 },
  inputModal: { backgroundColor: '#1e1e1e', borderColor: '#333', borderWidth: 1, color: '#fff', padding: 14, marginVertical: 6, borderRadius: 8, fontSize: 14 }
});