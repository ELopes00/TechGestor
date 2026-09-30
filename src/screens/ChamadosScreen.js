import { Camera, CameraView } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Avatar, Badge, Btn, Card, EmptyState, Field, FilterChip, PriorityBadge, SlaBadge, useBreakpoints } from '../components';
import { DataService } from '../services/DataService';
import { RADIUS, SHADOW } from '../theme/themes';
import { CHECKLIST_PADRAO, FRASES_RAPIDAS, PRIORIDADES, SETORES } from '../utils/constants';
import {
  calcularSLA, formatProtocolo, formatTempoRelativo, gerarProtocolo, getPrioridadeVisual,
  getStatusCategoria, getStatusVisual, isChamadoFechado, isSlaVencido,
} from '../utils/helpers';

// STATUS DO FLUXO DE ATENDIMENTO
const STATUS_OPCOES = [
  'Aguardando atendimento', 'Em andamento', 'Em separação de equipamentos', 'Instalado', 'finalizado'
];
const STATUS_LABEL = { finalizado: 'Finalizado' };
const CATEGORIAS = { ABERTO: 'Abertos', ANDAMENTO: 'Em atendimento', CONCLUIDO: 'Concluídos' };

const avisar = (titulo, msg) => {
  if (Platform.OS === 'web') window.alert(`${titulo}\n\n${msg}`);
  else Alert.alert(titulo, msg);
};

