import { Camera, CameraView } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Alert, Keyboard, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as XLSX from 'xlsx';

import { Btn, Card } from '../components';
import { DataService } from '../services/DataService';

// IMPORTAÇÃO DOS DADOS FIXOS
import { EQUIPAMENTOS, PREDIOS, SERVIDORES, SETORES_UNIDADES } from '../../constants/const';

const PILLS_EQUIPAMENTOS = ['Monitor', 'CPU', 'Impressora', 'Scanner', 'Nobreak', 'Equipamento de Vídeoconferência', 'Notebook', 'Tablet', 'Telefone IP'];

export default function InventarioScreen({ inventario, chamados, addLog, theme, users }) {

  const [search, setSearch] = useState('');
  const [itemEmprestimo, setItemEmprestimo] = useState(null);
  const [quemVaiPegar, setQuemVaiPegar] = useState('');
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedItemHistory, setSelectedItemHistory] = useState(null);
  const [selectedEqProntuario, setSelectedEqProntuario] = useState(null);

  const [selectedInventoryItems, setSelectedInventoryItems] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const [isAddingDefect, setIsAddingDefect] = useState(false);
  const [defectText, setDefectText] = useState('');
  const [selectedDefectEqs, setSelectedDefectEqs] = useState([]);
  
  const [isEditingEq, setIsEditingEq] = useState(false);
  const [editEqData, setEditEqData] = useState({ tipo: '', marca: '', tombo: '' });

  const [isEditingResponsavel, setIsEditingResponsavel] = useState(false);
  const [editResponsavelName, setEditResponsavelName] = useState('');

  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPill, setSelectedPill] = useState('Monitor');
  
  const [predio, setPredio] = useState('');
  const [setor, setSetor] = useState('');
  const [local, setLocal] = useState('');
  
  const [responsavel, setResponsavel] = useState('');
  const [matricula, setMatricula] = useState('');
  const [responsavelPeca, setResponsavelPeca] = useState('');
  
  const [listaEquipamentos, setListaEquipamentos] = useState([]);
  const [marcaAtual, setMarcaAtual] = useState('');
  const [tomboAtual, setTomboAtual] = useState('');

  const [activeDropdown, setActiveDropdown] = useState(null);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    if (Platform.OS !== 'web') getCameraPermissions();
  }, []);

  const getMarcas = (categoria) => {
    let catAjustada = categoria === 'CPU' ? 'Computador' : categoria;
    const eq = EQUIPAMENTOS.find(e => e.categoria.toLowerCase() === catAjustada.toLowerCase());
    return eq ? eq.marcasModelos : [];
  };

  const mostraAlerta = (titulo, mensagem) => {
    if (Platform.OS === 'web') window.alert(`${titulo}: ${mensagem}`);
    else Alert.alert(titulo, mensagem);
  };

  const toggleSelectInventoryItem = (id) => {
    if (selectedInventoryItems.includes(id)) {
      setSelectedInventoryItems(selectedInventoryItems.filter(itemId => itemId !== id));
    } else {
      setSelectedInventoryItems([...selectedInventoryItems, id]);
    }
  };

  const apagarSelecionados = () => {
    const acao = () => {
      const idsParaApagar = [...selectedInventoryItems];
      setSelectedInventoryItems([]);
      setTimeout(() => mostraAlerta('Sucesso', 'Itens excluídos com sucesso!'), 100);
      idsParaApagar.forEach(id => DataService.deletarItemInventario(id).catch(e => console.log('Erro:', e)));
      if (addLog) addLog(`EXCLUIU ${idsParaApagar.length} ITENS DO INVENTÁRIO EM LOTE.`);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Deseja apagar os ${selectedInventoryItems.length} itens selecionados permanentemente?`)) acao();
    } else {
      Alert.alert("Excluir Itens", `Deseja apagar ${selectedInventoryItems.length} itens permanentemente?`, [
        { text: "Cancelar", style: "cancel" }, { text: "Apagar", style: "destructive", onPress: acao }
      ]);
    }
  };

  const handleExcluir = (item) => {
    const acao = () => { 
      DataService.deletarItemInventario(item.id).catch(e => console.log(e));
      if(addLog) addLog(`EXCLUIU ITEM INVENTÁRIO: ${item.nome}`); 
    };
    if (Platform.OS === 'web') { if (window.confirm("Deseja apagar este equipamento permanentemente?")) acao(); } 
    else { Alert.alert("Excluir Item", "Deseja apagar permanentemente?", [{ text: "Cancelar", style: "cancel" }, { text: "Apagar", style: "destructive", onPress: acao }]); }
  };

  const fecharModal = () => {
    setIsAddModalOpen(false); setCurrentStep(1); setSelectedPill('Monitor');
    setPredio(''); setSetor(''); setLocal('');
    setResponsavel(''); setMatricula(''); setResponsavelPeca('');
    setListaEquipamentos([]); setMarcaAtual(''); setTomboAtual('');
    setIsSaving(false);
  };

  const handleAdicionarEquipamento = () => {
    if (!tomboAtual) return mostraAlerta('Aviso', 'Preencha pelo menos o tombo do equipamento.');
    
    const jaExiste = listaEquipamentos.find(eq => eq.tombo === tomboAtual);
    if (jaExiste) return mostraAlerta('Aviso', `O tombo ${tomboAtual} já está na lista como ${jaExiste.tipo}.`);

    setListaEquipamentos([...listaEquipamentos, {
      id: Date.now().toString(), tipo: selectedPill, marca: marcaAtual, tombo: tomboAtual, status: 'Disponível'
    }]);
    setMarcaAtual(''); setTomboAtual('');
    return true;
  };

  const removerEquipamento = (id) => setListaEquipamentos(listaEquipamentos.filter(eq => eq.id !== id));

  const editarEquipamento = (eq) => {
    setSelectedPill(eq.tipo);
    setMarcaAtual(eq.marca);
    setTomboAtual(eq.tombo);
    removerEquipamento(eq.id); 
  };

  const proximaEtapa = () => {
    if (currentStep === 1 && (!predio || !setor)) return mostraAlerta('Aviso', 'Preencha o Prédio e o Setor/Unidade.');
    if (currentStep === 2) {
      if (marcaAtual || tomboAtual) { if(!handleAdicionarEquipamento()) return; } 
      else if (listaEquipamentos.length === 0) return mostraAlerta('Aviso', 'Adicione pelo menos um equipamento.');
    }
    if (currentStep === 3 && !responsavel) return mostraAlerta('Aviso', 'Preencha o Responsável.');
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const etapaAnterior = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

  const adicionarItem = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      let payloadCpuTombo = '';
      let payloadCpuMarca = '';
      const cpuEncontrada = listaEquipamentos.find(eq => eq.tipo === 'CPU' || eq.tipo === 'Notebook');
      
      if (cpuEncontrada) { payloadCpuTombo = cpuEncontrada.tombo; payloadCpuMarca = cpuEncontrada.marca; }

      const payload = { 
        nome: responsavel, pat: payloadCpuTombo || listaEquipamentos[0]?.tombo || 'N/A', 
        responsavel, matricula, setor, predio, local, responsavelPeca,
        cpuMarca: payloadCpuMarca, cpuTombo: payloadCpuTombo,
        equipamentosUnificados: listaEquipamentos,
        emprestadoPara: null, dataCadastro: Date.now() 
      };
      
      await DataService.salvarItemInventario(payload);
      if(addLog) addLog(`CRIOU ITEM INVENTÁRIO: ${responsavel}`);
      
      fecharModal(); 
      setTimeout(() => mostraAlerta('Sucesso', 'Peça de inventário finalizada!'), 300);
    } catch (error) { 
      mostraAlerta('Erro', 'Falha ao salvar no banco de dados.'); 
      setIsSaving(false); 
    }
  };

  const importarPlanilha = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      if (Platform.OS !== 'web') Alert.alert('A carregar...', 'A processar a planilha, aguarde.');
      
      let workbook;
      if (Platform.OS === 'web') {
        const file = result.assets[0].file; 
        const arrayBuffer = await file.arrayBuffer();
        workbook = XLSX.read(arrayBuffer, { type: 'array' });
      } else {
        const b64 = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.Base64 });
        workbook = XLSX.read(b64, { type: 'base64' });
      }
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' }); 

      let agrupados = {};
      const normalizeStr = (str) => {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, ' ');
      };

      for (let rawRow of data) {
        const row = {};
        for(let key in rawRow) row[normalizeStr(key)] = rawRow[key];

        const responsavelX = row['nome do responsavel pela maquina'] || row['nome'] || row['responsavel'] || 'Sem Responsável';
        const predioX = row['predio'] || '';
        const setorX = row['setor/ unidade?'] || row['setor/ unidade'] || row['setor'] || '';
        const localX = row['local do equipamento'] || row['local'] || '';
        const matriculaX = row['matricula'] || '';
        const ipX = row['impressora 1 - ip'] || '';

        const eqps = [];
        const verificarEAdicionar = (tipo, marcaKey, tomboKey) => {
          const tomboVal = String(row[tomboKey] || '').trim();
          const marcaVal = String(row[marcaKey] || '').trim();
          if (tomboVal && tomboVal !== '0' && tomboVal.toUpperCase() !== 'NÃO TEM' && tomboVal.toUpperCase() !== 'NAO TEM') {
            eqps.push({ id: Date.now().toString() + Math.random().toString(36).substr(2, 9), tipo: tipo, marca: marcaVal, tombo: tomboVal, status: 'Disponível' });
          }
        };

        verificarEAdicionar('CPU', 'cpu - marca/ modelo', 'cpu - tombo');
        verificarEAdicionar('Monitor', 'monitor 1 (marca / modelo)', 'monitor 1 - tombo');
        verificarEAdicionar('Monitor', 'monitor 2 (marca/modelo)', 'monitor 2 - tombo');
        verificarEAdicionar('Scanner', 'scanner - marca/modelo', 'scanner - tombo');
        verificarEAdicionar('Impressora', 'impressora 1 - modelo/marca', 'impressora 1 - tombo');

        const genTombo = String(row['tombo'] || row['patrimonio'] || '').trim();
        if (genTombo && eqps.length === 0) {
            const genMarca = String(row['marca'] || row['modelo'] || '').trim();
            const genTipo = String(row['tipo'] || row['equipamento'] || 'Outro').trim();
            eqps.push({ id: Date.now().toString() + Math.random().toString(36).substr(2, 9), tipo: genTipo, marca: genMarca, tombo: genTombo, status: 'Disponível' });
        }

        if (eqps.length === 0) continue;

        if (!agrupados[responsavelX]) {
          agrupados[responsavelX] = {
            nome: responsavelX, responsavel: responsavelX, responsavelPeca: responsavelX,
            predio: predioX, setor: setorX, local: localX, pat: eqps[0].tombo, 
            matricula: matriculaX, ipImpressora: ipX, equipamentosUnificados: [], emprestadoPara: null, dataCadastro: Date.now()
          };
        }
        agrupados[responsavelX].equipamentosUnificados.push(...eqps);
      }

      const chaves = Object.keys(agrupados);
      if (chaves.length === 0) return mostraAlerta('Aviso', 'Nenhum equipamento válido foi encontrado.');

      let itensImportados = 0;
      const promessas = chaves.map(key => {
        const payload = agrupados[key];
        const cpu = payload.equipamentosUnificados.find(e => e.tipo === 'CPU' || e.tipo === 'Computador');
        if (cpu) { payload.pat = cpu.tombo; payload.cpuTombo = cpu.tombo; payload.cpuMarca = cpu.marca; }
        itensImportados++;
        return DataService.salvarItemInventario(payload);
      });

      await Promise.all(promessas);
      mostraAlerta('Sucesso!', `Foram importadas ${itensImportados} Peças de Inventário.`);
      if(addLog) addLog(`Importou ${itensImportados} peças via Planilha.`);

    } catch (error) { mostraAlerta('Erro', 'Falha ao ler o arquivo. Confirme se é o Excel/CSV correto.'); }
  };

  const handleExcelButton = () => {
    if (Platform.OS === 'web') {
      if (window.confirm("Deseja IMPORTAR a planilha de respostas do formulário?")) importarPlanilha();
    } else {
      Alert.alert('Importar', 'O que deseja fazer?', [{ text: '📥 Importar Planilha do Formulário', onPress: importarPlanilha }, { text: 'Cancelar', style: 'cancel' }]);
    }
  };

  const exportarExcel = async () => {
    try {
      if (inventarioFiltrado.length === 0) {
        return mostraAlerta('Aviso', 'Não há itens para exportar.');
      }

      const exportData = [];
      inventarioFiltrado.forEach(item => {
        const eqps = item.equipamentosUnificados && item.equipamentosUnificados.length > 0 
                     ? item.equipamentosUnificados 
                     : [{ tipo: 'N/A', marca: item.cpuMarca || 'N/A', tombo: item.pat, status: 'Disponível' }];

        eqps.forEach(eq => {
          exportData.push({
            'Responsável': item.responsavel || item.nome || 'Sem Responsável',
            'Matrícula': item.matricula || '',
            'Prédio': item.predio || '',
            'Setor/Unidade': item.setor || '',
            'Local': item.local || '',
            'Tipo Equipamento': eq.tipo || '',
            'Marca/Modelo': eq.marca || '',
            'Tombo': eq.tombo || '',
            'Status': eq.status || 'Disponível',
            'Emprestado Para': item.emprestadoPara || 'Não',
            'IP Impressora': item.ipImpressora || ''
          });
        });
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventário");

      if (Platform.OS === 'web') {
        XLSX.writeFile(wb, "Inventario_TechGestor.xlsx");
        mostraAlerta('Sucesso', 'Download do Excel iniciado!');
      } else {
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const uri = FileSystem.cacheDirectory + 'Inventario_TechGestor.xlsx';
        await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Exportar Inventário'
        });
      }

      if(addLog) addLog(`Exportou o inventário para Excel.`);
    } catch (error) {
      console.log(error);
      mostraAlerta('Erro', 'Falha ao gerar o arquivo Excel.');
    }
  };

  const exportarPDF = async () => {
    const html = `<html><head><style>body{font-family:sans-serif; padding:20px;} table{width:100%; border-collapse:collapse; margin-top:20px;} th,td{border:1px solid #ddd; padding:10px; text-align:left;} th{background-color:#1DB954; color:white;}</style></head><body><h2>TechGestor - Relatório de Inventário</h2><table><tr><th>Responsável</th><th>Setor</th><th>Tombo Principal</th></tr>${inventarioFiltrado.map(i => `<tr><td>${i.responsavel || i.nome}</td><td>${i.setor || 'N/A'}</td><td>${i.pat || 'N/A'}</td></tr>`).join('')}</table></body></html>`;
    try { const { uri } = await Print.printToFileAsync({ html }); await Sharing.shareAsync(uri); } catch (e) { mostraAlerta('Erro', 'Falha ao gerar PDF.'); }
  };

  const emprestar = async () => {
    if (!quemVaiPegar) return;
    try { await DataService.atualizarItemInventario(itemEmprestimo.id, { emprestadoPara: quemVaiPegar, dataEmprestimo: Date.now() }); if(addLog) addLog(`EMPRESTOU ${itemEmprestimo.nome} PARA ${quemVaiPegar}`); setItemEmprestimo(null); setQuemVaiPegar(''); } catch (error) { mostraAlerta('Erro', 'Falha ao atualizar o empréstimo.'); }
  };

  const devolver = async (item) => {
    try { await DataService.atualizarItemInventario(item.id, { emprestadoPara: null, dataEmprestimo: null }); if(addLog) addLog(`RECEBEU DEVOLUÇÃO: ${item.nome} DE ${item.emprestadoPara}`); } catch (error) { mostraAlerta('Erro', 'Falha ao processar devolução.'); }
  };

  const abrirProntuario = (item) => {
    setSelectedItemHistory(item);
    const eqArray = item.equipamentosUnificados && item.equipamentosUnificados.length > 0 ? item.equipamentosUnificados : [{ tipo: 'Equipamento Principal', tombo: item.pat, id: 'temp' }];
    setSelectedEqProntuario(eqArray[0]); 
    setIsAddingDefect(false); setIsEditingEq(false); setIsEditingResponsavel(false); setDefectText(''); setSelectedDefectEqs([]);
    setHistoryModalVisible(true);
  };

  const toggleDefectEq = (tombo) => {
    if (selectedDefectEqs.includes(tombo)) setSelectedDefectEqs(selectedDefectEqs.filter(t => t !== tombo));
    else setSelectedDefectEqs([...selectedDefectEqs, tombo]);
  };

  const salvarDefeito = async () => {
    if (isSaving) return;
    if (!defectText) return mostraAlerta('Aviso', 'Descreva o defeito.');
    if (selectedDefectEqs.length === 0) return mostraAlerta('Aviso', 'Selecione ao menos um equipamento.');

    setIsSaving(true);

    try {
        const updatedEqs = selectedItemHistory.equipamentosUnificados.map(eq => {
            if (selectedDefectEqs.includes(eq.tombo)) return { ...eq, status: 'Indisponível' };
            return eq;
        });

        await DataService.atualizarItemInventario(selectedItemHistory.id, { equipamentosUnificados: updatedEqs });

        for (const tombo of selectedDefectEqs) {
            const eq = updatedEqs.find(e => e.tombo === tombo);
            await DataService.salvarChamado({
                titulo: `Defeito: ${eq.tipo} - ${eq.marca}`, descricao: defectText,
                patrimonio: tombo, equipamento: eq, status: 'ABERTO',
                tecnico: 'Não atribuído', dataAbertura: Date.now()
            });
        }

        if(addLog) addLog(`Registrou defeito para ${selectedDefectEqs.length} equipamento(s) de ${selectedItemHistory.nome}`);
        
        setHistoryModalVisible(false);
        setIsSaving(false);
        setTimeout(() => mostraAlerta('Sucesso', 'Defeito registrado! Equipamentos marcados como Indisponíveis.'), 300);

    } catch (e) { 
      mostraAlerta('Erro', 'Falha ao salvar o defeito.'); 
      setIsSaving(false);
    }
  };

  const liberarEquipamento = async (eqLiberar) => {
    try {
      const updatedEqs = selectedItemHistory.equipamentosUnificados.map(eq => {
          if (eq.id === eqLiberar.id) return { ...eq, status: 'Disponível' };
          return eq;
      });
      await DataService.atualizarItemInventario(selectedItemHistory.id, { equipamentosUnificados: updatedEqs });
      setSelectedItemHistory({...selectedItemHistory, equipamentosUnificados: updatedEqs});
      setSelectedEqProntuario({...selectedEqProntuario, status: 'Disponível'});
      mostraAlerta('Sucesso', 'Equipamento marcado como Disponível!');
    } catch(e) { mostraAlerta('Erro', 'Falha ao atualizar status.'); }
  };

  const iniciarEdicaoProntuario = () => {
    setEditEqData({ tipo: selectedEqProntuario.tipo, marca: selectedEqProntuario.marca, tombo: selectedEqProntuario.tombo });
    setIsEditingEq(true);
  };

  const salvarEdicaoProntuario = async () => {
    if (isSaving) return;
    if (!editEqData.tombo) return mostraAlerta('Aviso', 'O tombo não pode ficar vazio.');
    
    setIsSaving(true);
    try {
      const updatedEqs = selectedItemHistory.equipamentosUnificados.map(eq => {
        if (eq.id === selectedEqProntuario.id) {
          return { ...eq, tipo: editEqData.tipo, marca: editEqData.marca, tombo: editEqData.tombo };
        }
        return eq;
      });

      const payloadUpdate = { equipamentosUnificados: updatedEqs };
      
      if (selectedEqProntuario.tipo === 'CPU' || selectedItemHistory.pat === selectedEqProntuario.tombo) {
        payloadUpdate.pat = editEqData.tombo;
        payloadUpdate.cpuTombo = editEqData.tombo;
        payloadUpdate.cpuMarca = editEqData.marca;
      }

      await DataService.atualizarItemInventario(selectedItemHistory.id, payloadUpdate);
      
      const newItem = { ...selectedItemHistory, ...payloadUpdate };
      setSelectedItemHistory(newItem);
      setSelectedEqProntuario(updatedEqs.find(e => e.id === selectedEqProntuario.id));
      setIsEditingEq(false);
      setIsSaving(false);
      mostraAlerta('Sucesso', 'Equipamento atualizado com sucesso!');
    } catch(e) { 
      mostraAlerta('Erro', 'Falha ao salvar edição.'); 
      setIsSaving(false);
    }
  };

  const salvarEdicaoResponsavel = async () => {
    if (isSaving) return;
    if (!editResponsavelName) return mostraAlerta('Aviso', 'O nome do responsável não pode ficar vazio.');
    
    setIsSaving(true);
    try {
      await DataService.atualizarItemInventario(selectedItemHistory.id, { 
        responsavel: editResponsavelName,
        nome: editResponsavelName 
      });
      setSelectedItemHistory({ ...selectedItemHistory, responsavel: editResponsavelName, nome: editResponsavelName });
      setIsEditingResponsavel(false);
      setIsSaving(false);
      mostraAlerta('Sucesso', 'Nome do Responsável atualizado!');
    } catch(e) { 
      mostraAlerta('Erro', 'Falha ao atualizar o nome.'); 
      setIsSaving(false);
    }
  };

  const getHealthStatus = (qtd) => {
    if (qtd === 0) return { label: 'Excelente', color: theme?.online || '#1DB954' };
    if (qtd < 3) return { label: 'Atenção', color: theme?.busy || '#FFAE00' };
    return { label: 'Crítico', color: '#ff4444' };
  };

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true); setIsScannerOpen(false);
    if (scannerTarget === 'busca') setSearch(data);
    else if (scannerTarget === 'equipamento_atual') setTomboAtual(data);
  };

  const openScanner = (target) => {
    if (Platform.OS === 'web') return mostraAlerta('Aviso', 'O leitor funciona apenas no aplicativo mobile.');
    if (hasPermission === null) return mostraAlerta('Aviso', 'Solicitando permissão da câmera...');
    if (hasPermission === false) return mostraAlerta('Erro', 'Sem acesso à câmera.');
    setScannerTarget(target); setScanned(false); setIsScannerOpen(true);
  };

  const inventarioFiltrado = inventario.filter((i) => {
    const termo = search.toLowerCase();
    return ((i.nome && i.nome.toLowerCase().includes(termo)) || (i.pat && i.pat.includes(termo)) || (i.responsavel && i.responsavel.toLowerCase().includes(termo)));
  });

  const isAllSelected = inventarioFiltrado.length > 0 && selectedInventoryItems.length === inventarioFiltrado.length;
  
  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedInventoryItems([]);
    else setSelectedInventoryItems(inventarioFiltrado.map(item => item.id));
  };

  const renderAutocomplete = (fieldValue, setField, dropdownKey, placeholder, dataSource, mapFunc, onSelect, keyboardType = "default") => {
    const safeData = dataSource || [];
    return (
      <View style={{ flex: 1 }}>
        <TextInput 
          style={styles.inputModal} placeholder={placeholder} placeholderTextColor="#666" value={fieldValue} keyboardType={keyboardType}
          onChangeText={(text) => { setField(text); setActiveDropdown(dropdownKey); }} onFocus={() => setActiveDropdown(dropdownKey)}
        />
        {activeDropdown === dropdownKey && fieldValue.length > 0 && (
          <View style={styles.dropdownContainer}>
            <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled={true} style={{ maxHeight: 180 }}>
              {safeData.filter(item => {
                const str = mapFunc(item) || '';
                return str.toLowerCase().includes(fieldValue.toLowerCase());
              }).slice(0, 10).map((item, index) => (
                  <TouchableOpacity key={index} style={styles.dropdownItem} onPress={() => { onSelect(item); setActiveDropdown(null); Keyboard.dismiss(); }}>
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
            <TouchableOpacity onPress={exportarPDF} style={{ backgroundColor: '#1DB954', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6, marginLeft: 10 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>📄 PDF</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={exportarExcel} style={{ backgroundColor: '#207245', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6, marginLeft: 10 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>📤 EXPORTAR</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleExcelButton} style={{ backgroundColor: '#FFAE00', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6, marginLeft: 10 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>📥 IMPORTAR</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e1e', borderRadius: 8, borderWidth: 1, borderColor: '#333', paddingHorizontal: 12, marginBottom: 15 }}>
          <Text style={{ fontSize: 16, marginRight: 8, color: '#fff' }}>Busca:</Text>
          <TextInput style={{ flex: 1, color: '#fff', paddingVertical: 12, fontSize: 14 }} placeholder="Buscar Responsável ou Setor..." placeholderTextColor="#888" value={search} onChangeText={setSearch} />
          <TouchableOpacity onPress={() => openScanner('busca')} style={styles.btnScan}><Text style={{ color: '#fff', fontWeight: 'bold' }}>📷</Text></TouchableOpacity>
        </View>
        
        {selectedInventoryItems.length > 0 ? (
          <TouchableOpacity onPress={apagarSelecionados} style={{ backgroundColor: '#ff4444', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>🗑️ APAGAR {selectedInventoryItems.length} SELECIONADOS</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setIsAddModalOpen(true)} style={{ backgroundColor: '#1DB954', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>+ INICIAR LEVANTAMENTO</Text>
          </TouchableOpacity>
        )}

        {inventarioFiltrado.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, marginLeft: 5 }}>
            <TouchableOpacity onPress={toggleSelectAll} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: isAllSelected ? '#1DB954' : '#555', backgroundColor: isAllSelected ? '#1DB954' : 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                {isAllSelected && <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>✓</Text>}
              </View>
              <Text style={{ color: '#aaa', fontWeight: 'bold', fontSize: 14 }}>
                {isAllSelected ? 'Desmarcar Todos' : `Selecionar Todos (${inventarioFiltrado.length})`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
          <Card key={item.id} theme={theme} style={{ flexDirection: 'row', alignItems: 'flex-start', borderColor: item.emprestadoPara ? '#FFAE00' : (selectedInventoryItems.includes(item.id) ? '#ff4444' : theme.border), borderWidth: selectedInventoryItems.includes(item.id) ? 2 : 1, marginBottom: 10 }}>
            
            <TouchableOpacity onPress={() => toggleSelectInventoryItem(item.id)} style={{ marginRight: 15, marginTop: 5 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: selectedInventoryItems.includes(item.id) ? '#ff4444' : '#555', backgroundColor: selectedInventoryItems.includes(item.id) ? '#ff4444' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {selectedInventoryItems.includes(item.id) && <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>✓</Text>}
              </View>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>{item.responsavel || item.nome || 'Sem Responsável'}</Text>
                {item.emprestadoPara && <Text style={{ color: '#FFAE00', fontSize: 10, fontWeight: 'bold', marginLeft: 5 }}>(EMPRESTADO)</Text>}
              </View>
              <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 2 }}>📍 Local: {item.predio || ''} - {item.setor || 'Sem setor'}</Text>
              
              <View style={{ marginTop: 8 }}>
                {item.equipamentosUnificados && item.equipamentosUnificados.map((eq, i) => (
                  <Text key={i} style={{ color: eq.status === 'Indisponível' ? '#ff4444' : theme.subtext, fontSize: 11, marginTop: 3 }}>
                    • {eq.tipo}: {eq.marca || 'S/ Marca'} (Tombo: {eq.tombo}) {eq.status === 'Indisponível' ? ' ❌ DEFEITO' : ''}
                  </Text>
                ))}
              </View>
            </View>

            <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
              <View style={{ flexDirection: 'column', marginBottom: 8 }}>
                <TouchableOpacity onPress={() => abrirProntuario(item)} style={{ backgroundColor: theme.inputBg, padding: 8, borderRadius: 5, marginBottom: 5, borderWidth: 1, borderColor: theme.border, alignItems: 'center' }}><Text style={{ fontSize: 12, color: theme.primary, fontWeight: 'bold' }}>Prontuário</Text></TouchableOpacity>
                {item.emprestadoPara ? (
                  <TouchableOpacity onPress={() => devolver(item)} style={{ backgroundColor: '#FFAE00', padding: 8, borderRadius: 5, justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: 10, color: '#000', fontWeight: 'bold' }}>DEVOLVER</Text></TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => setItemEmprestimo(item)} style={{ backgroundColor: '#1DB954', padding: 8, borderRadius: 5, justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: 10, color: '#fff', fontWeight: 'bold' }}>EMPRESTAR</Text></TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={() => handleExcluir(item)} style={{ padding: 4 }}><Text style={{ fontSize: 12, color: '#ff4444', fontWeight: 'bold' }}>Excluir</Text></TouchableOpacity>
            </View>
          </Card>
        ))}
      </ScrollView>

      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 15 }}>
          <View style={{ width: '100%', maxWidth: 500, backgroundColor: '#121212', borderRadius: 12, overflow: 'hidden', maxHeight: '95%' }}>
            <View style={{ backgroundColor: '#1DB954', padding: 15, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>TECHGESTOR</Text></View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ padding: 20 }}>
              
              {currentStep === 1 && (
                <View style={{ zIndex: 10 }}>
                  <Text style={styles.tituloPasso}>Informações de Local</Text>
                  
                  <Text style={styles.label}>Prédio</Text>
                  <View style={{ zIndex: activeDropdown === 'predio' ? 100 : 1 }}>
                    {renderAutocomplete(predio, setPredio, 'predio', 'Buscar prédio...', PREDIOS, p => p, p => setPredio(p))}
                  </View>

                  <Text style={styles.label}>Setor / Unidade</Text>
                  <View style={{ zIndex: activeDropdown === 'setor' ? 100 : 1 }}>
                    {renderAutocomplete(setor, setSetor, 'setor', 'Buscar setor...', SETORES_UNIDADES, s => s, s => setSetor(s))}
                  </View>

                  <Text style={styles.label}>Local do Equipamento</Text>
                  <TextInput style={styles.inputModal} placeholder="Ex: Gabinete, Sala de Audiência..." placeholderTextColor="#666" value={local} onChangeText={setLocal} />
                </View>
              )}

              {currentStep === 2 && (
                <View style={{ zIndex: 10 }}>
                  <Text style={styles.tituloPasso}>Informações de Equipamento</Text>
                  <Text style={styles.label}>Tipo de Equipamento</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 }}>
                    {PILLS_EQUIPAMENTOS.map(tipo => (
                      <TouchableOpacity key={tipo} onPress={() => { setSelectedPill(tipo); setMarcaAtual(''); setTomboAtual(''); }} style={[styles.pill, selectedPill === tipo ? styles.pillActive : styles.pillInactive, { marginBottom: 10 }]}>
                        <Text style={{ color: selectedPill === tipo ? '#fff' : '#aaa', fontSize: 12, fontWeight: 'bold' }}>{tipo}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.label, { textTransform: 'uppercase' }]}>ADIÇÃO DE {selectedPill}</Text>
                  <View style={{ zIndex: activeDropdown === 'marcaAtual' ? 100 : 1 }}>
                    <Text style={styles.label}>Marca/Modelo</Text>
                    {renderAutocomplete(marcaAtual, setMarcaAtual, 'marcaAtual', 'Buscar marca...', getMarcas(selectedPill), m => m, m => setMarcaAtual(m))}
                    
                    <Text style={styles.label}>Tombo</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TextInput style={[styles.inputModal, { flex: 1, marginVertical: 0 }]} value={tomboAtual} onChangeText={setTomboAtual} keyboardType="numeric" placeholder="Nº do patrimônio" placeholderTextColor="#666"/>
                      <TouchableOpacity onPress={() => openScanner('equipamento_atual')} style={styles.btnScan}><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>📷 SCAN</Text></TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity onPress={handleAdicionarEquipamento} style={{ alignSelf: 'center', marginTop: 20, padding: 10 }}><Text style={{ color: '#1DB954', fontWeight: 'bold', fontSize: 14 }}>Adicionar mais +</Text></TouchableOpacity>

                  {listaEquipamentos.length > 0 && (
                    <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: '#333', paddingTop: 15 }}>
                      <Text style={{ color: '#aaa', fontSize: 12, marginBottom: 10 }}>Itens na Peça atual:</Text>
                      {listaEquipamentos.map((eq) => (
                        <View key={eq.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2a2a2a', padding: 12, borderRadius: 6, marginBottom: 8 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{eq.tipo}</Text>
                            <Text style={{ color: '#aaa', fontSize: 12 }}>Tombo: {eq.tombo} | {eq.marca || 'N/A'}</Text>
                          </View>
                          <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity onPress={() => editarEquipamento(eq)} style={{ padding: 10 }}><Text style={{ color: '#FFAE00', fontWeight: 'bold', fontSize: 12 }}>✏️</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => removerEquipamento(eq.id)} style={{ padding: 10 }}><Text style={{ color: '#ff4444', fontWeight: 'bold', fontSize: 16 }}>X</Text></TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {currentStep === 3 && (
                <View style={{ zIndex: 10 }}>
                  <Text style={styles.tituloPasso}>Identificação do responsável</Text>
                  
                  <Text style={styles.label}>Responsável equipamentos</Text>
                  <View style={{ zIndex: activeDropdown === 'responsavel' ? 100 : 1 }}>
                    {renderAutocomplete(responsavel, setResponsavel, 'responsavel', 'Buscar servidor...', SERVIDORES, s => s.nome, s => { setResponsavel(s.nome); setMatricula(s.matricula); })}
                  </View>

                  <Text style={styles.label}>Responsável Peça (Opcional)</Text>
                  <View style={{ zIndex: activeDropdown === 'responsavelPeca' ? 100 : 1 }}>
                    {renderAutocomplete(responsavelPeca, setResponsavelPeca, 'responsavelPeca', 'Buscar servidor...', SERVIDORES, s => s.nome, s => setResponsavelPeca(s.nome))}
                  </View>
                </View>
              )}

              {currentStep === 4 && (
                <View>
                  <Text style={[styles.tituloPasso, { textTransform: 'uppercase' }]}>PEÇA DE INVENTÁRIO</Text>
                  <View style={{ backgroundColor: '#1e1e1e', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#333' }}>
                    <Text style={styles.resumoTexto}><Text style={{fontWeight: 'bold'}}>Prédio:</Text> {predio}</Text>
                    <Text style={styles.resumoTexto}><Text style={{fontWeight: 'bold'}}>Setor:</Text> {setor}</Text>
                    <Text style={[styles.resumoTexto, { marginBottom: 15 }]}><Text style={{fontWeight: 'bold'}}>Unidade:</Text> {local}</Text>
                    <Text style={[styles.resumoTexto, { fontWeight: 'bold', color: '#1DB954' }]}>Equipamentos:</Text>
                    {listaEquipamentos.map((eq, index) => (<Text key={index} style={styles.resumoTexto}>• {eq.tipo} tombo {eq.tombo} marca {eq.marca || 'N/A'}</Text>))}
                    <View style={{ marginVertical: 10, height: 1, backgroundColor: '#333' }} />
                    <Text style={styles.resumoTexto}><Text style={{fontWeight: 'bold'}}>Responsável pelo equipamento:</Text> {responsavel}</Text>
                    <Text style={styles.resumoTexto}><Text style={{fontWeight: 'bold'}}>Responsável pela Peça:</Text> {responsavelPeca || responsavel}</Text>
                  </View>
                </View>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, marginBottom: 10 }}>
                {currentStep === 1 ? (<TouchableOpacity onPress={fecharModal} style={[styles.btnNav, { backgroundColor: 'transparent', borderColor: '#ff4444', borderWidth: 1 }]}><Text style={{ color: '#ff4444', fontWeight: 'bold' }}>CANCELAR</Text></TouchableOpacity>) : (<TouchableOpacity onPress={etapaAnterior} style={[styles.btnNav, { backgroundColor: 'transparent', borderColor: '#1DB954', borderWidth: 1 }]}><Text style={{ color: '#1DB954', fontWeight: 'bold' }}>VOLTAR</Text></TouchableOpacity>)}
                
                {currentStep === 4 ? (
                  <TouchableOpacity onPress={adicionarItem} disabled={isSaving} style={[styles.btnNav, { backgroundColor: isSaving ? '#555' : '#1DB954' }]}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{isSaving ? 'A SALVAR...' : 'Finalizar peça →'}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={proximaEtapa} style={[styles.btnNav, { backgroundColor: '#1DB954' }]}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Avançar e Salvar →</Text></TouchableOpacity>
                )}
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={isScannerOpen} animationType="slide" transparent={false} onRequestClose={() => setIsScannerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView style={{ flex: 1 }} facing="back" onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}>
            <View style={{ flex: 1, backgroundColor: 'transparent', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 40 }}><TouchableOpacity onPress={() => setIsScannerOpen(false)} style={{ backgroundColor: '#ff4444', padding: 15, borderRadius: 10 }}><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>CANCELAR LEITURA</Text></TouchableOpacity></View>
          </CameraView>
          <View style={{ position: 'absolute', top: '35%', left: '15%', width: '70%', height: '30%', borderWidth: 2, borderColor: '#1DB954', borderRadius: 10, backgroundColor: 'rgba(29, 185, 84, 0.1)' }} pointerEvents="none" />
        </View>
      </Modal>

      <Modal visible={historyModalVisible} animationType="slide" transparent={true} onRequestClose={() => setHistoryModalVisible(false)}>
        {selectedItemHistory && (
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
            <View style={{ backgroundColor: theme.card, borderRadius: 15, padding: 20, maxHeight: '80%', borderWidth: 1, borderColor: theme.border }}>
              
              <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 15, marginBottom: 15 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ color: theme.tert || '#1DB954', fontSize: 18, fontWeight: 'bold' }}>🏥 Prontuário</Text>
                  <TouchableOpacity onPress={() => setIsAddingDefect(!isAddingDefect)} style={{ backgroundColor: isAddingDefect ? '#555' : '#ff4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{isAddingDefect ? 'VER HISTÓRICO' : '+ REGISTRAR DEFEITO'}</Text>
                  </TouchableOpacity>
                </View>

                {isEditingResponsavel ? (
                  <View style={{ marginTop: 5 }}>
                    <TextInput 
                      style={[styles.inputModal, { padding: 8, minHeight: 35, marginBottom: 5 }]}
                      value={editResponsavelName} onChangeText={setEditResponsavelName}
                      placeholder="Nome do Responsável" placeholderTextColor="#666"
                    />
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                      <TouchableOpacity onPress={() => setIsEditingResponsavel(false)} style={{ padding: 8, marginRight: 10 }}><Text style={{ color: '#aaa', fontWeight: 'bold' }}>CANCELAR</Text></TouchableOpacity>
                      <TouchableOpacity onPress={salvarEdicaoResponsavel} disabled={isSaving} style={{ backgroundColor: isSaving ? '#555' : '#1DB954', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>{isSaving ? '...' : 'SALVAR'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: theme.text, fontSize: 14, fontWeight: 'bold', marginRight: 10 }}>
                      {selectedItemHistory.responsavel || selectedItemHistory.nome || 'Sem Responsável'}
                    </Text>
                    <TouchableOpacity onPress={() => { setEditResponsavelName(selectedItemHistory.responsavel || selectedItemHistory.nome || ''); setIsEditingResponsavel(true); }}>
                      <Text style={{ color: '#FFAE00', fontSize: 12, fontWeight: 'bold' }}>✏️ EDITAR NOME</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {isAddingDefect ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={{ color: '#ff4444', fontWeight: 'bold', marginBottom: 10 }}>Selecione os equipamentos com defeito:</Text>
                  {(selectedItemHistory.equipamentosUnificados || []).map((eq, i) => (
                    <TouchableOpacity 
                      key={i} onPress={() => toggleDefectEq(eq.tombo)}
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e1e', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: selectedDefectEqs.includes(eq.tombo) ? '#ff4444' : '#333' }}
                    >
                      <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: selectedDefectEqs.includes(eq.tombo) ? '#ff4444' : '#888', backgroundColor: selectedDefectEqs.includes(eq.tombo) ? '#ff4444' : 'transparent', marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
                        {selectedDefectEqs.includes(eq.tombo) && <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                      </View>
                      <Text style={{ color: '#fff', fontSize: 12 }}>{eq.tipo} - {eq.marca || 'S/ Marca'} ({eq.tombo})</Text>
                    </TouchableOpacity>
                  ))}

                  <Text style={{ color: '#888', fontWeight: 'bold', marginTop: 10, marginBottom: 5 }}>Descrição do Defeito:</Text>
                  <TextInput 
                    style={[styles.inputModal, { minHeight: 80, textAlignVertical: 'top' }]} placeholder="Ex: Monitor não liga, cabo queimado..." placeholderTextColor="#666" 
                    value={defectText} onChangeText={setDefectText} multiline 
                  />

                  <TouchableOpacity onPress={salvarDefeito} disabled={isSaving} style={{ backgroundColor: isSaving ? '#555' : '#ff4444', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{isSaving ? 'A REGISTRAR...' : 'SALVAR DEFEITO E MARCAR INDISPONÍVEL'}</Text>
                  </TouchableOpacity>
                </ScrollView>
              ) : (
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#aaa', fontSize: 12, marginBottom: 8 }}>Selecione o equipamento:</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 }}>
                    {(selectedItemHistory.equipamentosUnificados || [{ tipo: 'Equipamento Principal', tombo: selectedItemHistory.pat }]).map((eq, i) => (
                      <TouchableOpacity 
                        key={i} onPress={() => { setSelectedEqProntuario(eq); setIsEditingEq(false); }}
                        style={[styles.pill, selectedEqProntuario?.tombo === eq.tombo ? styles.pillActive : styles.pillInactive, { marginBottom: 8, paddingVertical: 6, paddingHorizontal: 12 }]}
                      >
                        <Text style={{ color: selectedEqProntuario?.tombo === eq.tombo ? '#fff' : '#aaa', fontSize: 11, fontWeight: 'bold' }}>{eq.tipo} ({eq.tombo})</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={{ backgroundColor: '#1a1a1a', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333', marginBottom: 15 }}>
                    {isEditingEq ? (
                      <View>
                        <Text style={{ color: '#1DB954', fontWeight: 'bold', marginBottom: 10 }}>Editar Equipamento</Text>
                        <TextInput style={[styles.inputModal, { marginBottom: 5, padding: 8, minHeight: 35 }]} placeholder="Tipo (Ex: Monitor)" placeholderTextColor="#666" value={editEqData.tipo} onChangeText={(t) => setEditEqData({...editEqData, tipo: t})} />
                        <TextInput style={[styles.inputModal, { marginBottom: 5, padding: 8, minHeight: 35 }]} placeholder="Marca/Modelo" placeholderTextColor="#666" value={editEqData.marca} onChangeText={(t) => setEditEqData({...editEqData, marca: t})} />
                        <TextInput style={[styles.inputModal, { marginBottom: 10, padding: 8, minHeight: 35 }]} placeholder="Tombo" placeholderTextColor="#666" value={editEqData.tombo} onChangeText={(t) => setEditEqData({...editEqData, tombo: t})} />
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                          <TouchableOpacity onPress={() => setIsEditingEq(false)} style={{ padding: 8, marginRight: 10 }}><Text style={{ color: '#aaa', fontWeight: 'bold' }}>CANCELAR</Text></TouchableOpacity>
                          <TouchableOpacity onPress={salvarEdicaoProntuario} disabled={isSaving} style={{ backgroundColor: isSaving ? '#555' : '#1DB954', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{isSaving ? '...' : 'SALVAR'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{selectedEqProntuario?.tipo}</Text>
                          <Text style={{ color: '#aaa', fontSize: 12 }}>Marca: {selectedEqProntuario?.marca || 'N/A'}</Text>
                          <Text style={{ color: '#aaa', fontSize: 12 }}>Tombo: {selectedEqProntuario?.tombo}</Text>
                          <Text style={{ color: selectedEqProntuario?.status === 'Indisponível' ? '#ff4444' : '#1DB954', fontSize: 12, fontWeight: 'bold', marginTop: 4 }}>Status: {selectedEqProntuario?.status || 'Disponível'}</Text>
                        </View>
                        <TouchableOpacity onPress={iniciarEdicaoProntuario} style={{ backgroundColor: '#333', padding: 8, borderRadius: 6 }}>
                          <Text style={{ color: '#FFAE00', fontSize: 12, fontWeight: 'bold' }}>✏️ EDITAR</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {(() => {
                    const history = chamados ? chamados.filter(c => {
                      if (selectedEqProntuario?.tombo && selectedEqProntuario.tombo !== 'N/A') {
                        return c.patrimonio === selectedEqProntuario.tombo || (c.equipamento && c.equipamento.tombo === selectedEqProntuario.tombo);
                      }
                      return c.equipamento && c.equipamento.id === selectedItemHistory.id;
                    }) : [];

                    return (
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: theme.inputBg, padding: 10, borderRadius: 10, marginBottom: 15 }}>
                          <View style={{ alignItems: 'center' }}>
                            <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold' }}>{history.length}</Text>
                            <Text style={{ color: theme.subtext, fontSize: 10 }}>CHAMADOS</Text>
                          </View>
                          <View style={{ alignItems: 'center' }}>
                            {selectedEqProntuario?.status === 'Indisponível' ? (
                              <TouchableOpacity onPress={() => liberarEquipamento(selectedEqProntuario)} style={{ backgroundColor: '#1DB954', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✅ LIBERAR MÁQUINA</Text>
                              </TouchableOpacity>
                            ) : (
                              <Text style={{ color: getHealthStatus(history.length).color, fontSize: 18, fontWeight: 'bold' }}>{getHealthStatus(history.length).label}</Text>
                            )}
                            <Text style={{ color: theme.subtext, fontSize: 10, marginTop: 4 }}>SAÚDE</Text>
                          </View>
                        </View>
                        <Text style={{ color: theme.text, fontWeight: 'bold', marginBottom: 10 }}>Histórico de Intervenções deste item:</Text>
                        <ScrollView>
                          {history.length === 0 ? (
                            <Text style={{ color: theme.subtext, fontStyle: 'italic', textAlign: 'center', marginVertical: 10 }}>Nenhum chamado para o tombo {selectedEqProntuario?.tombo}.</Text>
                          ) : (
                            history.map((h) => (
                              <View key={h.id} style={{ backgroundColor: theme.inputBg, padding: 12, borderRadius: 8, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: h.status === 'FECHADO' ? '#1DB954' : '#ff4444' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <Text style={{ color: h.status === 'FECHADO' ? '#1DB954' : '#ff4444', fontWeight: 'bold', fontSize: 10 }}>{h.status}</Text>
                                  <Text style={{ color: theme.subtext, fontSize: 10 }}>{new Date(h.dataAbertura).toLocaleDateString()}</Text>
                                </View>
                                <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 12 }}>{h.descricao || h.titulo}</Text>
                                <Text style={{ color: theme.subtext, fontSize: 10, marginTop: 4 }}>👨‍🔧 Técnico: {h.tecnico || 'Não atribuído'}</Text>
                              </View>
                            ))
                          )}
                        </ScrollView>
                      </View>
                    );
                  })()}
                </View>
              )}
              <Btn title="FECHAR PRONTUÁRIO" onPress={() => setHistoryModalVisible(false)} theme={theme} style={{ marginTop: 15 }} />
            </View>
          </View>
        )}
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  tituloPasso: { fontWeight: 'bold', fontSize: 20, color: '#1DB954', textAlign: 'center', marginBottom: 20 },
  label: { color: '#888', fontSize: 12, fontWeight: 'bold', marginBottom: 5, marginTop: 10 },
  inputModal: { backgroundColor: '#1e1e1e', borderColor: '#333', borderWidth: 1, color: '#fff', padding: 12, borderRadius: 8, fontSize: 14, minHeight: 45 },
  btnScan: { backgroundColor: '#2a2a2a', padding: 10, borderRadius: 8, marginLeft: 5, borderWidth: 1, borderColor: '#1DB954' },
  btnNav: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, minWidth: 100, alignItems: 'center' },
  pill: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, marginRight: 10 },
  pillActive: { backgroundColor: '#1DB954', borderColor: '#1DB954' },
  pillInactive: { backgroundColor: 'transparent', borderColor: '#555' },
  resumoTexto: { color: '#ddd', fontSize: 13, marginBottom: 5, lineHeight: 22 },
  dropdownContainer: { backgroundColor: '#333', borderRadius: 8, borderWidth: 1, borderColor: '#1DB954', marginBottom: 10, marginTop: -4, maxHeight: 180, overflow: 'hidden' },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#444' },
  dropdownText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  dropdownSubText: { color: '#aaa', fontSize: 10, marginTop: 2 }
});