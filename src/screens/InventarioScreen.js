import { useState, useEffect } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform, Keyboard } from 'react-native';
import { CameraView, Camera } from 'expo-camera'; 
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { Btn, Card } from '../components';
import { DataService } from '../services/DataService'; 

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase'; 
import { EQUIPAMENTOS, PREDIOS, SERVIDORES, SETORES_UNIDADES } from '../../constants/const';

export default function InventarioScreen({ inventario, chamados, addLog, theme, users }) {

  const [search, setSearch] = useState('');
  const [itemEmprestimo, setItemEmprestimo] = useState(null);
  const [quemVaiPegar, setQuemVaiPegar] = useState('');
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedItemHistory, setSelectedItemHistory] = useState(null);

  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Estados do Formulário Base // 
  const [responsavel, setResponsavel] = useState('');
  const [matricula, setMatricula] = useState('');
  const [setor, setSetor] = useState('');
  
  const [cpuMarca, setCpuMarca] = useState('');
  const [cpuTombo, setCpuTombo] = useState('');
  
  const [notebookMarca, setNotebookMarca] = useState('');
  const [notebookTombo, setNotebookTombo] = useState('');
  
  const [monitor1Marca, setMonitor1Marca] = useState('');
  const [monitor1, setMonitor1] = useState(''); 
  const [monitor2Marca, setMonitor2Marca] = useState('');
  const [monitor2, setMonitor2] = useState(''); 

  const [impressoraMarca, setImpressoraMarca] = useState('');
  const [impressoraTombo, setImpressoraTombo] = useState('');
  const [ipImpressora, setIpImpressora] = useState('');

  const [scannerMarca, setScannerMarca] = useState('');
  const [scannerTombo, setScannerTombo] = useState('');

  const [nobreakMarca, setNobreakMarca] = useState('');
  const [nobreak, setNobreak] = useState(''); 

  const [videoConfMarca, setVideoConfMarca] = useState('');
  const [videoConfTombo, setVideoConfTombo] = useState('');

  const [tabletMarca, setTabletMarca] = useState('');
  const [tabletTombo, setTabletTombo] = useState('');

  const [equipamentosExtras, setEquipamentosExtras] = useState([]);

  const [activeDropdown, setActiveDropdown] = useState(null);

  const [opcoesServidores, setOpcoesServidores] = useState([]);
  const [opcoesSetores, setOpcoesSetores] = useState([]);
  const [opcoesEquipamentos, setOpcoesEquipamentos] = useState([]);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    if (Platform.OS !== 'web') {
      getCameraPermissions();
    }
    
    fetchOpcoesFirebase();
  }, []);

  const fetchOpcoesFirebase = async () => {
    try {
      const setoresSnap = await getDoc(doc(db, 'opcoes_formulario', 'setores'));
      const servidoresSnap = await getDoc(doc(db, 'opcoes_formulario', 'servidores'));
      const equipamentosSnap = await getDoc(doc(db, 'opcoes_formulario', 'equipamentos'));

      setOpcoesSetores(setoresSnap.exists() ? setoresSnap.data().lista : SETORES_UNIDADES);
      setOpcoesServidores(servidoresSnap.exists() ? servidoresSnap.data().lista : SERVIDORES);
      setOpcoesEquipamentos(equipamentosSnap.exists() ? equipamentosSnap.data().lista : EQUIPAMENTOS);
    } catch (error) {
      console.log("Erro ao buscar Firebase. Usando constantes locais.", error);
      setOpcoesSetores(SETORES_UNIDADES);
      setOpcoesServidores(SERVIDORES);
      setOpcoesEquipamentos(EQUIPAMENTOS);
    }
  };

  const getMarcas = (categoria) => {
    const eq = opcoesEquipamentos.find(e => e.categoria.toLowerCase() === categoria.toLowerCase());
    return eq ? eq.marcasModelos : [];
  };

  const addExtra = () => {
    setEquipamentosExtras([...equipamentosExtras, { id: Date.now().toString(), categoria: '', marca: '', tombo: '' }]);
  };

  const updateExtra = (id, field, value) => {
    setEquipamentosExtras(extras => extras.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const removeExtra = (id) => {
    setEquipamentosExtras(extras => extras.filter(e => e.id !== id));
  };

  const adicionarItem = async () => {
    if (!responsavel) return Alert.alert('Erro', 'Preencha o Nome do Responsável');
    try {
      const payload = { 
        nome: responsavel,
        pat: cpuTombo || notebookTombo || tabletTombo || scannerTombo || monitor1 || 'N/A', 
        responsavel, matricula, setor, 
        cpuMarca, cpuTombo, 
        notebookMarca, notebookTombo,
        monitor1Marca, monitor1, 
        monitor2Marca, monitor2, 
        impressoraMarca, impressoraTombo, ipImpressora, 
        scannerMarca, scannerTombo,
        nobreakMarca, nobreak,
        videoConfMarca, videoConfTombo,
        tabletMarca, tabletTombo,
        equipamentosExtras,
        emprestadoPara: null, dataCadastro: Date.now() 
      };
      
      await DataService.salvarItemInventario(payload);
      if(addLog) addLog(`CRIOU ITEM INVENTÁRIO: ${responsavel}`);
      
      setResponsavel(''); setMatricula(''); setSetor(''); 
      setCpuMarca(''); setCpuTombo(''); 
      setNotebookMarca(''); setNotebookTombo('');
      setMonitor1Marca(''); setMonitor1(''); 
      setMonitor2Marca(''); setMonitor2(''); 
      setIpImpressora(''); setImpressoraMarca(''); setImpressoraTombo('');
      setScannerMarca(''); setScannerTombo('');
      setNobreakMarca(''); setNobreak('');
      setVideoConfMarca(''); setVideoConfTombo('');
      setTabletMarca(''); setTabletTombo('');
      setEquipamentosExtras([]);
      
      setIsAddModalOpen(false);
    } catch (error) { Alert.alert('Erro', 'Falha ao salvar no banco de dados.'); }
  };

  const exportarPDF = async () => {
    const html = `<html><head><style>body{font-family:sans-serif; padding:20px;} table{width:100%; border-collapse:collapse; margin-top:20px;} th,td{border:1px solid #ddd; padding:10px; text-align:left;} th{background-color:#1DB954; color:white;}</style></head><body><h2>TechGestor - Relatório de Inventário</h2><table><tr><th>Responsável</th><th>Setor</th><th>Tombo Principal</th><th>IP Impressora</th></tr>${inventarioFiltrado.map(i => `<tr><td>${i.responsavel || i.nome}</td><td>${i.setor || 'N/A'}</td><td>${i.pat || 'N/A'}</td><td>${i.ipImpressora || 'N/A'}</td></tr>`).join('')}</table></body></html>`;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) { Alert.alert('Erro', 'Falha ao gerar PDF.'); }
  };

  const exportarExcel = () => Alert.alert('Aviso', 'A exportação direta para Excel nativo estará disponível em futuras atualizações.');

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
    if (Platform.OS === 'web') return Alert.alert('Aviso', 'O leitor funciona apenas no aplicativo mobile.');
    if (hasPermission === null) return Alert.alert('Aviso', 'Solicitando permissão da câmera...');
    if (hasPermission === false) return Alert.alert('Erro', 'Sem acesso à câmera.');
    setScannerTarget(target); setScanned(false); setIsScannerOpen(true);
  };

  const inventarioFiltrado = inventario.filter((i) => {
    const termo = search.toLowerCase();
    return ((i.nome && i.nome.toLowerCase().includes(termo)) || (i.pat && i.pat.includes(termo)) || (i.responsavel && i.responsavel.toLowerCase().includes(termo)) || (i.ipImpressora && i.ipImpressora.includes(termo)));
  });

  const renderAutocomplete = (fieldValue, setField, dropdownKey, placeholder, dataSource, mapFunc, onSelect, keyboardType = "default") => {
    return (
      <View style={{ flex: 1 }}>
        <TextInput 
          style={styles.inputModal} 
          placeholder={placeholder} 
          placeholderTextColor="#666" 
          value={fieldValue} 
          keyboardType={keyboardType}
          onChangeText={(text) => {
            setField(text);
            setActiveDropdown(dropdownKey);
          }} 
          onFocus={() => setActiveDropdown(dropdownKey)}
        />
        {activeDropdown === dropdownKey && fieldValue.length > 0 && (
          <View style={styles.dropdownContainer}>
            <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled={true} style={{ maxHeight: 180 }}>
              {dataSource
                .filter(item => mapFunc(item).toLowerCase().includes(fieldValue.toLowerCase()))
                .slice(0, 10)
                .map((item, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.dropdownItem} 
                    onPress={() => {
                      onSelect(item);
                      setActiveDropdown(null);
                      Keyboard.dismiss();
                    }}
                  >
                    <Text style={styles.dropdownText}>{mapFunc(item)}</Text>
                    {item.matricula && <Text style={styles.dropdownSubText}>Matrícula: {item.matricula}</Text>}
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 22, color: '#1DB954' }}>Inventário</Text>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={exportarPDF} style={{ backgroundColor: '#1DB954', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6, marginLeft: 10, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={exportarExcel} style={{ backgroundColor: '#FFAE00', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6, marginLeft: 10, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>EXCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e1e', borderRadius: 8, borderWidth: 1, borderColor: '#333', paddingHorizontal: 12, marginBottom: 15 }}>
          <Text style={{ fontSize: 16, marginRight: 8, color: '#fff' }}>Busca:</Text>
          <TextInput style={{ flex: 1, color: '#fff', paddingVertical: 12, fontSize: 14 }} placeholder="Buscar Responsável, Tombo ou IP..." placeholderTextColor="#888" value={search} onChangeText={setSearch} />
          <TouchableOpacity onPress={() => openScanner('busca')} style={{ padding: 5 }}><Text style={{ fontSize: 14, color: '#1DB954', fontWeight: 'bold' }}>[ Leitor ]</Text></TouchableOpacity>
        </View>
        
        <TouchableOpacity onPress={() => setIsAddModalOpen(true)} style={{ backgroundColor: '#1DB954', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>+ ADICIONAR NOVO REGISTRO</Text>
        </TouchableOpacity>

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

        {inventarioFiltrado.map((item) => (
          <Card key={item.id} theme={theme} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderColor: item.emprestadoPara ? '#FFAE00' : theme.border, marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>{item.responsavel || item.nome}</Text>
                {item.emprestadoPara && <Text style={{ color: '#FFAE00', fontSize: 10, fontWeight: 'bold', marginLeft: 5 }}>(EMPRESTADO)</Text>}
              </View>
              <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 2 }}>Tombo Principal: {item.pat} | Local: {item.setor || 'Sem setor'}</Text>
              {item.ipImpressora ? <Text style={{ color: theme.subtext, fontSize: 12 }}>IP Impressora: {item.ipImpressora}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <TouchableOpacity onPress={() => abrirProntuario(item)} style={{ backgroundColor: theme.inputBg, padding: 8, borderRadius: 5, marginRight: 8, borderWidth: 1, borderColor: theme.border }}>
                  <Text style={{ fontSize: 12, color: theme.primary, fontWeight: 'bold' }}>Prontuário</Text>
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
              <TouchableOpacity onPress={() => handleExcluir(item)} style={{ padding: 4 }}><Text style={{ fontSize: 12, color: '#ff4444', fontWeight: 'bold' }}>Excluir</Text></TouchableOpacity>
            </View>
          </Card>
        ))}
      </ScrollView>

      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 15 }}>
          <View style={{ width: '100%', maxWidth: 500, backgroundColor: '#121212', borderRadius: 12, padding: 20, maxHeight: '95%' }}>
            
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)} style={{ backgroundColor: '#ff4444', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>FECHAR</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitleModal}>Identificação do Responsável</Text>
              
              {renderAutocomplete(responsavel, setResponsavel, 'responsavel', 'Nome do Responsável', opcoesServidores, s => s.nome, s => { setResponsavel(s.nome); setMatricula(s.matricula); })}
              
              <TextInput style={[styles.inputModal, { backgroundColor: matricula ? '#2a2a2a' : '#1e1e1e' }]} placeholder="Matrícula" placeholderTextColor="#666" value={matricula} onChangeText={setMatricula} />
              
              {renderAutocomplete(setor, setSetor, 'setor', 'Setor / Unidade', opcoesSetores, s => s, s => setSetor(s))}

              <Text style={[styles.sectionTitleModal, { marginTop: 15 }]}>Computador & Notebook</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', zIndex: activeDropdown === 'cpuMarca' ? 100 : 1 }}>
                {renderAutocomplete(cpuMarca, setCpuMarca, 'cpuMarca', 'CPU Marca/Modelo', getMarcas("Computador"), m => m, m => setCpuMarca(m))}
                <View style={{ width: 5 }} />
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput style={[styles.inputModal, { flex: 1, marginVertical: 0 }]} placeholder="Tombo CPU" placeholderTextColor="#666" value={cpuTombo} onChangeText={setCpuTombo} keyboardType="numeric" />
                  <TouchableOpacity onPress={() => openScanner('cadastro')} style={{ backgroundColor: '#1DB954', padding: 12, borderRadius: 8, marginLeft: 5 }}><Text style={{ fontSize: 12, color: '#fff', fontWeight: 'bold' }}>SCAN</Text></TouchableOpacity>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', zIndex: activeDropdown === 'notebookMarca' ? 100 : 1 }}>
                {renderAutocomplete(notebookMarca, setNotebookMarca, 'notebookMarca', 'Notebook Marca/Modelo', getMarcas("Notebook"), m => m, m => setNotebookMarca(m))}
                <View style={{ width: 5 }} />
                <TextInput style={[styles.inputModal, { flex: 1 }]} placeholder="Tombo Notebook" placeholderTextColor="#666" value={notebookTombo} onChangeText={setNotebookTombo} keyboardType="numeric" />
              </View>

              <Text style={[styles.sectionTitleModal, { marginTop: 15 }]}>Monitores</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', zIndex: activeDropdown === 'monitor1Marca' ? 100 : 1 }}>
                {renderAutocomplete(monitor1Marca, setMonitor1Marca, 'monitor1Marca', 'Monitor 1 Marca/Modelo', getMarcas("Monitor"), m => m, m => setMonitor1Marca(m))}
                <View style={{ width: 5 }} />
                <TextInput style={[styles.inputModal, { flex: 1 }]} placeholder="Tombo Monitor 1" placeholderTextColor="#666" value={monitor1} onChangeText={setMonitor1} keyboardType="numeric" />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', zIndex: activeDropdown === 'monitor2Marca' ? 100 : 1 }}>
                {renderAutocomplete(monitor2Marca, setMonitor2Marca, 'monitor2Marca', 'Monitor 2 Marca/Modelo', getMarcas("Monitor"), m => m, m => setMonitor2Marca(m))}
                <View style={{ width: 5 }} />
                <TextInput style={[styles.inputModal, { flex: 1 }]} placeholder="Tombo Monitor 2" placeholderTextColor="#666" value={monitor2} onChangeText={setMonitor2} keyboardType="numeric" />
              </View>

              <Text style={[styles.sectionTitleModal, { marginTop: 15 }]}>Impressora & Scanner</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', zIndex: activeDropdown === 'impressoraMarca' ? 100 : 1 }}>
                {renderAutocomplete(impressoraMarca, setImpressoraMarca, 'impressoraMarca', 'Impressora Marca/Modelo', getMarcas("Impressora"), m => m, m => setImpressoraMarca(m))}
                <View style={{ width: 5 }} />
                <TextInput style={[styles.inputModal, { flex: 1 }]} placeholder="Tombo Impressora" placeholderTextColor="#666" value={impressoraTombo} onChangeText={setImpressoraTombo} keyboardType="numeric" />
              </View>
              <TextInput style={styles.inputModal} placeholder="IP da Impressora (Ex: 192.168...)" placeholderTextColor="#666" value={ipImpressora} onChangeText={setIpImpressora} />
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', zIndex: activeDropdown === 'scannerMarca' ? 100 : 1 }}>
                {renderAutocomplete(scannerMarca, setScannerMarca, 'scannerMarca', 'Scanner Marca/Modelo', getMarcas("Scanner"), m => m, m => setScannerMarca(m))}
                <View style={{ width: 5 }} />
                <TextInput style={[styles.inputModal, { flex: 1 }]} placeholder="Tombo Scanner" placeholderTextColor="#666" value={scannerTombo} onChangeText={setScannerTombo} keyboardType="numeric" />
              </View>

              <Text style={[styles.sectionTitleModal, { marginTop: 15 }]}>Acessórios & Dispositivos</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', zIndex: activeDropdown === 'nobreakMarca' ? 100 : 1 }}>
                {renderAutocomplete(nobreakMarca, setNobreakMarca, 'nobreakMarca', 'Nobreak Marca/Modelo', getMarcas("Nobreak"), m => m, m => setNobreakMarca(m))}
                <View style={{ width: 5 }} />
                <TextInput style={[styles.inputModal, { flex: 1 }]} placeholder="Tombo Nobreak" placeholderTextColor="#666" value={nobreak} onChangeText={setNobreak} keyboardType="numeric" />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', zIndex: activeDropdown === 'videoConfMarca' ? 100 : 1 }}>
                {renderAutocomplete(videoConfMarca, setVideoConfMarca, 'videoConfMarca', 'VídeoConf Marca', getMarcas("Equipamento de Vídeoconferência"), m => m, m => setVideoConfMarca(m))}
                <View style={{ width: 5 }} />
                <TextInput style={[styles.inputModal, { flex: 1 }]} placeholder="Tombo VídeoConf" placeholderTextColor="#666" value={videoConfTombo} onChangeText={setVideoConfTombo} keyboardType="numeric" />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', zIndex: activeDropdown === 'tabletMarca' ? 100 : 1 }}>
                {renderAutocomplete(tabletMarca, setTabletMarca, 'tabletMarca', 'Tablet Marca/Modelo', getMarcas("Tablet"), m => m, m => setTabletMarca(m))}
                <View style={{ width: 5 }} />
                <TextInput style={[styles.inputModal, { flex: 1 }]} placeholder="Tombo Tablet" placeholderTextColor="#666" value={tabletTombo} onChangeText={setTabletTombo} keyboardType="numeric" />
              </View>

              <Text style={[styles.sectionTitleModal, { marginTop: 25, color: '#FFAE00' }]}>+ Equipamentos Extras na Sala</Text>
              {equipamentosExtras.map(ext => (
                  <View key={ext.id} style={{ marginBottom: 10, padding: 10, borderColor: '#333', borderWidth: 1, borderRadius: 8, backgroundColor: '#1a1a1a', zIndex: activeDropdown === `ext_cat_${ext.id}` || activeDropdown === `ext_marca_${ext.id}` ? 100 : 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                          <Text style={{ color: '#FFAE00', fontWeight: 'bold', fontSize: 12 }}>Equipamento Adicional</Text>
                          <TouchableOpacity onPress={() => removeExtra(ext.id)}><Text style={{ color: '#ff4444', fontWeight: 'bold', fontSize: 12 }}>Remover</Text></TouchableOpacity>
                      </View>
                      
                      {renderAutocomplete(ext.categoria, (val) => updateExtra(ext.id, 'categoria', val), `ext_cat_${ext.id}`, 'Categoria (Ex: Computador)', opcoesEquipamentos, c => c.categoria, c => updateExtra(ext.id, 'categoria', c.categoria))}
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                          {renderAutocomplete(ext.marca, (val) => updateExtra(ext.id, 'marca', val), `ext_marca_${ext.id}`, 'Marca / Modelo', getMarcas(ext.categoria), m => m, m => updateExtra(ext.id, 'marca', m))}
                          <View style={{ width: 5 }} />
                          <TextInput style={[styles.inputModal, { flex: 1 }]} placeholder="Tombo" placeholderTextColor="#666" value={ext.tombo} onChangeText={(val) => updateExtra(ext.id, 'tombo', val)} keyboardType="numeric" />
                      </View>
                  </View>
              ))}
              
              <TouchableOpacity onPress={addExtra} style={{ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#FFAE00', alignItems: 'center', marginBottom: 10, borderStyle: 'dashed' }}>
                  <Text style={{ color: '#FFAE00', fontWeight: 'bold' }}>ADICIONAR OUTRO EQUIPAMENTO</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={adicionarItem} style={{ backgroundColor: '#1DB954', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 30, marginBottom: 10 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>SALVAR INVENTÁRIO COMPLETO</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={isScannerOpen} animationType="slide" transparent={false} onRequestClose={() => setIsScannerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView style={{ flex: 1 }} facing="back" onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}>
            <View style={{ flex: 1, backgroundColor: 'transparent', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 40 }}>
              <TouchableOpacity onPress={() => setIsScannerOpen(false)} style={{ backgroundColor: '#ff4444', padding: 15, borderRadius: 10 }}><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>CANCELAR LEITURA</Text></TouchableOpacity>
            </View>
          </CameraView>
          <View style={{ position: 'absolute', top: '35%', left: '15%', width: '70%', height: '30%', borderWidth: 2, borderColor: '#1DB954', borderRadius: 10, backgroundColor: 'rgba(29, 185, 84, 0.1)' }} pointerEvents="none" />
        </View>
      </Modal>

      <Modal visible={historyModalVisible} animationType="slide" transparent={true} onRequestClose={() => setHistoryModalVisible(false)}>
        {selectedItemHistory && (
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
            <View style={{ backgroundColor: theme.card, borderRadius: 15, padding: 20, maxHeight: '80%', borderWidth: 1, borderColor: theme.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 10 }}>
                <View>
                  <Text style={{ color: theme.tert || '#1DB954', fontSize: 16, fontWeight: 'bold' }}>Prontuário da Máquina</Text>
                  <Text style={{ color: theme.text, fontSize: 14 }}>{selectedItemHistory.responsavel || selectedItemHistory.nome}</Text>
                  <Text style={{ color: theme.subtext, fontSize: 10 }}>Patrimônio Principal: {selectedItemHistory.cpuTombo || selectedItemHistory.pat}</Text>
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
                      <Text style={{ color: theme.subtext, fontSize: 10, marginTop: 4 }}>Técnico: {h.tecnico}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
              <Btn title="FECHAR PRONTUÁRIO" onPress={() => setHistoryModalVisible(false)} theme={theme} style={{ marginTop: 15 }} />
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitleModal: { fontWeight: 'bold', fontSize: 14, color: '#1DB954', marginBottom: 5 },
  inputModal: { backgroundColor: '#1e1e1e', borderColor: '#333', borderWidth: 1, color: '#fff', padding: 14, marginVertical: 4, borderRadius: 8, fontSize: 14 },
  
  dropdownContainer: {
    backgroundColor: '#333',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1DB954',
    marginBottom: 10,
    marginTop: -4,
    maxHeight: 180,
    overflow: 'hidden'
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444'
  },
  dropdownText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold'
  },
  dropdownSubText: {
    color: '#aaa',
    fontSize: 10,
    marginTop: 2
  }
});