export default function ChamadosScreen({ user, chamados, users, inventario, addLog, theme, showPush, filtroStatusInicial, mostrarNovoChamado = true }) {
  const { isMobile, isDesktop, width } = useBreakpoints();

  // CAMPOS DO FORMULÁRIO
  const [tituloChamado, setTituloChamado] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [sala, setSala] = useState('');
  const [observacao, setObservacao] = useState('');
  const [desc, setDesc] = useState('');

  const [setor, setSetor] = useState(SETORES[0]);
  const [tecSel, setTecSel] = useState('');
  const [equipSel, setEquipSel] = useState(null);
  const [prioridade, setPrioridade] = useState('BAIXA');
  const [formAnexos, setFormAnexos] = useState([]);
  const [novoOpen, setNovoOpen] = useState(false);
  const [msgForm, setMsgForm] = useState('');

  const [showTecs, setShowTecs] = useState(false);
  const [showEquips, setShowEquips] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState('TODOS');
  const [filtroStatus, setFiltroStatus] = useState(filtroStatusInicial || 'TODOS');
  const [filtroUnidade, setFiltroUnidade] = useState('TODOS');

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState(null);
  const [chatMsg, setChatMsg] = useState('');
  const [notaInternaMsg, setNotaInternaMsg] = useState('');
  const [transferChamado, setTransferChamado] = useState(null);
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

  useEffect(() => { if (filtroStatusInicial) setFiltroStatus(filtroStatusInicial); }, [filtroStatusInicial]);

  // Mantém o modal de detalhes sincronizado com o Firestore em tempo real.
  useEffect(() => {
    if (!selectedChamado) return;
    const atual = chamados.find((c) => c.id === selectedChamado.id);
    if (atual && atual !== selectedChamado) setSelectedChamado(atual);
  }, [chamados]);

  const registrarLog = (msg) => { if (addLog) addLog(msg); };

  const todosTecnicos = users.filter((u) => u.perfil === 'TECNICO');
  const tecnicosDoSetorAtual = todosTecnicos.filter(u => u.predio === setor);

  const pertenceAba = (c, aba) => {
    if (aba === 'MEUS') return user.perfil === 'ADM' ? true : c.tecnico === user.login;
    const semTecnico = !c.tecnico || c.tecnico === '';
    const mesmoPredio = c.predio === user.predio || user.perfil === 'ADM';
    return semTecnico && mesmoPredio && !isChamadoFechado(c.status);
  };

  const matchStatus = (c) => {
    if (filtroStatus === 'TODOS') return true;
    if (CATEGORIAS[filtroStatus]) return getStatusCategoria(c.status) === filtroStatus;
    return String(c.status || '').toLowerCase() === filtroStatus.toLowerCase();
  };

  const chamadosVisiveis = chamados.filter((c) => {
    const termo = searchText.toLowerCase();
    const matchesSearch = !termo || [c.descricao, c.titulo, c.solicitante, c.tecnico, c.sala, c.predio, c.equipamento?.pat, formatProtocolo(c)]
      .some((v) => String(v || '').toLowerCase().includes(termo));
    const matchesPriority = filtroPrioridade === 'TODOS' ? true : (c.prioridade || 'BAIXA') === filtroPrioridade;
    const matchesUnidade = filtroUnidade === 'TODOS' ? true : c.predio === filtroUnidade;
    return pertenceAba(c, abaAtiva) && matchesSearch && matchesPriority && matchStatus(c) && matchesUnidade;
  });

  const qtdMeus = chamados.filter((c) => pertenceAba(c, 'MEUS') && !isChamadoFechado(c.status)).length;
  const qtdFila = chamados.filter((c) => pertenceAba(c, 'FILA')).length;
  const qtdSlaCritico = chamados.filter((c) => !isChamadoFechado(c.status) && isSlaVencido(c)).length;
  const inicioDia = new Date(); inicioDia.setHours(0, 0, 0, 0);
  const atendimentosHoje = chamados.filter((c) => c.dataAbertura >= inicioDia.getTime()).length;
  const slaGeral = calcularSLA(chamados);

  const toggleSelection = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const bulkExcluir = () => {
    if (selectedIds.length === 0) return;
    if (user.perfil !== 'ADM') return avisar('Erro', 'Apenas Administradores podem excluir chamados.');

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
    if (tecnicosDoSetorAtual.length === 0) return setMsgForm(`Nenhum técnico escalado em ${setor}.`);
    const indiceAleatorio = Math.floor(Math.random() * tecnicosDoSetorAtual.length);
    const tecnicoSorteado = tecnicosDoSetorAtual[indiceAleatorio].login;
    setTecSel(tecnicoSorteado);
    setMsgForm('');
    if (showPush) showPush(`⚡ ${tecnicoSorteado} sorteado para o chamado!`);
  };

  const anexarNoFormulario = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (!result.canceled) {
        const file = result.assets[0];
        setFormAnexos([...formAnexos, { id: Date.now().toString(), nome: file.name, uri: file.uri, type: 'doc' }]);
      }
    } catch (err) { avisar("Erro", "Não foi possível selecionar o arquivo."); }
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
    } catch (err) { avisar("Erro", "Não foi possível anexar."); }
  };

  const abrirCamera = (target) => {
    if (Platform.OS === 'web') return avisar('Aviso', 'A câmera só funciona no aplicativo do celular.');
    if (hasPermission === null) return avisar('Aviso', 'Solicitando permissão da câmera...');
    if (hasPermission === false) return avisar('Erro', 'Sem acesso à câmera.');
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
      return setMsgForm('Preencha os campos obrigatórios: Chamado, Solicitante, Sala e Descrição.');
    }
    if (isSavingChamado) return;

    setIsSavingChamado(true);
    setMsgForm('');
    const novoChamado = {
      protocolo: gerarProtocolo(),
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

      setTituloChamado(''); setSolicitante(''); setSala(''); setObservacao(''); setDesc('');
      setSetor(SETORES[0]); setTecSel(''); setPrioridade('BAIXA'); setEquipSel(null); setFormAnexos([]);
      setNovoOpen(false);
    } catch (e) { setMsgForm('Falha ao salvar chamado. Tente novamente.'); } finally { setIsSavingChamado(false); }
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

    const tituloResumo = selectedChamado.titulo || `Chamado #${selectedChamado.id.substring(0,4)}`;
    const corpoMsg = msgFinal.length > 80 ? `${msgFinal.substring(0, 80)}...` : msgFinal;
    const destinatarios = user.perfil === 'ADM'
      ? users.filter(u => u.login === selectedChamado.tecnico)
      : users.filter(u => u.perfil === 'ADM');

    destinatarios.forEach(dest => {
      if (dest.expoPushToken && DataService.enviarPushNotification) {
        DataService.enviarPushNotification(dest.expoPushToken, `💬 Nova mensagem - ${tituloResumo}`, `${user.login}: ${corpoMsg}`).catch(e => console.log(e));
      }
    });
  };

  const enviarNotaInterna = async () => {
    if (!notaInternaMsg.trim()) return;
    const novaNota = { user: user.login, texto: notaInternaMsg, time: Date.now() };
    const novasNotas = [novaNota, ...(selectedChamado.notasInternas || [])];

    await DataService.atualizarChamado(selectedChamado.id, { notasInternas: novasNotas });
    setSelectedChamado({ ...selectedChamado, notasInternas: novasNotas });
    registrarLog(`🗒️ ADICIONOU NOTA INTERNA NO CHAMADO #${selectedChamado.id.substring(0,4)}`);
    setNotaInternaMsg('');
  };

  const transferirChamado = async (chamadoId, tecnicoAtual, novoTecnico, novoPredio) => {
    const chamadoTarget = chamados.find(c => c.id === chamadoId);
    const destinoStr = novoTecnico ? novoTecnico : `Fila (${novoPredio})`;
    const msgSistema = { user: 'SISTEMA', texto: `🔄 Transferido para ${destinoStr}`, time: Date.now() };

    setTransferChamado(null);
    await DataService.atualizarChamado(chamadoId, {
      tecnico: novoTecnico,
      predio: novoPredio || chamadoTarget.predio,
      status: novoTecnico ? 'Em andamento' : 'Aguardando atendimento',
      historico: [msgSistema, ...(chamadoTarget.historico || [])]
    });
    registrarLog(`🔄 TRANSFERIU CHAMADO PARA ${destinoStr}`);
    if (showPush) showPush(`Chamado transferido para ${destinoStr}`);
  };

  const alterarStatusChamado = async () => {
    if (!novoStatusSel) return;
    if (novoStatusSel === 'finalizado' || novoStatusSel === 'FECHADO') {
      setShowStatusModal(false);
      return setMsgErro('Para finalizar, descreva a solução abaixo e toque em FECHAR CHAMADO.');
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
    if (!solucao || solucao.trim().length === 0) return setMsgErro("Descreva a solução antes de fechar o chamado.");
    try {
      const msgFechamento = { user: 'SISTEMA', texto: `🏁 CHAMADO FINALIZADO POR ${user.login}.\n📝 SOLUÇÃO: ${solucao}`, time: Date.now() };
      const tecnicoFinal = selectedChamado.tecnico ? selectedChamado.tecnico : user.login;

      setModalVisible(false);
      if (showPush) showPush("🏁 Chamado Finalizado!");

      await DataService.atualizarChamado(selectedChamado.id, {
        status: 'finalizado', tecnico: tecnicoFinal, dataFechamento: Date.now(), historico: [msgFechamento, ...(selectedChamado.historico || [])], checklist: selectedChamado.checklist || []
      });

      registrarLog(`✅ FECHOU CHAMADO #${selectedChamado.id.substring(0,4)}`);
      setSolucao(''); setMsgErro('');
    } catch (error) { avisar("Erro", "Falha ao fechar no banco."); }
  };

  const toggleCheck = async (idCheck) => {
    const novoChecklist = selectedChamado.checklist.map((item) => item.id === idCheck ? { ...item, checked: !item.checked } : item);
    await DataService.atualizarChamado(selectedChamado.id, { checklist: novoChecklist });
    setSelectedChamado({ ...selectedChamado, checklist: novoChecklist });
  };

  const abrirModalDetalhes = (c) => { setSelectedChamado(c); setMsgErro(''); setSolucao(''); setModalVisible(true); setShowStatusModal(false); };

  const handleExcluir = (id) => {
    if (user.perfil !== 'ADM') return avisar('Acesso Negado', 'Apenas Administradores podem excluir chamados.');
    const acao = () => {
      setModalVisible(false);
      DataService.deletarChamado(id).catch(e => console.log(e));
      registrarLog(`🗑️ EXCLUIU CHAMADO #${id.substring(0,4)}`);
      if (showPush) showPush("🗑️ Chamado apagado.");
    };
    if (Platform.OS === 'web') { if (window.confirm("Deseja apagar este chamado permanentemente?")) acao(); }
    else { Alert.alert("Excluir", "Deseja apagar este chamado permanentemente?", [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: acao }]); }
  };

  const getTempoResolucao = (chamado) => {
    const msgFinal = chamado.historico?.find(h => h.texto?.includes('CHAMADO FINALIZADO') || h.texto?.includes('CHAMADO FECHADO') || h.texto?.includes('Status atualizado: finalizado'));
    const endTime = chamado.dataFechamento || msgFinal?.time;
    if (endTime && chamado.dataAbertura) {
      const diff = endTime - chamado.dataAbertura;
      const horas = Math.floor(diff / (1000 * 60 * 60));
      const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const dataFormatada = new Date(endTime).toLocaleString('pt-BR');
      return `${dataFormatada} (levou ${horas}h ${minutos}m)`;
    }
    return 'Indisponível';
  };

  const cols = width >= 1400 ? 3 : width >= 900 ? 2 : 1;
  const unidades = ['TODOS', ...SETORES];

  const trocarAba = (aba) => { setAbaAtiva(aba); setIsSelectMode(false); setSelectedIds([]); };

  // ---------------------------------------------------------------- CARD
  const ChamadoCard = ({ c }) => {
    const fechado = isChamadoFechado(c.status);
    const vencido = !fechado && isSlaVencido(c);
    const isSelected = selectedIds.includes(c.id);
    const prio = getPrioridadeVisual(c.prioridade);
    const st = getStatusVisual(c.status);
    const corBorda = fechado ? theme.neutral : vencido || c.prioridade === 'ALTA' || c.prioridade === 'CRITICA' ? theme.offline : c.prioridade === 'MEDIA' ? theme.primary : st.dot === '#1a9c5c' ? theme.online : theme.neutral;
    const tecnicoObj = users.find((u) => u.login === c.tecnico);

    return (
      <View style={{ width: `${100 / cols}%`, paddingHorizontal: 8, marginBottom: 16 }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => { if (isSelectMode) toggleSelection(c.id); else abrirModalDetalhes(c); }}
          style={[styles.ticketCard, { backgroundColor: theme.card, borderColor: isSelected ? theme.primary : theme.border, borderLeftColor: corBorda }, SHADOW.sm]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
              {(isSelectMode || user.perfil === 'ADM' || abaAtiva === 'FILA') && (
                <TouchableOpacity
                  onPress={() => { if (!isSelectMode) setIsSelectMode(true); toggleSelection(c.id); }}
                  hitSlop={8}
                  style={[styles.checkbox, { borderColor: isSelected ? theme.primary : theme.textCode, backgroundColor: isSelected ? theme.primary : 'transparent' }]}
                >
                  {isSelected && <MaterialIcons name="check" size={13} color="#fff" />}
                </TouchableOpacity>
              )}
              <Text style={{ color: theme.subtext, fontSize: 14, fontWeight: '600', letterSpacing: 0.3 }}>{formatProtocolo(c)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {vencido && <SlaBadge />}
              <Badge label={prio.label} color={prio.color} bg={prio.bg} border={prio.border} />
            </View>
          </View>

          <Text style={{ color: theme.text, fontSize: 17, fontWeight: '600', marginTop: 12, letterSpacing: -0.2 }} numberOfLines={2}>{c.titulo || c.descricao}</Text>
          <View style={styles.metaRow}>
            <MaterialIcons name="account-circle" size={15} color={theme.subtext} />
            <Text style={[styles.metaText, { color: theme.subtext }]} numberOfLines={1}>{c.solicitante || 'Solicitante não informado'}</Text>
          </View>
          <View style={styles.metaRow}>
            <MaterialIcons name="location-on" size={15} color={theme.subtext} />
            <Text style={[styles.metaText, { color: theme.subtext }]} numberOfLines={1}>{c.sala ? `${c.sala} - ` : ''}{c.predio}</Text>
          </View>
          {c.equipamento && (
            <View style={styles.metaRow}>
              <MaterialIcons name="computer" size={15} color={theme.primary} />
              <Text style={[styles.metaText, { color: theme.primary }]} numberOfLines={1}>{c.equipamento.nome} ({c.equipamento.pat})</Text>
            </View>
          )}

          <View style={[styles.statusStrip, { backgroundColor: st.bg }]}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: st.dot, marginRight: 8 }} />
            <Text style={{ color: st.color === '#64748b' ? theme.text : st.color, fontSize: 13, fontWeight: '500', flex: 1 }} numberOfLines={2}>Status: {STATUS_LABEL[c.status] || c.status || 'Aguardando atendimento'}</Text>
            <Text style={{ color: theme.subtext, fontSize: 12, marginLeft: 8 }}>{formatTempoRelativo(c.dataAbertura)}</Text>
          </View>

          <View style={[styles.cardFoot, { borderTopColor: theme.border }]}>
            <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '500' }}>Toque para detalhes ›</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {abaAtiva === 'FILA' && !fechado && (
                <TouchableOpacity onPress={() => prepararAssumir(c.id)} style={[styles.footBtn, { backgroundColor: theme.successWash, borderColor: theme.online + '55' }]}>
                  <MaterialIcons name="pan-tool" size={13} color={theme.online} />
                  <Text style={{ color: theme.online, fontSize: 12, fontWeight: '700', marginLeft: 5 }}>Assumir</Text>
                </TouchableOpacity>
              )}
              {!fechado && (
                <TouchableOpacity onPress={() => setTransferChamado(c)} style={[styles.footBtn, { backgroundColor: theme.cardAlt, borderColor: theme.cardAlt }]}>
                  <MaterialIcons name="swap-horiz" size={15} color={theme.text} />
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '500', marginLeft: 4 }}>Transferir</Text>
                </TouchableOpacity>
              )}
              {c.tecnico ? (
                <Avatar nome={tecnicoObj?.nomeCompleto || c.tecnico} size={32} theme={theme} color={fechado ? theme.primaryStrong : st.dot === '#1a9c5c' ? '#1a9c5c' : theme.primaryStrong} />
              ) : (
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: theme.subtext, fontWeight: '700', fontSize: 12 }}>--</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: isMobile ? 16 : 24 }} keyboardShouldPersistTaps="handled">

        {/* CABEÇALHO */}
        <Card theme={theme} style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: isMobile ? undefined : 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <Text style={{ color: theme.primaryStrong, fontSize: 12.5, fontWeight: '700', letterSpacing: 0.9 }}>TJRR • DITEC • CENTRAL DE CHAMADOS</Text>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.neutral, marginHorizontal: 10, opacity: 0.6 }} />
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: theme.online, marginRight: 6 }} />
              <Text style={{ color: theme.online, fontSize: 12.5 }}>SLA Operacional em {slaGeral == null ? '—' : `${slaGeral}%`}</Text>
            </View>
            <Text style={{ color: theme.text, fontSize: isMobile ? 21 : 26, fontWeight: '600', marginTop: 6, letterSpacing: -0.4 }}>Gestão de Incidentes e Requisições Técnicas</Text>
          </View>
          <Btn theme={theme} variant="soft" icon="add-task" title="+ Novo chamado" onPress={() => { setMsgForm(''); setNovoOpen(true); }} style={{ marginTop: isMobile ? 14 : 0, marginLeft: isMobile ? 0 : 16, height: 46 }} />
        </Card>

        {/* ABAS + INDICADORES */}
        <View style={[styles.tabsRow, { borderBottomColor: theme.border, flexDirection: isDesktop ? 'row' : 'column', alignItems: isDesktop ? 'center' : 'flex-start' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => trocarAba('MEUS')} style={[styles.tab, abaAtiva === 'MEUS' && { backgroundColor: theme.primary }, abaAtiva === 'MEUS' && SHADOW.glow]} activeOpacity={0.8}>
              <MaterialIcons name="assignment-ind" size={18} color={abaAtiva === 'MEUS' ? '#fff' : theme.text} />
              <Text style={[styles.tabText, { color: abaAtiva === 'MEUS' ? '#fff' : theme.text }]}>{user.perfil === 'ADM' ? 'TODOS OS CHAMADOS' : 'MEUS CHAMADOS'}</Text>
              <View style={[styles.tabCount, { backgroundColor: abaAtiva === 'MEUS' ? '#fff' : theme.cardAlt }]}>
                <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '700' }}>{qtdMeus}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => trocarAba('FILA')} style={[styles.tab, abaAtiva === 'FILA' && { backgroundColor: theme.primary }, abaAtiva === 'FILA' && SHADOW.glow]} activeOpacity={0.8}>
              <MaterialIcons name="call-split" size={18} color={abaAtiva === 'FILA' ? '#fff' : theme.text} />
              <Text style={[styles.tabText, { color: abaAtiva === 'FILA' ? '#fff' : theme.text }]}>FILA {user.perfil === 'ADM' ? 'GERAL' : `(${user.predio || 'Geral'})`}</Text>
              <View style={[styles.tabCount, { backgroundColor: abaAtiva === 'FILA' ? '#fff' : theme.cardAlt }]}>
                <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '700' }}>{qtdFila}</Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: isDesktop ? 0 : 12 }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: theme.offline, marginRight: 8 }} />
            <Text style={{ color: theme.text, fontSize: 13.5 }}>Alerta SLA crítico: <Text style={{ fontWeight: '700' }}>{qtdSlaCritico}</Text></Text>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: theme.neutral, marginHorizontal: 12 }} />
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: theme.online, marginRight: 8 }} />
            <Text style={{ color: theme.text, fontSize: 13.5 }}>Atendimentos hoje: <Text style={{ fontWeight: '700' }}>{atendimentosHoje}</Text></Text>
          </View>
        </View>

        {/* SELEÇÃO EM LOTE */}
        {isSelectMode && (
          <View style={[styles.bulkBar, { backgroundColor: theme.shellBg }]}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{selectedIds.length} selecionado(s)</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {abaAtiva === 'FILA' && selectedIds.length > 0 && (
                <TouchableOpacity onPress={bulkAssumir} style={[styles.bulkBtn, { backgroundColor: theme.online }]}>
                  <Text style={styles.bulkBtnText}>ASSUMIR</Text>
                </TouchableOpacity>
              )}
              {user.perfil === 'ADM' && selectedIds.length > 0 && (
                <TouchableOpacity onPress={bulkExcluir} style={[styles.bulkBtn, { backgroundColor: theme.offline }]}>
                  <Text style={styles.bulkBtnText}>EXCLUIR</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => { setIsSelectMode(false); setSelectedIds([]); }} style={[styles.bulkBtn, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                <Text style={styles.bulkBtnText}>CANCELAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* BUSCA E FILTROS */}
        <Card theme={theme}>
          <View style={[styles.searchBar, { backgroundColor: theme.cardAlt }]}>
            <MaterialIcons name="search" size={21} color={theme.subtext} />
            <TextInput
              style={[{ flex: 1, color: theme.text, fontSize: 14.5, marginLeft: 10, height: 46 }, Platform.OS === 'web' && { outlineStyle: 'none' }]}
              placeholder="Buscar por protocolo, solicitante, sala ou tombamento TJRR..."
              placeholderTextColor={theme.textCode}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText ? (
              <TouchableOpacity onPress={() => setSearchText('')}><MaterialIcons name="close" size={20} color={theme.subtext} /></TouchableOpacity>
            ) : null}
          </View>

          <FiltroLinha theme={theme} label="STATUS" isMobile={isMobile}>
            <FilterChip theme={theme} label="Todos" active={filtroStatus === 'TODOS'} onPress={() => setFiltroStatus('TODOS')} />
            {CATEGORIAS[filtroStatus] && <FilterChip theme={theme} label={CATEGORIAS[filtroStatus]} active onPress={() => setFiltroStatus('TODOS')} />}
            {STATUS_OPCOES.map((s) => (
              <FilterChip key={s} theme={theme} label={STATUS_LABEL[s] || s} active={filtroStatus === s} onPress={() => setFiltroStatus(s)} />
            ))}
          </FiltroLinha>
          <FiltroLinha theme={theme} label="PRIORIDADE" isMobile={isMobile}>
            <FilterChip theme={theme} label="Todas" active={filtroPrioridade === 'TODOS'} onPress={() => setFiltroPrioridade('TODOS')} />
            {[...PRIORIDADES].reverse().map((p) => (
              <FilterChip key={p} theme={theme} label={getPrioridadeVisual(p).label} active={filtroPrioridade === p} onPress={() => setFiltroPrioridade(p)} />
            ))}
          </FiltroLinha>
          <FiltroLinha theme={theme} label="UNIDADE" isMobile={isMobile} last>
            {unidades.map((u) => (
              <FilterChip key={u} theme={theme} label={u === 'TODOS' ? 'Todas' : u} active={filtroUnidade === u} onPress={() => setFiltroUnidade(u)} />
            ))}
          </FiltroLinha>
        </Card>

        {/* GRID DE CHAMADOS */}
        {chamadosVisiveis.length === 0 ? (
          <Card theme={theme}><EmptyState theme={theme} icon="inbox" text="Nenhum chamado encontrado com os filtros atuais." /></Card>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
            {chamadosVisiveis.map((c) => <ChamadoCard key={c.id} c={c} />)}
          </View>
        )}
      </ScrollView>

      {/* CÂMERA */}
      <Modal visible={isCameraOpen} animationType="slide" transparent={false} onRequestClose={() => setIsCameraOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
            <View style={{ flex: 1, backgroundColor: 'transparent', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingBottom: 40 }}>
              <TouchableOpacity onPress={() => setIsCameraOpen(false)} style={{ backgroundColor: '#333', padding: 15, borderRadius: 50, width: 80, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 12 }}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={tirarFoto} style={{ backgroundColor: '#fff', width: 70, height: 70, borderRadius: 35, borderWidth: 5, borderColor: theme.primary }} />
              <View style={{ width: 80 }} />
            </View>
          </CameraView>
        </View>
      </Modal>

      {/* NOVO CHAMADO */}
      <Modal visible={novoOpen} animationType="fade" transparent onRequestClose={() => setNovoOpen(false)}>
        <View style={[styles.modalBg, { backgroundColor: theme.overlay, justifyContent: isMobile ? 'flex-end' : 'center' }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.background, borderColor: theme.border, maxWidth: 720, height: isMobile ? '94%' : '90%', borderBottomLeftRadius: isMobile ? 0 : RADIUS.lg, borderBottomRightRadius: isMobile ? 0 : RADIUS.lg }, SHADOW.lg]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
              <View>
                <Text style={{ color: theme.primary, fontSize: 11.5, fontWeight: '700', letterSpacing: 0.8 }}>CENTRAL DE CHAMADOS</Text>
                <Text style={{ color: theme.text, fontSize: 19, fontWeight: '600', marginTop: 2 }}>Registrar novo chamado</Text>
              </View>
              <TouchableOpacity onPress={() => setNovoOpen(false)} style={styles.closeBtn}><MaterialIcons name="close" size={22} color={theme.subtext} /></TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <Field theme={theme} label="Chamado (assunto principal) *" icon="title" value={tituloChamado} onChangeText={setTituloChamado} placeholder="Ex.: Falha de conexão com o PJe" />
              <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 0 : 12 }}>
                <Field theme={theme} style={{ flex: 1 }} label="Solicitante *" icon="person-outline" value={solicitante} onChangeText={setSolicitante} placeholder="Nome e cargo" />
                <Field theme={theme} style={{ flex: 1 }} label="Sala *" icon="meeting-room" value={sala} onChangeText={setSala} placeholder="Ex.: Gabinete 302" />
              </View>
              <Field theme={theme} label="Descrição do problema *" icon="description" value={desc} onChangeText={setDesc} placeholder="O que está acontecendo?" />
              <Field theme={theme} label="Observação (opcional)" multiline value={observacao} onChangeText={setObservacao} placeholder="Informações adicionais" />

              <Text style={[styles.formLabel, { color: theme.subtext }]}>UNIDADE</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
                {SETORES.map((s) => <FilterChip key={s} theme={theme} label={s} active={setor === s} onPress={() => { setSetor(s); setTecSel(''); }} />)}
              </View>

              <Text style={[styles.formLabel, { color: theme.subtext }]}>PRIORIDADE</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
                {PRIORIDADES.map((p) => {
                  const v = getPrioridadeVisual(p);
                  const ativo = prioridade === p;
                  return (
                    <TouchableOpacity key={p} onPress={() => setPrioridade(p)} style={[styles.prioBtn, { backgroundColor: ativo ? (p === 'CRITICA' ? v.bg : v.color === '#64748b' ? '#64748b' : v.color) : theme.card, borderColor: ativo ? 'transparent' : theme.border }]}>
                      <Text style={{ color: ativo ? '#fff' : v.color, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 }}>{v.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.formLabel, { color: theme.subtext }]}>TÉCNICO RESPONSÁVEL</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <TouchableOpacity onPress={() => setShowTecs(!showTecs)} style={[styles.selectBox, { backgroundColor: theme.inputBg, borderColor: theme.border, flex: 1 }]}>
                  <MaterialIcons name="engineering" size={18} color={theme.subtext} />
                  <Text style={{ color: tecSel ? theme.text : theme.textCode, marginLeft: 8, flex: 1 }}>{tecSel || `Deixar na fila de ${setor}`}</Text>
                  <MaterialIcons name={showTecs ? 'expand-less' : 'expand-more'} size={20} color={theme.subtext} />
                </TouchableOpacity>
                <TouchableOpacity onPress={autoEscalar} style={[styles.autoBtn, { backgroundColor: theme.primarySoft, borderColor: theme.primaryBorder }]}>
                  <MaterialIcons name="bolt" size={18} color={theme.primary} />
                  {!isMobile && <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 12, letterSpacing: 0.6, marginLeft: 4 }}>AUTO</Text>}
                </TouchableOpacity>
              </View>
              {showTecs && (
                <View style={[styles.dropList, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <TouchableOpacity style={[styles.dropItem, { borderBottomColor: theme.border }]} onPress={() => { setTecSel(''); setShowTecs(false); }}>
                    <Text style={{ color: theme.subtext }}>Sem técnico (fila da unidade)</Text>
                  </TouchableOpacity>
                  {tecnicosDoSetorAtual.length === 0 && <Text style={{ color: theme.subtext, padding: 12, fontStyle: 'italic' }}>Nenhum técnico escalado em {setor}.</Text>}
                  {tecnicosDoSetorAtual.map((t) => (
                    <TouchableOpacity key={t.login} style={[styles.dropItem, { borderBottomColor: theme.border }]} onPress={() => { setTecSel(t.login); setShowTecs(false); }}>
                      <Avatar nome={t.nomeCompleto || t.login} size={26} theme={theme} />
                      <Text style={{ color: theme.text, marginLeft: 10 }}>{t.nomeCompleto || t.login} <Text style={{ color: theme.subtext }}>@{t.login}</Text></Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.formLabel, { color: theme.subtext }]}>EQUIPAMENTO VINCULADO</Text>
              <TouchableOpacity onPress={() => setShowEquips(!showEquips)} style={[styles.selectBox, { backgroundColor: theme.inputBg, borderColor: theme.border, marginBottom: 6 }]}>
                <MaterialIcons name="computer" size={18} color={theme.subtext} />
                <Text style={{ color: equipSel ? theme.text : theme.textCode, marginLeft: 8, flex: 1 }} numberOfLines={1}>{equipSel ? `${equipSel.nome} (${equipSel.pat})` : 'Nenhum equipamento'}</Text>
                <MaterialIcons name={showEquips ? 'expand-less' : 'expand-more'} size={20} color={theme.subtext} />
              </TouchableOpacity>
              {showEquips && (
                <ScrollView style={[styles.dropList, { backgroundColor: theme.card, borderColor: theme.border, maxHeight: 220 }]} nestedScrollEnabled>
                  <TouchableOpacity style={[styles.dropItem, { borderBottomColor: theme.border }]} onPress={() => { setEquipSel(null); setShowEquips(false); }}>
                    <Text style={{ color: theme.subtext }}>Nenhum equipamento</Text>
                  </TouchableOpacity>
                  {inventario.map((i) => (
                    <TouchableOpacity key={i.id} style={[styles.dropItem, { borderBottomColor: theme.border }]} onPress={() => { setEquipSel(i); setShowEquips(false); }}>
                      <Text style={{ color: theme.text }}>{i.nome} <Text style={{ color: theme.subtext }}>• {i.pat}</Text></Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <Text style={[styles.formLabel, { color: theme.subtext }]}>ANEXOS</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn theme={theme} variant="outline" icon="attach-file" title="Arquivo" onPress={anexarNoFormulario} style={{ flex: 1, marginTop: 0 }} />
                <Btn theme={theme} variant="outline" icon="photo-camera" title="Foto" onPress={() => abrirCamera('form')} style={{ flex: 1, marginTop: 0 }} />
              </View>
              {formAnexos.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
                  {formAnexos.map((doc, index) => (
                    <View key={index} style={{ marginRight: 10, marginBottom: 10 }}>
                      {doc.type === 'imagem' ? (
                        <Image source={{ uri: doc.uri }} style={[styles.thumb, { borderColor: theme.border }]} />
                      ) : (
                        <View style={[styles.thumb, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
                          <MaterialIcons name="description" size={22} color={theme.subtext} />
                          <Text style={{ fontSize: 9, color: theme.subtext, marginTop: 4, paddingHorizontal: 4 }} numberOfLines={1}>{doc.nome}</Text>
                        </View>
                      )}
                      <TouchableOpacity onPress={() => setFormAnexos(formAnexos.filter((_, i) => i !== index))} style={styles.removeThumb}>
                        <MaterialIcons name="close" size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
              {msgForm ? <Text style={{ color: theme.offline, fontSize: 12.5, marginBottom: 8 }}>{msgForm}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn theme={theme} variant="outline" title="Cancelar" onPress={() => setNovoOpen(false)} style={{ flex: 1, marginTop: 0 }} />
                <Btn theme={theme} icon="send" title={isSavingChamado ? 'Registrando...' : 'Abrir chamado'} onPress={abrir} disabled={isSavingChamado} style={{ flex: 2, marginTop: 0 }} />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* TRANSFERÊNCIA */}
      <Modal visible={!!transferChamado} animationType="fade" transparent onRequestClose={() => setTransferChamado(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setTransferChamado(null)} style={[styles.modalBg, { backgroundColor: theme.overlay, justifyContent: 'center', padding: 20 }]}>
          <TouchableOpacity activeOpacity={1} style={[styles.smallModal, { backgroundColor: theme.surface, borderColor: theme.border }, SHADOW.lg]}>
            {transferChamado && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontSize: 17, fontWeight: '600' }}>Transferir chamado</Text>
                    <Text style={{ color: theme.subtext, fontSize: 12.5, marginTop: 2 }} numberOfLines={1}>{formatProtocolo(transferChamado)} • {transferChamado.titulo || transferChamado.descricao}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setTransferChamado(null)} style={styles.closeBtn}><MaterialIcons name="close" size={20} color={theme.subtext} /></TouchableOpacity>
                </View>
                <Text style={[styles.formLabel, { color: theme.subtext }]}>PARA A FILA DA UNIDADE</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {SETORES.map((s) => <FilterChip key={s} theme={theme} label={s} active={false} onPress={() => transferirChamado(transferChamado.id, transferChamado.tecnico, '', s)} />)}
                </View>
                <Text style={[styles.formLabel, { color: theme.subtext }]}>OU DIRETO PARA UM TÉCNICO</Text>
                <ScrollView style={{ maxHeight: 260 }}>
                  {todosTecnicos.filter((t) => t.login !== transferChamado.tecnico).map((t) => (
                    <TouchableOpacity key={t.login} style={[styles.dropItem, { borderBottomColor: theme.border }]} onPress={() => transferirChamado(transferChamado.id, transferChamado.tecnico, t.login, t.predio)}>
                      <Avatar nome={t.nomeCompleto || t.login} size={30} theme={theme} />
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={{ color: theme.text, fontWeight: '600' }}>{t.nomeCompleto || t.login}</Text>
                        <Text style={{ color: theme.subtext, fontSize: 12 }}>@{t.login} • {t.predio}</Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={20} color={theme.subtext} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* DETALHES DO CHAMADO */}
      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
        {selectedChamado && (() => {
          const fechado = isChamadoFechado(selectedChamado.status);
          const historico = selectedChamado.historico || [];
          const st = getStatusVisual(selectedChamado.status);
          return (
            <View style={[styles.modalBg, { backgroundColor: theme.overlay, justifyContent: isMobile ? 'flex-end' : 'center' }]}>
              <View style={[styles.modalCard, { backgroundColor: theme.background, borderColor: theme.border, maxWidth: 820, height: isMobile ? '94%' : '92%', borderBottomLeftRadius: isMobile ? 0 : RADIUS.lg, borderBottomRightRadius: isMobile ? 0 : RADIUS.lg }, SHADOW.lg]}>
                <View style={[styles.modalHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '700', letterSpacing: 0.4 }}>{formatProtocolo(selectedChamado)}</Text>
                      <PriorityBadge prioridade={selectedChamado.prioridade} />
                      {!fechado && isSlaVencido(selectedChamado) && <SlaBadge />}
                    </View>
                    <Text style={{ color: theme.text, fontSize: 19, fontWeight: '600', marginTop: 4 }} numberOfLines={2}>{selectedChamado.titulo || selectedChamado.descricao}</Text>
                  </View>
                  {user.perfil === 'ADM' && (
                    <TouchableOpacity onPress={() => handleExcluir(selectedChamado.id)} style={styles.closeBtn}><MaterialIcons name="delete-outline" size={21} color={theme.offline} /></TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}><MaterialIcons name="close" size={22} color={theme.subtext} /></TouchableOpacity>
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: isMobile ? 14 : 20 }} keyboardShouldPersistTaps="handled">
                  {/* STATUS */}
                  <Card theme={theme}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                      <View style={[styles.statusStrip, { backgroundColor: st.bg, marginTop: 0, flex: 1 }]}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: st.dot, marginRight: 8 }} />
                        <Text style={{ color: theme.text, fontWeight: '600' }}>Status: {STATUS_LABEL[selectedChamado.status] || selectedChamado.status}</Text>
                      </View>
                      {!fechado && (
                        <Btn theme={theme} variant="soft" icon="published-with-changes" title="Mudar status" compact onPress={() => setShowStatusModal(!showStatusModal)} style={{ marginTop: 0 }} />
                      )}
                    </View>

                    {showStatusModal && (
                      <View style={[styles.innerBox, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
                        <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 10 }}>Alterar status para:</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                          {STATUS_OPCOES.map((s) => <FilterChip key={s} theme={theme} label={STATUS_LABEL[s] || s} active={novoStatusSel === s} onPress={() => setNovoStatusSel(s)} />)}
                        </View>
                        <Field theme={theme} multiline value={notaStatus} onChangeText={setNotaStatus} placeholder="Nota opcional sobre a mudança..." style={{ marginTop: 6 }} />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <Btn title="Cancelar" variant="outline" theme={theme} onPress={() => { setShowStatusModal(false); setNovoStatusSel(''); setNotaStatus(''); }} style={{ flex: 1, marginTop: 0 }} />
                          <Btn title="Confirmar" theme={theme} onPress={alterarStatusChamado} style={{ flex: 1, marginTop: 0 }} />
                        </View>
                      </View>
                    )}

                    {fechado && (
                      <View style={[styles.innerBox, { backgroundColor: theme.successWash, borderColor: theme.online + '40' }]}>
                        <Text style={{ color: theme.online, fontWeight: '600', fontSize: 13 }}>Encerrado em {getTempoResolucao(selectedChamado)}</Text>
                      </View>
                    )}

                    <View style={{ flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', marginTop: 16 }}>
                      <InfoItem theme={theme} icon="account-circle" label="Solicitante" valor={selectedChamado.solicitante || 'Não informado'} />
                      <InfoItem theme={theme} icon="location-on" label="Unidade / Sala" valor={`${selectedChamado.predio} / ${selectedChamado.sala || 'Não informada'}`} />
                      <InfoItem theme={theme} icon="engineering" label="Técnico" valor={selectedChamado.tecnico || 'Aguardando técnico'} />
                      <InfoItem theme={theme} icon="schedule" label="Aberto" valor={`${selectedChamado.dataAbertura ? new Date(selectedChamado.dataAbertura).toLocaleString('pt-BR') : '—'}${selectedChamado.abertoPor ? ` por ${selectedChamado.abertoPor}` : ''}`} />
                      <InfoItem theme={theme} icon="computer" label="Equipamento" valor={selectedChamado.equipamento ? `${selectedChamado.equipamento.nome} • Pat. ${selectedChamado.equipamento.pat}` : 'Não informado'} />
                    </View>

                    <View style={[styles.innerBox, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
                      <Text style={[styles.formLabel, { color: theme.subtext, marginTop: 0 }]}>DESCRIÇÃO DO PROBLEMA</Text>
                      <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20 }}>{selectedChamado.descricao}</Text>
                      {selectedChamado.observacao ? (
                        <>
                          <Text style={[styles.formLabel, { color: theme.subtext }]}>OBSERVAÇÃO</Text>
                          <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20 }}>{selectedChamado.observacao}</Text>
                        </>
                      ) : null}
                    </View>

                    {/* ANEXOS */}
                    <Text style={[styles.formLabel, { color: theme.subtext }]}>DOCUMENTOS ANEXADOS</Text>
                    {(!selectedChamado.anexos || selectedChamado.anexos.length === 0) ? (
                      <Text style={{ color: theme.subtext, fontSize: 13, fontStyle: 'italic' }}>Sem anexos.</Text>
                    ) : (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {selectedChamado.anexos.map((doc, i) => (
                          <View key={i} style={{ marginRight: 10, marginBottom: 10 }}>
                            {doc.type === 'imagem' ? (
                              <Image source={{ uri: doc.uri }} style={[styles.thumb, { width: 84, height: 84, borderColor: theme.border }]} />
                            ) : (
                              <View style={[styles.thumb, { width: 84, height: 84, backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
                                <MaterialIcons name="description" size={24} color={theme.subtext} />
                                <Text style={{ fontSize: 9, color: theme.subtext, marginTop: 5, paddingHorizontal: 4 }} numberOfLines={1}>{doc.nome}</Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                    {!fechado && (
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                        <Btn theme={theme} variant="outline" icon="attach-file" title="Arquivo" compact onPress={anexarNoDetalhe} style={{ flex: 1, marginTop: 0 }} />
                        <Btn theme={theme} variant="outline" icon="photo-camera" title="Foto" compact onPress={() => abrirCamera('detalhe')} style={{ flex: 1, marginTop: 0 }} />
                      </View>
                    )}
                  </Card>

                  {/* CHECKLIST + FECHAMENTO */}
                  <Card theme={theme}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <MaterialIcons name="checklist" size={18} color={theme.primary} style={{ marginRight: 8 }} />
                      <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15 }}>Protocolo de atendimento</Text>
                    </View>
                    {(selectedChamado.checklist || []).map((item) => (
                      <TouchableOpacity key={item.id} onPress={() => !fechado && toggleCheck(item.id)} style={styles.checkRow} activeOpacity={0.7}>
                        <View style={[styles.checkbox, { borderColor: item.checked ? theme.primary : theme.textCode, backgroundColor: item.checked ? theme.primary : 'transparent' }]}>
                          {item.checked && <MaterialIcons name="check" size={13} color="#fff" />}
                        </View>
                        <Text style={{ color: theme.text, textDecorationLine: item.checked ? 'line-through' : 'none', opacity: item.checked ? 0.55 : 1 }}>{item.text}</Text>
                      </TouchableOpacity>
                    ))}

                    {!fechado && (
                      <>
                        <Field theme={theme} label="Solução / notas (obrigatório para fechar)" multiline value={solucao} onChangeText={(t) => { setSolucao(t); if (msgErro) setMsgErro(''); }} placeholder="Descreva o que foi feito..." style={{ marginTop: 12 }} />
                        {msgErro ? <Text style={{ color: theme.offline, fontWeight: '600', marginBottom: 4 }}>{msgErro}</Text> : null}
                        <Btn title="Fechar chamado definitivamente" icon="task-alt" variant="success" theme={theme} onPress={fecharChamado} />
                      </>
                    )}
                  </Card>

                  {/* HISTÓRICO / CHAT */}
                  <Card theme={theme}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <MaterialIcons name="forum" size={18} color={theme.primary} style={{ marginRight: 8 }} />
                      <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15 }}>Histórico / Chat</Text>
                    </View>
                    {!fechado && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                        {FRASES_RAPIDAS.map((frase, index) => (
                          <TouchableOpacity key={index} style={[styles.quickChip, { backgroundColor: theme.cardAlt, borderColor: theme.border }]} onPress={() => enviarMensagem(frase)}>
                            <Text style={{ color: theme.text, fontSize: 12 }}>{frase}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                    {historico.length === 0 ? (
                      <Text style={{ color: theme.subtext }}>Nenhuma mensagem ainda.</Text>
                    ) : historico.map((msg, i) => {
                      const meu = msg.user === user.login;
                      const sistema = msg.user === 'SISTEMA';
                      return (
                        <View key={i} style={[styles.bubble, {
                          alignSelf: meu ? 'flex-end' : sistema ? 'center' : 'flex-start',
                          backgroundColor: meu ? theme.messageUser : sistema ? theme.neutralWash : theme.messageTec,
                          borderColor: meu ? theme.primaryBorder : theme.border,
                        }]}>
                          <Text style={{ color: sistema ? theme.subtext : theme.primary, fontSize: 10.5, fontWeight: '700', marginBottom: 2, letterSpacing: 0.4 }}>{String(msg.user).toUpperCase()}</Text>
                          <Text style={{ color: theme.text, fontSize: 13.5 }}>{msg.texto}</Text>
                          <Text style={{ color: theme.textCode, fontSize: 10, textAlign: 'right', marginTop: 3 }}>{new Date(msg.time).toLocaleString('pt-BR').slice(0, 17)}</Text>
                        </View>
                      );
                    })}
                  </Card>

                  {user.perfil === 'ADM' && (
                    <Card theme={theme} style={{ borderColor: theme.violet + '55' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons name="lock-outline" size={18} color={theme.violet} style={{ marginRight: 8 }} />
                        <Text style={{ color: theme.violet, fontWeight: '600', fontSize: 15 }}>Notas internas</Text>
                      </View>
                      <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 2, marginBottom: 10 }}>Visível apenas para Administradores — não aparece para o técnico atribuído.</Text>
                      {(!selectedChamado.notasInternas || selectedChamado.notasInternas.length === 0) ? (
                        <Text style={{ color: theme.subtext }}>Nenhuma nota interna ainda.</Text>
                      ) : selectedChamado.notasInternas.map((msg, i) => (
                        <View key={i} style={[styles.bubble, { alignSelf: msg.user === user.login ? 'flex-end' : 'flex-start', backgroundColor: theme.violetWash, borderColor: theme.violet + '55' }]}>
                          <Text style={{ color: theme.violet, fontSize: 10.5, fontWeight: '700', marginBottom: 2 }}>{String(msg.user).toUpperCase()}</Text>
                          <Text style={{ color: theme.text, fontSize: 13.5 }}>{msg.texto}</Text>
                          <Text style={{ color: theme.textCode, fontSize: 10, textAlign: 'right', marginTop: 3 }}>{new Date(msg.time).toLocaleString('pt-BR').slice(0, 17)}</Text>
                        </View>
                      ))}
                      {!fechado && (
                        <View style={styles.composer}>
                          <TextInput style={[styles.composerInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.violet + '66' }, Platform.OS === 'web' && { outlineStyle: 'none' }]} placeholder="Nota interna (visível só para admins)..." placeholderTextColor={theme.textCode} value={notaInternaMsg} onChangeText={setNotaInternaMsg} onSubmitEditing={enviarNotaInterna} />
                          <TouchableOpacity onPress={enviarNotaInterna} style={[styles.sendBtn, { backgroundColor: theme.violet }]}>
                            <MaterialIcons name="lock" size={17} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </Card>
                  )}
                </ScrollView>

                {!fechado && (
                  <View style={[styles.modalFooter, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
                    <View style={[styles.composer, { marginTop: 0 }]}>
                      <TextInput style={[styles.composerInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }, Platform.OS === 'web' && { outlineStyle: 'none' }]} placeholder="Digite uma mensagem..." placeholderTextColor={theme.textCode} value={chatMsg} onChangeText={setChatMsg} onSubmitEditing={() => enviarMensagem(null)} />
                      <TouchableOpacity onPress={() => enviarMensagem(null)} style={[styles.sendBtn, { backgroundColor: theme.primary }]}>
                        <MaterialIcons name="send" size={17} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          );
        })()}
      </Modal>

      {/* CONFIRMAR ASSUMIR */}
      <Modal visible={confirmModalVisible} animationType="fade" transparent onRequestClose={() => setConfirmModalVisible(false)}>
        <View style={[styles.modalBg, { backgroundColor: theme.overlay, justifyContent: 'center', padding: 20 }]}>
          <View style={[styles.smallModal, { backgroundColor: theme.surface, borderColor: theme.border, alignItems: 'center', maxWidth: 380 }, SHADOW.lg]}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: theme.successWash, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="handshake" size={26} color={theme.online} />
            </View>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600', marginTop: 12 }}>Assumir chamado?</Text>
            <Text style={{ color: theme.subtext, textAlign: 'center', marginTop: 6, marginBottom: 8 }}>Este chamado sairá da fila da unidade e ficará sob sua responsabilidade.</Text>
            <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
              <Btn title="Cancelar" variant="outline" onPress={() => setConfirmModalVisible(false)} theme={theme} style={{ flex: 1 }} />
              <Btn title="Sim, assumir" variant="success" onPress={confirmarAssumir} theme={theme} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const FiltroLinha = ({ theme, label, children, isMobile, last }) => (
  <View style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'flex-start', marginTop: 14, marginBottom: last ? -8 : 0 }}>
    <Text style={{ color: theme.subtext, fontSize: 12, fontWeight: '600', letterSpacing: 0.8, width: 110, marginTop: 7, marginBottom: isMobile ? 6 : 0 }}>{label}:</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', flex: 1 }}>{children}</View>
  </View>
);

const InfoItem = ({ theme, icon, label, valor }) => (
  <View style={{ width: '50%', minWidth: 220, flexDirection: 'row', marginBottom: 12, paddingRight: 10 }}>
    <View style={{ width: 32, height: 32, borderRadius: RADIUS.md, backgroundColor: theme.cardAlt, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
      <MaterialIcons name={icon} size={16} color={theme.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ color: theme.subtext, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 13.5, marginTop: 2 }}>{valor}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  tabsRow: { justifyContent: 'space-between', paddingBottom: 14, marginBottom: 16, borderBottomWidth: 1 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 46, borderRadius: RADIUS.md, marginRight: 8 },
  tabText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.9, marginLeft: 8 },
  tabCount: { marginLeft: 10, minWidth: 24, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  bulkBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: RADIUS.lg, marginBottom: 16, flexWrap: 'wrap', gap: 8 },
  bulkBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.sm },
  bulkBtnText: { color: '#fff', fontWeight: '700', fontSize: 12, letterSpacing: 0.6 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, paddingHorizontal: 14 },
  ticketCard: { flex: 1, borderWidth: 1, borderLeftWidth: 4, borderRadius: RADIUS.lg, padding: 16 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  metaText: { fontSize: 13, marginLeft: 6, flex: 1 },
  statusStrip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: RADIUS.md, marginTop: 12 },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, marginTop: 'auto', paddingTop: 12, flexWrap: 'wrap', gap: 8 },
  footBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 30, borderRadius: RADIUS.pill, borderWidth: 1 },
  modalBg: { flex: 1, alignItems: 'center' },
  modalCard: { width: '100%', borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  modalFooter: { padding: 14, borderTopWidth: 1 },
  closeBtn: { width: 38, height: 38, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  smallModal: { width: '100%', maxWidth: 520, borderRadius: RADIUS.lg, borderWidth: 1, padding: 20 },
  formLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginTop: 10, marginBottom: 8 },
  prioBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.sm, borderWidth: 1, marginRight: 8, marginBottom: 8 },
  selectBox: { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 12 },
  autoBtn: { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 12, borderRadius: RADIUS.md, borderWidth: 1, marginLeft: 8 },
  dropList: { borderRadius: RADIUS.md, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  dropItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  thumb: { width: 64, height: 64, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  removeThumb: { position: 'absolute', top: -6, right: -6, backgroundColor: '#dc2626', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  innerBox: { padding: 12, borderRadius: RADIUS.md, borderWidth: 1, marginTop: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill, borderWidth: 1, marginRight: 8 },
  bubble: { padding: 10, borderRadius: RADIUS.lg, borderWidth: 1, marginBottom: 8, maxWidth: '85%' },
  composer: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  composerInput: { flex: 1, height: 44, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 12, marginRight: 10, fontSize: 14 },
  sendBtn: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
});
