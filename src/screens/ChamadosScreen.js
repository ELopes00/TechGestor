import { Camera, CameraView } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Btn, Card } from '../components';
import { DataService } from '../services/DataService';
import { RADIUS } from '../theme/themes';
import { CHECKLIST_PADRAO, FRASES_RAPIDAS, SETORES } from '../utils/constants';
import { getCorPrioridade, getTempoDecorrido, isSlaVencido } from '../utils/helpers';

// STATUS ATUALIZADOS CONFORME O PEDIDO
const STATUS_OPCOES = [
  'Aguardando atendimento', 'Em andamento', 'Em separação de equipamentos', 'Instalado', 'finalizado'
];

export default function ChamadosScreen({ user, chamados, users, inventario, addLog, theme, showPush }) {
  
  // NOVOS CAMPOS DO FORMULÁRIO
  const [tituloChamado, setTituloChamado] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [sala, setSala] = useState('');
  const [observacao, setObservacao] = useState('');
  const [desc, setDesc] = useState('');
  
  const [setor, setSetor] = useState(SETORES[0]);
  const [tecSel, setTecSel] = useState('');
  const [equipSel, setEquipSel] = useState(null);
  const [prioridade, setPrioridade] = useState('NORMAL');
  const [formAnexos, setFormAnexos] = useState([]);
  
  const [showTecs, setShowTecs] = useState(false);
  const [showSetores, setShowSetores] = useState(false);
  const [showEquips, setShowEquips] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState('TODOS');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState(null);
  const [chatMsg, setChatMsg] = useState('');
  const [transferId, setTransferId] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('MEUS');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [chamadoParaAssumir, setChamadoParaAssumir] = useState(null);

  const [msgErro, setMsgErro] = useState('');
  const [solucao, setSolucao] = useState('');

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [novoStatusSel, setNovoStatusSel] = useState('');
  const [notaStatus, setNotaStatus] = useState('');

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSavingChamado, setIsSavingChamado] = useState(false);

  const [hasPermission, setHasPermission] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState(''); 
  const cameraRef = useRef(null);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    if (Platform.OS !== 'web') getCameraPermissions();
  }, []);

  const registrarLog = (msg) => { if (addLog) addLog(msg); };

  const todosTecnicos = users.filter((u) => u.perfil === 'TECNICO' || u.perfil === 'ADM');
  const tecnicosDoSetorAtual = todosTecnicos.filter(u => u.predio === setor); 

  const chamadosVisiveis = chamados.filter((c) => {
    const termo = searchText.toLowerCase();
    const matchesSearch = c.descricao?.toLowerCase().includes(termo) || c.titulo?.toLowerCase().includes(termo) || c.solicitante?.toLowerCase().includes(termo) || c.tecnico?.toLowerCase().includes(termo);
    const matchesPriority = filtroPrioridade === 'TODOS' ? true : c.prioridade === filtroPrioridade;
    let matchesTab = false;
    
    if (abaAtiva === 'MEUS') {
      if (user.perfil === 'ADM') matchesTab = true;
      else matchesTab = c.tecnico === user.login;
    } else if (abaAtiva === 'FILA') {
      const semTecnico = !c.tecnico || c.tecnico === '';
      const mesmoPredio = c.predio === user.predio || user.perfil === 'ADM';
      const naoEstaFechado = c.status !== 'FECHADO' && c.status !== 'finalizado';
      matchesTab = semTecnico && mesmoPredio && naoEstaFechado;
    }
    return matchesTab && matchesSearch && matchesPriority;
  });

  const toggleSelection = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const bulkExcluir = () => {
    if (selectedIds.length === 0) return;
    if (user.perfil !== 'ADM') return Alert.alert('Erro', 'Apenas Administradores podem excluir chamados.');

    const acaoExcluir = () => {
      const idsParaApagar = [...selectedIds];
      setIsSelectMode(false); 
      setSelectedIds([]);
      setTimeout(() => { if (showPush) showPush(`🗑️ ${idsParaApagar.length} chamados excluídos.`); }, 100);
      idsParaApagar.forEach(id => DataService.deletarChamado(id).catch(e => console.log('Erro:', e)));
      registrarLog(`🗑️ ADM EXCLUIU ${idsParaApagar.length} CHAMADOS EM LOTE`);
    };

    const msg = `Apagar ${selectedIds.length} chamados permanentemente?`;
    if (Platform.OS === 'web') { if (window.confirm(msg)) acaoExcluir(); } 
    else { Alert.alert("Atenção", msg, [{ text: "Cancelar" }, { text: "Excluir", style: 'destructive', onPress: acaoExcluir }]); }
  };

  const bulkAssumir = () => {
    if (selectedIds.length === 0) return;
    const msgSistema = { user: 'SISTEMA', texto: `✅ ${user.login} assumiu em lote.`, time: Date.now() };
    const idsParaAssumir = [...selectedIds];
    
    setIsSelectMode(false); setSelectedIds([]); setAbaAtiva('MEUS');
    setTimeout(() => { if (showPush) showPush(`🙋‍♂️ ${idsParaAssumir.length} chamados assumidos!`); }, 100);

    idsParaAssumir.forEach(id => {
      const chamadoTarget = chamados.find(c => c.id === id);
      if (chamadoTarget) {
        DataService.atualizarChamado(id, { 
          tecnico: user.login, status: 'Em andamento', historico: [msgSistema, ...(chamadoTarget.historico || [])] 
        }).catch(e => console.log(e));
      }
    });
    registrarLog(`🙋‍♂️ ASSUMIU ${idsParaAssumir.length} CHAMADOS EM LOTE`);
  };

  const autoEscalar = () => {
    if (tecnicosDoSetorAtual.length === 0) return Alert.alert('Aviso', `Nenhum técnico no setor ${setor}.`);
    const indiceAleatorio = Math.floor(Math.random() * tecnicosDoSetorAtual.length);
    const tecnicoSorteado = tecnicosDoSetorAtual[indiceAleatorio].login;
    setTecSel(tecnicoSorteado);
    if (showPush) showPush(`⚡ ${tecnicoSorteado} sorteado para o chamado!`);
  };

  const anexarNoFormulario = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (!result.canceled) {
        const file = result.assets[0];
        setFormAnexos([...formAnexos, { id: Date.now().toString(), nome: file.name, uri: file.uri, type: 'doc' }]);
      }
    } catch (err) { Alert.alert("Erro", "Não foi possível selecionar o arquivo."); }
  };
  
  const anexarNoDetalhe = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (!result.canceled) {
        const file = result.assets[0];
        const novoDoc = { id: Date.now().toString(), nome: file.name, uri: file.uri, type: 'doc' };
        const novosAnexos = [...(selectedChamado.anexos || []), novoDoc];
        
        await DataService.atualizarChamado(selectedChamado.id, { anexos: novosAnexos });
        setSelectedChamado({ ...selectedChamado, anexos: novosAnexos });
        registrarLog(`📎 ANEXOU ARQUIVO NO CHAMADO #${selectedChamado.id.substring(0,4)}`);
      }
    } catch (err) { Alert.alert("Erro", "Não foi possível anexar."); }
  };

  const abrirCamera = (target) => {
    if (Platform.OS === 'web') return Alert.alert('Aviso', 'A câmara só funciona no telemóvel.');
    if (hasPermission === null) return Alert.alert('Aviso', 'A pedir permissão da câmara...');
    if (hasPermission === false) return Alert.alert('Erro', 'Sem acesso à câmara.');
    setCameraTarget(target);
    setIsCameraOpen(true);
  };

  const tirarFoto = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      setIsCameraOpen(false); 
      const novaFoto = { id: Date.now().toString(), nome: `Foto_${Date.now()}.jpg`, uri: photo.uri, type: 'imagem', base64: photo.base64 };

      if (cameraTarget === 'form') {
        setFormAnexos([...formAnexos, novaFoto]);
      } else if (cameraTarget === 'detalhe') {
        const novosAnexos = [...(selectedChamado.anexos || []), novaFoto];
        await DataService.atualizarChamado(selectedChamado.id, { anexos: novosAnexos });
        setSelectedChamado({ ...selectedChamado, anexos: novosAnexos });
        registrarLog(`📸 ADICIONOU FOTO NO CHAMADO #${selectedChamado.id.substring(0,4)}`);
      }
    }
  };

  const abrir = async () => {
    if (!tituloChamado || !solicitante || !desc || !sala) {
      return Alert.alert('Erro', 'Preencha os campos obrigatórios: Chamado, Solicitante, Sala e Descrição.');
    }
    if (isSavingChamado) return; 
    
    setIsSavingChamado(true);
    const novoChamado = {
      titulo: tituloChamado,
      solicitante,
      sala,
      observacao,
      descricao: desc, 
      predio: setor, 
      status: 'Aguardando atendimento', 
      tecnico: tecSel || '',
      prioridade, 
      dataAbertura: Date.now(), 
      equipamento: equipSel, 
      historico: [],
      anexos: formAnexos, 
      checklist: CHECKLIST_PADRAO, 
      abertoPor: user.login
    };

    try {
      await DataService.salvarChamado(novoChamado);
      registrarLog(`✨ ABRIU CHAMADO: ${tituloChamado}`);
      if (showPush) showPush(`🔔 Novo Chamado Criado`);

      if (tecSel) {
        const tecnicoTarget = users.find(u => u.login === tecSel);
        if (tecnicoTarget && tecnicoTarget.expoPushToken && DataService.enviarPushNotification) {
          DataService.enviarPushNotification(tecnicoTarget.expoPushToken, '🚨 Novo Chamado Escalonado!', `${tituloChamado} - Sala: ${sala}`).catch(e => console.log(e));
        }
      }
      
      // Limpar formulário
      setTituloChamado(''); setSolicitante(''); setSala(''); setObservacao(''); setDesc(''); 
      setSetor(SETORES[0]); setTecSel(''); setPrioridade('NORMAL'); setEquipSel(null); setFormAnexos([]);
    } catch (e) { Alert.alert('Erro', 'Falha ao salvar chamado.'); } finally { setIsSavingChamado(false); }
  };

  const prepararAssumir = (id) => { setChamadoParaAssumir(id); setConfirmModalVisible(true); };

  const confirmarAssumir = async () => {
    if (!chamadoParaAssumir) return;
    const chamadoTarget = chamados.find(c => c.id === chamadoParaAssumir);
    const msgSistema = { user: 'SISTEMA', texto: `✅ ${user.login} assumiu o chamado da fila.`, time: Date.now() };
    
    setConfirmModalVisible(false); setChamadoParaAssumir(null); setAbaAtiva('MEUS');
    await DataService.atualizarChamado(chamadoParaAssumir, {
      tecnico: user.login, status: 'Em andamento', historico: [msgSistema, ...(chamadoTarget.historico || [])]
    });
    registrarLog(`🙋‍♂️ ASSUMIU CHAMADO #${chamadoParaAssumir.substring(0,4)}`);
  };

  const enviarMensagem = async (msgManual = null) => {
    const msgFinal = msgManual || chatMsg;
    if (!msgFinal.trim()) return;
    const novaMsg = { user: user.login, texto: msgFinal, time: Date.now() };
    const novoHistorico = [novaMsg, ...(selectedChamado.historico || [])];
    
    await DataService.atualizarChamado(selectedChamado.id, { historico: novoHistorico });
    setSelectedChamado({ ...selectedChamado, historico: novoHistorico });
    registrarLog(`📝 COMENTOU CHAMADO #${selectedChamado.id.substring(0,4)}`);
    setChatMsg('');
  };

  const transferirChamado = async (chamadoId, tecnicoAtual, novoTecnico, novoPredio) => {
    const chamadoTarget = chamados.find(c => c.id === chamadoId);
    const destinoStr = novoTecnico ? novoTecnico : `Fila (${novoPredio})`;
    const msgSistema = { user: 'SISTEMA', texto: `🔄 Transferido para ${destinoStr}`, time: Date.now() };
    
    setTransferId(null); 
    Alert.alert('Sucesso', 'Chamado transferido!');
    await DataService.atualizarChamado(chamadoId, { 
      tecnico: novoTecnico, 
      predio: novoPredio || chamadoTarget.predio, 
      status: novoTecnico ? 'Em andamento' : 'Aguardando atendimento',
      historico: [msgSistema, ...(chamadoTarget.historico || [])] 
    });
    registrarLog(`🔄 TRANSFERIU CHAMADO PARA ${destinoStr}`);
  };

  const alterarStatusChamado = async () => {
    if (!novoStatusSel) return;
    if (novoStatusSel === 'finalizado' || novoStatusSel === 'FECHADO') {
      setShowStatusModal(false);
      return Alert.alert('Aviso', 'Para marcar como Finalizado, preencha o campo Solução/Notas e clique em FECHAR CHAMADO.');
    }

    const txtNota = notaStatus.trim() ? `\n📝 Nota: ${notaStatus}` : '';
    const msgSistema = { user: 'SISTEMA', texto: `🔄 Status atualizado: ${novoStatusSel}${txtNota}`, time: Date.now() };
    
    await DataService.atualizarChamado(selectedChamado.id, {
      status: novoStatusSel, historico: [msgSistema, ...(selectedChamado.historico || [])]
    });

    setSelectedChamado({ ...selectedChamado, status: novoStatusSel, historico: [msgSistema, ...(selectedChamado.historico || [])] });
    registrarLog(`🔄 ALTEROU STATUS CHAMADO #${selectedChamado.id.substring(0,4)} para ${novoStatusSel}`);
    
    setShowStatusModal(false); setNotaStatus(''); setNovoStatusSel('');
  };

  const fecharChamado = async () => {
    if (!solucao || solucao.trim().length === 0) return setMsgErro("⚠️ Descreva a solução.");
    try {
      const msgFechamento = { user: 'SISTEMA', texto: `🏁 CHAMADO FINALIZADO POR ${user.login}.\n📝 SOLUÇÃO: ${solucao}`, time: Date.now() };
      const tecnicoFinal = selectedChamado.tecnico ? selectedChamado.tecnico : user.login;
      
      setModalVisible(false); 
      if (showPush) showPush("🏁 Chamado Finalizado!");

      await DataService.atualizarChamado(selectedChamado.id, {
        status: 'finalizado', tecnico: tecnicoFinal, historico: [msgFechamento, ...(selectedChamado.historico || [])], checklist: selectedChamado.checklist || []
      });
      
      registrarLog(`✅ FECHOU CHAMADO #${selectedChamado.id.substring(0,4)}`);
      setSolucao(''); setMsgErro(''); 
    } catch (error) { Alert.alert("Erro", "Falha ao fechar no banco."); }
  };

  const toggleCheck = async (idCheck) => {
    const novoChecklist = selectedChamado.checklist.map((item) => item.id === idCheck ? { ...item, checked: !item.checked } : item);
    await DataService.atualizarChamado(selectedChamado.id, { checklist: novoChecklist });
    setSelectedChamado({ ...selectedChamado, checklist: novoChecklist });
  };

  const abrirModalDetalhes = (c) => { setSelectedChamado(c); setMsgErro(''); setSolucao(''); setModalVisible(true); setShowStatusModal(false); };

  const handleExcluir = (id) => {
    if (user.perfil !== 'ADM') return Alert.alert('Acesso Negado', 'Apenas Administradores podem excluir chamados.');
    const acao = () => {
      DataService.deletarChamado(id).catch(e => console.log(e));
      registrarLog(`🗑️ EXCLUIU CHAMADO #${id.substring(0,4)}`);
      if (showPush) showPush("🗑️ Chamado apagado.");
    };
    if (Platform.OS === 'web') { if (window.confirm("Deseja apagar este chamado permanentemente?")) acao(); } 
    else { Alert.alert("Excluir", "Deseja apagar este chamado permanentemente?", [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: acao }]); }
  };

  const getTempoResolucao = (chamado) => {
    const msgFinal = chamado.historico?.find(h => h.texto.includes('CHAMADO FINALIZADO') || h.texto.includes('CHAMADO FECHADO') || h.texto.includes('Status atualizado: finalizado'));
    if (msgFinal && chamado.dataAbertura) {
      const endTime = msgFinal.time;
      const diff = endTime - chamado.dataAbertura;
      const horas = Math.floor(diff / (1000 * 60 * 60));
      const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const dataFormatada = new Date(endTime).toLocaleString('pt-BR');
      return `${dataFormatada} (Levou ${horas}h ${minutos}m)`;
    }
    return 'Indisponível';
  };

  const isChamadoFechado = (status) => status === 'FECHADO' || status === 'finalizado';

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Chamados</Text>
          {user.perfil === 'ADM' && !isSelectMode ? (
            <TouchableOpacity onPress={() => setIsSelectMode(true)} style={{ backgroundColor: theme.cardAlt, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: theme.border }} activeOpacity={0.75}>
              <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>Selecionar Vários</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', marginBottom: 15, backgroundColor: theme.card, borderRadius: RADIUS.md, padding: 5, borderWidth: 1, borderColor: theme.border }}>
          <TouchableOpacity onPress={() => { setAbaAtiva('MEUS'); setIsSelectMode(false); setSelectedIds([]); }} style={{ flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: RADIUS.sm, backgroundColor: abaAtiva === 'MEUS' ? theme.primarySoft : 'transparent' }} activeOpacity={0.75}>
            <Text style={{ color: abaAtiva === 'MEUS' ? theme.primary : theme.subtext, fontWeight: '700', fontSize: 12.5 }}>MEUS CHAMADOS</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setAbaAtiva('FILA'); setIsSelectMode(false); setSelectedIds([]); }} style={{ flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: RADIUS.sm, backgroundColor: abaAtiva === 'FILA' ? theme.primarySoft : 'transparent' }} activeOpacity={0.75}>
            <Text style={{ color: abaAtiva === 'FILA' ? theme.sec : theme.subtext, fontWeight: '700', fontSize: 12.5 }}>FILA ({user.predio || 'Geral'})</Text>
          </TouchableOpacity>
        </View>

        {isSelectMode && (
          <View style={{ backgroundColor: theme.primary, padding: 15, borderRadius: 10, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{selectedIds.length} selecionados</Text>
            <View style={{ flexDirection: 'row' }}>
              {abaAtiva === 'FILA' && selectedIds.length > 0 && (
                <TouchableOpacity onPress={bulkAssumir} style={{ backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5, marginRight: 8 }}>
                  <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 12 }}>🙋‍♂️ ASSUMIR</Text>
                </TouchableOpacity>
              )}
              {user.perfil === 'ADM' && selectedIds.length > 0 && (
                <TouchableOpacity onPress={bulkExcluir} style={{ backgroundColor: '#ff4444', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5, marginRight: 8 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>🗑️ EXCLUIR</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => { setIsSelectMode(false); setSelectedIds([]); }} style={{ paddingHorizontal: 5, paddingVertical: 5 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>❌ SAIR</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Card theme={theme} style={{ padding: 10, marginBottom: 10 }}>
          <TextInput style={{ backgroundColor: theme.inputBg, color: theme.text, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.border }} placeholder="🔍 Buscar por erro, assunto ou técnico..." placeholderTextColor={theme.subtext} value={searchText} onChangeText={setSearchText} />
        </Card>

        <Card theme={theme}>
          <Text style={{ color: theme.primary, fontWeight: 'bold', marginBottom: 10 }}>Novo Chamado</Text>
          
          <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, width: '100%', borderWidth: 1, borderColor: theme.border }]} placeholder="Chamado (Assunto principal)" value={tituloChamado} onChangeText={setTituloChamado} placeholderTextColor={theme.subtext} />
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 5, backgroundColor: theme.inputBg, color: theme.text, borderWidth: 1, borderColor: theme.border }]} placeholder="Solicitante" value={solicitante} onChangeText={setSolicitante} placeholderTextColor={theme.subtext} />
            <TextInput style={[styles.input, { flex: 1, marginLeft: 5, backgroundColor: theme.inputBg, color: theme.text, borderWidth: 1, borderColor: theme.border }]} placeholder="Sala" value={sala} onChangeText={setSala} placeholderTextColor={theme.subtext} />
          </View>

          <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, width: '100%', borderWidth: 1, borderColor: theme.border }]} placeholder="Descrição do Problema" value={desc} onChangeText={setDesc} placeholderTextColor={theme.subtext} />
          
          <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, width: '100%', borderWidth: 1, borderColor: theme.border, height: 60, textAlignVertical: 'top' }]} placeholder="Observação (Opcional)" value={observacao} onChangeText={setObservacao} multiline placeholderTextColor={theme.subtext} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <TouchableOpacity style={[styles.input, { flex: 1, marginRight: 5, backgroundColor: theme.inputBg, borderColor: theme.border, borderWidth: 1, justifyContent: 'center' }]} onPress={() => setShowSetores(!showSetores)}>
              <Text style={{ color: theme.text }}>Setor: {setor} ↓</Text>
            </TouchableOpacity>
            
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity style={[styles.input, { flex: 1, backgroundColor: theme.inputBg, borderColor: theme.border, borderWidth: 1, justifyContent: 'center', marginRight: 5 }]} onPress={() => setShowTecs(!showTecs)}>
                <Text style={{ color: tecSel ? theme.text : theme.subtext, fontSize: 12 }}>{tecSel || 'Técnico ↓'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={autoEscalar} style={{ backgroundColor: theme.primary, padding: 10, borderRadius: 8 }}>
                <Text style={{ fontSize: 16 }}>⚡</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showSetores && (
            <View style={{ backgroundColor: theme.card, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.border }}>
              {SETORES.map((s) => (
                <TouchableOpacity key={s} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border }} onPress={() => { setSetor(s); setTecSel(''); setShowSetores(false); }}>
                  <Text style={{ color: theme.text }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showTecs && (
            <View style={{ backgroundColor: theme.card, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.border }}>
              {tecnicosDoSetorAtual.map((t) => (
                <TouchableOpacity key={t.login} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border }} onPress={() => { setTecSel(t.login); setShowTecs(false); }}>
                  <Text style={{ color: theme.text }}>{t.login}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={[styles.input, { width: '100%', backgroundColor: theme.inputBg, borderColor: theme.border, borderWidth: 1, justifyContent: 'center', marginBottom: 10 }]} onPress={() => setShowEquips(!showEquips)}>
            <Text style={{ color: equipSel ? theme.text : theme.subtext }}>{equipSel ? `Equipamento: ${equipSel.nome} (${equipSel.pat})` : 'Vincular Equipamento ↓'}</Text>
          </TouchableOpacity>

          {showEquips && (
            <View style={{ backgroundColor: theme.card, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.border }}>
              {inventario.map((i) => (
                <TouchableOpacity key={i.id} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border }} onPress={() => { setEquipSel(i); setShowEquips(false); }}>
                  <Text style={{ color: theme.text }}>{i.nome} - {i.pat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ flexDirection: 'row', marginBottom: 10 }}>
            {['NORMAL', 'MEDIA', 'ALTA'].map((p) => (
              <TouchableOpacity key={p} style={{ flex: 1, padding: 8, alignItems: 'center', backgroundColor: prioridade === p ? getCorPrioridade(p) : theme.inputBg, marginHorizontal: 2, borderRadius: 5 }} onPress={() => setPrioridade(p)}>
                <Text style={{ color: prioridade === p ? '#fff' : theme.subtext, fontSize: 10, fontWeight: 'bold' }}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', marginBottom: 15, justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={anexarNoFormulario} style={{ flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: theme.inputBg, borderRadius: 8, flex: 1, marginRight: 5, justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}>
              <Text style={{ fontSize: 16, marginRight: 5 }}>📎</Text>
              <Text style={{ color: theme.text, fontSize: 12, fontWeight: 'bold' }}>Arquivo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => abrirCamera('form')} style={{ flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: theme.primary, borderRadius: 8, flex: 1, marginLeft: 5, justifyContent: 'center' }}>
              <Text style={{ fontSize: 16, marginRight: 5 }}>📸</Text>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Tirar Foto</Text>
            </TouchableOpacity>
          </View>

          {formAnexos.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 }}>
              {formAnexos.map((doc, index) => (
                <View key={index} style={{ marginRight: 10, marginBottom: 10, alignItems: 'center' }}>
                  {doc.type === 'imagem' ? (
                    <Image source={{ uri: doc.uri }} style={{ width: 60, height: 60, borderRadius: 8, borderWidth: 1, borderColor: theme.border }} />
                  ) : (
                    <View style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: theme.inputBg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
                      <Text style={{ fontSize: 24 }}>📄</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => setFormAnexos(formAnexos.filter((_, i) => i !== index))} style={{ position: 'absolute', top: -5, right: -5, backgroundColor: '#ff4444', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>X</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={[styles.input, { backgroundColor: isSavingChamado ? '#555' : theme.primary, alignItems: 'center', justifyContent: 'center', width: '100%', borderColor: 'transparent' }]} onPress={abrir} disabled={isSavingChamado}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{isSavingChamado ? 'A ABRIR CHAMADO...' : 'ABRIR CHAMADO'}</Text>
          </TouchableOpacity>
        </Card>

        {chamadosVisiveis.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 30 }}><Text style={{ color: theme.subtext }}>Nenhum chamado encontrado.</Text></View>
        )}

        {chamadosVisiveis.map((c) => {
          const vencido = !isChamadoFechado(c.status) && isSlaVencido(c.dataAbertura);
          const isSelected = selectedIds.includes(c.id);

          return (
            <View key={c.id}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => { if (isSelectMode) toggleSelection(c.id); else abrirModalDetalhes(c); }}>
                <Card theme={theme} style={{ borderLeftWidth: 6, borderLeftColor: isChamadoFechado(c.status) ? theme.subtext : vencido ? theme.warning : getCorPrioridade(c.prioridade), borderColor: isSelected ? theme.primary : vencido ? theme.warning : theme.border, borderWidth: isSelected ? 2 : vencido ? 1 : 0, backgroundColor: isSelected ? theme.inputBg : theme.card }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                        {isSelectMode && (
                          <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: theme.primary, marginRight: 8, backgroundColor: isSelected ? theme.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                            {isSelected && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
                          </View>
                        )}
                        <View style={{ backgroundColor: isChamadoFechado(c.status) ? theme.subtext : vencido ? theme.warning : getCorPrioridade(c.prioridade), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 }}>
                          <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>{isChamadoFechado(c.status) ? 'FINALIZADO' : vencido ? 'ATRASADO' : c.prioridade}</Text>
                        </View>
                        <Text style={{ color: vencido ? theme.warning : theme.subtext, fontSize: 10, fontWeight: vencido ? 'bold' : 'normal' }}>⏱ {getTempoDecorrido(c.dataAbertura)}</Text>
                      </View>
                      <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>{c.titulo || c.descricao}</Text>
                      <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 2 }}>Solicitante: {c.solicitante || 'N/A'} | Sala: {c.sala || 'N/A'}</Text>
                      <Text style={{ color: theme.sec, fontSize: 11, fontWeight: 'bold', marginTop: 4 }}>Status: {c.status}</Text>
                      {c.equipamento && <Text style={{ color: theme.primary, fontSize: 11, marginTop: 2 }}>🖥 {c.equipamento.nome} ({c.equipamento.pat})</Text>}
                    </View>

                    {!isSelectMode && user.perfil === 'ADM' && (
                      <TouchableOpacity onPress={() => handleExcluir(c.id)} style={{ paddingLeft: 10 }}>
                        <Text style={{ fontSize: 22 }}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 5 }}>📍 {c.predio} | 👨‍🔧 {c.tecnico || (<Text style={{ color: theme.sec, fontWeight: 'bold' }}>AGUARDANDO TÉCNICO</Text>)}</Text>
                  
                  {!isSelectMode && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                      <Text style={{ color: theme.primary, fontSize: 10 }}>Toque para detalhes 💬</Text>
                      {abaAtiva === 'FILA' && (
                        <TouchableOpacity style={{ backgroundColor: theme.online, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 5 }} onPress={() => prepararAssumir(c.id)}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>🙋‍♂️ ASSUMIR</Text>
                        </TouchableOpacity>
                      )}
                      {abaAtiva === 'MEUS' && !isChamadoFechado(c.status) && (
                        <TouchableOpacity style={{ backgroundColor: theme.inputBg, padding: 5, borderRadius: 5, borderWidth: 1, borderColor: theme.border }} onPress={() => setTransferId(transferId === c.id ? null : c.id)}>
                          <Text style={{ color: theme.text, fontSize: 10 }}>⇄ Transferir</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
              
              {transferId === c.id && !isSelectMode && (
                <View style={{ backgroundColor: theme.card, borderRadius: 10, marginBottom: 15, padding: 10, marginLeft: 20, borderWidth: 1, borderColor: theme.primary }}>
                  <Text style={{ color: theme.subtext, marginBottom: 5, fontSize: 12 }}>Transferir para Fila do Setor:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                    {SETORES.map(s => (
                      <TouchableOpacity key={s} onPress={() => transferirChamado(c.id, c.tecnico, '', s)} style={{ backgroundColor: theme.inputBg, padding: 8, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: theme.border }}>
                        <Text style={{ color: theme.primary, fontSize: 11, fontWeight: 'bold' }}>🏢 {s}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={{ color: theme.subtext, marginBottom: 5, fontSize: 12 }}>Ou transferir direto para Técnico/Admin:</Text>
                  {todosTecnicos.filter((t) => t.login !== c.tecnico).map((t) => (
                    <TouchableOpacity key={t.login} style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: theme.border }} onPress={() => transferirChamado(c.id, c.tecnico, t.login, t.predio)}>
                      <Text style={{ color: theme.text, fontWeight: 'bold' }}>➜ {t.login} <Text style={{ color: theme.sec, fontSize: 10 }}>({t.predio})</Text></Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={isCameraOpen} animationType="slide" transparent={false} onRequestClose={() => setIsCameraOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
            <View style={{ flex: 1, backgroundColor: 'transparent', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingBottom: 40 }}>
              <TouchableOpacity onPress={() => setIsCameraOpen(false)} style={{ backgroundColor: '#333', padding: 15, borderRadius: 50, width: 80, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 12 }}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={tirarFoto} style={{ backgroundColor: '#fff', width: 70, height: 70, borderRadius: 35, borderWidth: 5, borderColor: '#1DB954' }} />
              <View style={{ width: 80 }} />
            </View>
          </CameraView>
        </View>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        {selectedChamado && (
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
            <View style={{ height: '90%', backgroundColor: theme.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold' }}>Chamado #{selectedChamado.id?.substring(0,4) || '---'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{ color: theme.primary, fontSize: 18 }}>Fechar</Text></TouchableOpacity>
              </View>
              
              <ScrollView style={{ flex: 1, marginBottom: 10 }} keyboardShouldPersistTaps="handled">
                <Card theme={theme}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                    <Text style={{ color: theme.sec, fontWeight: 'bold', fontSize: 16 }}>Status: {selectedChamado.status}</Text>
                    {!isChamadoFechado(selectedChamado.status) && (
                      <TouchableOpacity onPress={() => setShowStatusModal(!showStatusModal)} style={{ backgroundColor: theme.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>MUDAR STATUS</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {showStatusModal && (
                    <View style={{ backgroundColor: theme.inputBg, padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: theme.border }}>
                      <Text style={{ color: theme.text, fontWeight: 'bold', marginBottom: 10 }}>Alterar Status para:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                        {STATUS_OPCOES.map(st => (
                          <TouchableOpacity key={st} onPress={() => setNovoStatusSel(st)} style={{ backgroundColor: novoStatusSel === st ? theme.primary : theme.card, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: novoStatusSel === st ? theme.primary : theme.border }}>
                            <Text style={{ color: novoStatusSel === st ? '#fff' : theme.subtext, fontSize: 12 }}>{st}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      <TextInput 
                        style={[styles.input, { backgroundColor: theme.card, color: theme.text, width: '100%', height: 60, textAlignVertical: 'top', marginVertical: 10 }]} 
                        placeholder="Nota opcional sobre a mudança..." 
                        placeholderTextColor={theme.subtext} multiline 
                        value={notaStatus} onChangeText={setNotaStatus} 
                      />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Btn title="CANCELAR" outline theme={theme} onPress={() => { setShowStatusModal(false); setNovoStatusSel(''); setNotaStatus(''); }} style={{ flex: 1, marginRight: 5 }} />
                        <Btn title="CONFIRMAR" theme={theme} onPress={alterarStatusChamado} style={{ flex: 1, marginLeft: 5 }} />
                      </View>
                    </View>
                  )}

                  {isChamadoFechado(selectedChamado.status) && (
                    <View style={{ backgroundColor: 'rgba(29, 185, 84, 0.1)', padding: 10, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: theme.primary }}>
                      <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 12 }}>⏱ Tempo de solução: {getTempoResolucao(selectedChamado)}</Text>
                    </View>
                  )}

                  <View style={{ backgroundColor: theme.inputBg, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border, marginBottom: 15 }}>
                    <Text style={{ color: theme.subtext, fontSize: 11, marginBottom: 2 }}>Título / Assunto:</Text>
                    <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>{selectedChamado.titulo || '---'}</Text>
                    
                    <Text style={{ color: theme.subtext, fontSize: 11, marginBottom: 2 }}>Solicitante:</Text>
                    <Text style={{ color: theme.text, fontSize: 14, marginBottom: 8 }}>{selectedChamado.solicitante || 'Não informado'}</Text>

                    <Text style={{ color: theme.subtext, fontSize: 11, marginBottom: 2 }}>Localização (Setor / Sala):</Text>
                    <Text style={{ color: theme.text, fontSize: 14, marginBottom: 8 }}>{selectedChamado.predio} / {selectedChamado.sala || 'Não informada'}</Text>
                    
                    <Text style={{ color: theme.subtext, fontSize: 11, marginBottom: 2 }}>Descrição do Problema:</Text>
                    <Text style={{ color: theme.text, fontSize: 14, marginBottom: selectedChamado.observacao ? 8 : 0 }}>{selectedChamado.descricao}</Text>

                    {selectedChamado.observacao ? (
                      <>
                        <Text style={{ color: theme.subtext, fontSize: 11, marginBottom: 2 }}>Observação Adicional:</Text>
                        <Text style={{ color: theme.text, fontSize: 14 }}>{selectedChamado.observacao}</Text>
                      </>
                    ) : null}
                  </View>
                  
                  <Text style={{ color: theme.subtext, fontSize: 12 }}>Equipamento Vinculado:</Text>
                  <Text style={{ color: theme.text, marginBottom: 10 }}>{selectedChamado.equipamento ? `${selectedChamado.equipamento.nome} - Pat: ${selectedChamado.equipamento.pat}` : 'Não informado'}</Text>
                  
                  <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 5 }}>Documentos Anexados:</Text>
                  <View style={{ marginTop: 5, marginBottom: 10 }}>
                    {(!selectedChamado.anexos || selectedChamado.anexos.length === 0) && (
                      <Text style={{ color: theme.text, fontSize: 12, fontStyle: 'italic' }}>Sem anexos.</Text>
                    )}
                    
                    {selectedChamado.anexos && selectedChamado.anexos.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10, marginTop: 10 }}>
                        {selectedChamado.anexos.map((doc, i) => (
                          <View key={i} style={{ marginRight: 10, marginBottom: 10 }}>
                            {doc.type === 'imagem' ? (
                               <Image source={{ uri: doc.uri }} style={{ width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: theme.border }} />
                            ) : (
                               <View style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: theme.inputBg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
                                 <Text style={{ fontSize: 24, textAlign: 'center' }}>📄</Text>
                                 <Text style={{ fontSize: 8, color: theme.subtext, marginTop: 5, textAlign: 'center' }} numberOfLines={1}>{doc.nome}</Text>
                               </View>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                    
                    {!isChamadoFechado(selectedChamado.status) && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 15 }}>
                        <TouchableOpacity onPress={anexarNoDetalhe} style={{ padding: 10, backgroundColor: theme.inputBg, borderRadius: 8, flex: 1, marginRight: 5, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
                          <Text style={{ color: theme.text, fontSize: 12, fontWeight: 'bold' }}>📎 Arquivo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => abrirCamera('detalhe')} style={{ padding: 10, backgroundColor: theme.primary, borderRadius: 8, flex: 1, marginLeft: 5, alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>📸 Foto</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <Text style={{ color: theme.primary, fontWeight: 'bold', marginTop: 10, marginBottom: 5 }}>📝 Protocolo de Atendimento</Text>
                  <View style={{ backgroundColor: theme.inputBg, padding: 10, borderRadius: 10, marginBottom: 10 }}>
                    {selectedChamado.checklist && selectedChamado.checklist.map((item) => (
                      <TouchableOpacity key={item.id} onPress={() => !isChamadoFechado(selectedChamado.status) && toggleCheck(item.id)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: theme.text, marginRight: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: item.checked ? theme.primary : 'transparent' }}>
                          {item.checked && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                        </View>
                        <Text style={{ color: theme.text, textDecorationLine: item.checked ? 'line-through' : 'none', opacity: item.checked ? 0.5 : 1 }}>{item.text}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {!isChamadoFechado(selectedChamado.status) && (
                    <View style={{ marginTop: 15, marginBottom: 10 }}>
                      <Text style={{ color: theme.primary, fontWeight: 'bold', marginBottom: 5 }}>Solução / Notas (Obrigatório):</Text>
                      <TextInput style={{ backgroundColor: theme.inputBg, color: theme.text, padding: 10, borderRadius: 8, height: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: theme.border }} multiline placeholder="Descreva o que foi feito..." placeholderTextColor={theme.subtext} value={solucao} onChangeText={setSolucao} />
                    </View>
                  )}
                  {msgErro ? <Text style={{ color: '#ff4444', fontWeight: 'bold', textAlign: 'center', marginBottom: 5 }}>{msgErro}</Text> : null}
                  {!isChamadoFechado(selectedChamado.status) && (<Btn title="FECHAR CHAMADO DEFINITIVAMENTE" theme={theme} onPress={fecharChamado} />)}
                </Card>

                <Text style={{ color: theme.primary, marginTop: 10, marginBottom: 5, fontWeight: 'bold' }}>Histórico / Chat</Text>
                
                {!isChamadoFechado(selectedChamado.status) && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 10, maxHeight: 40 }}>
                    {FRASES_RAPIDAS.map((frase, index) => (
                      <TouchableOpacity key={index} style={{ backgroundColor: theme.inputBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, marginRight: 8, borderWidth: 1, borderColor: theme.border }} onPress={() => enviarMensagem(frase)}>
                        <Text style={{ color: theme.text, fontSize: 11 }}>{frase}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {selectedChamado.historico.length === 0 ? (
                  <Text style={{ color: theme.subtext }}>Nenhuma mensagem ainda.</Text>
                ) : (
                  selectedChamado.historico.map((msg, i) => (
                    <View key={i} style={{ alignSelf: msg.user === user.login ? 'flex-end' : msg.user === 'SISTEMA' ? 'center' : 'flex-start', backgroundColor: msg.user === user.login ? theme.messageUser || theme.primary : msg.user === 'SISTEMA' ? theme.border : theme.messageTec || theme.inputBg, padding: 10, borderRadius: 10, marginBottom: 5, maxWidth: '85%' }}>
                      <Text style={{ color: msg.user === user.login ? '#fff' : theme.text, fontSize: 10, fontWeight: 'bold', marginBottom: 2 }}>{msg.user}</Text>
                      <Text style={{ color: msg.user === user.login ? '#fff' : theme.text }}>{msg.texto}</Text>
                      <Text style={{ color: msg.user === user.login ? '#eee' : theme.subtext, fontSize: 8, textAlign: 'right', marginTop: 2 }}>{new Date(msg.time).toLocaleTimeString().slice(0, 5)}</Text>
                    </View>
                  ))
                )}
              </ScrollView>

              {!isChamadoFechado(selectedChamado.status) && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput style={[styles.input, { flex: 1, backgroundColor: theme.inputBg, color: theme.text, marginVertical: 0, marginRight: 10 }]} placeholder="Digite uma mensagem..." value={chatMsg} onChangeText={setChatMsg} />
                  <TouchableOpacity onPress={() => enviarMensagem(null)} style={{ backgroundColor: theme.primary, padding: 12, borderRadius: 12 }}>
                    <Text style={{ color: '#fff' }}>Env</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </Modal>

      <Modal visible={confirmModalVisible} animationType="fade" transparent={true} onRequestClose={() => setConfirmModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: theme.card, borderRadius: 15, padding: 20, width: '100%', maxWidth: 350, borderWidth: 1, borderColor: theme.primary }}>
            <Text style={{ fontSize: 24, marginBottom: 10, textAlign: 'center' }}>🤝</Text>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 }}>Assumir Chamado?</Text>
            <Text style={{ color: theme.subtext, textAlign: 'center', marginBottom: 20 }}>Este chamado sairá da fila do prédio e ficará sob sua responsabilidade.</Text>
            <View style={{ flexDirection: 'row' }}>
              <Btn title="CANCELAR" onPress={() => setConfirmModalVisible(false)} theme={theme} danger style={{ flex: 1, marginRight: 5 }} />
              <Btn title="SIM, ASSUMIR" onPress={confirmarAssumir} theme={theme} style={{ flex: 1, marginLeft: 5 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontWeight: '800', fontSize: 22, marginBottom: 20 },
  input: { padding: 12, marginVertical: 8, borderRadius: 12, width: 250, height: 45, borderWidth: 1, borderColor: 'rgba(140,150,160,0.28)' }
});