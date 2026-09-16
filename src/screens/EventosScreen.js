import * as Location from 'expo-location';
import { useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Btn, Card } from '../components';
import { DataService } from '../services/DataService';
import { RADIUS, SHADOW } from '../theme/themes';
import { SETORES } from '../utils/constants';

const STATUS_OPCOES = [
  'Aguardando atendimento', 'Em andamento', 'Em separação de equipamentos', 'Instalado', 'finalizado', 'PENDENTE', 'CONCLUIDO'
];

export default function EventosScreen({ user, eventos, users, theme, addLog }) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('INTERNO');
  const [tecSel, setTecSel] = useState('');
  const [showTecs, setShowTecs] = useState(false);

  const [local, setLocal] = useState('');
  const [ramal, setRamal] = useState('');
  const [cliente, setCliente] = useState('');
  const [endereco, setEndereco] = useState('');

  const [solicitante, setSolicitante] = useState('');
  const [contato, setContato] = useState('');
  const [material, setMaterial] = useState('');
  const [dataInstalacao, setDataInstalacao] = useState('');
  const [dataEvento, setDataEvento] = useState('');

  const [modalConclusaoVisible, setModalConclusaoVisible] = useState(false);
  const [eventoAtual, setEventoAtual] = useState(null);
  
  const [notas, setNotas] = useState('');
  const [transporte, setTransporte] = useState('CARRO EMPRESA');
  const [km, setKm] = useState('');
  const [buscandoGPS, setBuscandoGPS] = useState(false);
  const [filtroAba, setFiltroAba] = useState('TODOS'); 

  const [modalDetalhesVisible, setModalDetalhesVisible] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [transferId, setTransferId] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [novoStatusSel, setNovoStatusSel] = useState('');
  const [notaStatus, setNotaStatus] = useState('');

  const registrarLog = (mensagem) => {
    if (addLog && typeof addLog === 'function') addLog(mensagem);
    else console.log("LOG: ", mensagem);
  };

  const tecnicos = users.filter(u => u.perfil === 'TECNICO' || u.perfil === 'ADM');
  const getContagem = (login) => eventos.filter(e => e.tecnico === login).length;
  const minEventos = tecnicos.length > 0 ? Math.min(...tecnicos.map(t => getContagem(t.login))) : 0;

  const autoEscalar = () => {
    if (tecnicos.length === 0) return Alert.alert('Ops!', 'Nenhum técnico disponível.');
    const disponiveis = tecnicos.filter(t => getContagem(t.login) === minEventos);
    const randomIndex = Math.floor(Math.random() * disponiveis.length);
    setTecSel(disponiveis[randomIndex].login);
  };

  const salvar = async () => {
    if (!nome || !tecSel) return Alert.alert('Erro', 'O nome do evento e o técnico são obrigatórios!');
    
    try {
      const payload = { 
        nome, tipo, tecnico: tecSel, status: 'Aguardando atendimento', data: Date.now(),
        local: tipo === 'INTERNO' ? local : null, ramal: tipo === 'INTERNO' ? ramal : null,
        cliente: tipo === 'EXTERNO' ? cliente : null, endereco: tipo === 'EXTERNO' ? endereco : null,
        solicitante, contato, material, dataInstalacao, dataEvento, historico: []
      };

      await DataService.salvarEvento(payload);
      registrarLog(`CRIOU EVENTO ${tipo}: ${nome}`);
      
      setNome(''); setTecSel(''); setLocal(''); setRamal(''); setCliente(''); setEndereco('');
      setSolicitante(''); setContato(''); setMaterial(''); setDataInstalacao(''); setDataEvento('');
    } catch (error) { Alert.alert('Erro', 'Falha ao salvar o evento.'); }
  };

  const handleExcluir = async (id, nomeEvento) => {
    if (user.perfil !== 'ADM') return Alert.alert('Acesso Negado', 'Apenas ADMs podem excluir eventos.');
    const deletarRef = async () => {
      try {
        await DataService.deletarEvento(id);
        registrarLog(`🗑️ APAGOU EVENTO: ${nomeEvento || 'Sem Nome'}`);
      } catch (e) { Alert.alert('Erro', 'Falha ao apagar do Firebase.'); }
    };
    if (Platform.OS === 'web') { if (window.confirm(`Deseja apagar "${nomeEvento}"?`)) await deletarRef(); } 
    else { Alert.alert("Excluir Evento", `Deseja apagar "${nomeEvento}" permanentemente?`, [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: deletarRef }]); }
  };

  const abrirModalDetalhes = (evento) => {
    setEventoAtual(evento);
    setModalDetalhesVisible(true);
    setShowStatusModal(false);
  };

  const prepararConclusao = (evento) => {
    setEventoAtual(evento);
    setNotas('');
    if (evento.tipo === 'EXTERNO') { setKm(''); setTransporte('CARRO EMPRESA'); }
    setModalConclusaoVisible(true);
  };

  const concluirEvento = async () => {
    if (!notas || notas.trim() === '') return Alert.alert('Erro', 'Por favor, descreva o que foi feito no evento (Notas)!');

    const msgFechamento = { user: 'SISTEMA', texto: `🏁 EVENTO FINALIZADO POR ${user.login}.\n📝 SOLUÇÃO: ${notas}`, time: Date.now() };
    let payloadAtualizacao = { status: 'finalizado', notas: notas, historico: [msgFechamento, ...(eventoAtual.historico || [])] };

    if (eventoAtual.tipo === 'EXTERNO') {
      const kmFormatado = parseFloat(km.toString().replace(',', '.'));
      if (!km || isNaN(kmFormatado)) return Alert.alert('Erro', 'Insira uma quilometragem válida (ex: 10.5)!');
      
      setBuscandoGPS(true);
      let coordsGPS = null;

      try {
        if (Platform.OS !== 'web') {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            coordsGPS = { lat: location.coords.latitude, lng: location.coords.longitude };
          }
        }
      } catch (errorGPS) { console.log("Erro de GPS", errorGPS); }

      payloadAtualizacao = { ...payloadAtualizacao, transporte: transporte, km: kmFormatado, gps: coordsGPS };
    }

    try {
      await DataService.atualizarEvento(eventoAtual.id, payloadAtualizacao);
      registrarLog(`✅ CONCLUIU EVENTO ${eventoAtual.tipo}: ${eventoAtual.nome}`);
      setBuscandoGPS(false); setModalConclusaoVisible(false); setModalDetalhesVisible(false);
      Alert.alert('Sucesso', 'Evento concluído com sucesso!');
    } catch (errorDB) { setBuscandoGPS(false); Alert.alert('Erro', 'Falha ao salvar a conclusão.'); }
  };

  const alterarStatusEvento = async () => {
    if (!novoStatusSel) return;
    if (novoStatusSel === 'finalizado' || novoStatusSel === 'CONCLUIDO') {
      setShowStatusModal(false); setModalDetalhesVisible(false);
      prepararConclusao(eventoAtual); 
      return;
    }

    const txtNota = notaStatus.trim() ? `\n📝 Nota: ${notaStatus}` : '';
    const msgSistema = { user: 'SISTEMA', texto: `🔄 Status atualizado: ${novoStatusSel}${txtNota}`, time: Date.now() };
    
    await DataService.atualizarEvento(eventoAtual.id, { status: novoStatusSel, historico: [msgSistema, ...(eventoAtual.historico || [])] });
    setEventoAtual({ ...eventoAtual, status: novoStatusSel, historico: [msgSistema, ...(eventoAtual.historico || [])] });
    
    registrarLog(`🔄 ALTEROU STATUS EVENTO #${eventoAtual.id.substring(0,4)} para ${novoStatusSel}`);
    setShowStatusModal(false); setNotaStatus(''); setNovoStatusSel('');
  };

  const enviarMensagem = async () => {
    if (!chatMsg.trim()) return;
    const novaMsg = { user: user.login, texto: chatMsg, time: Date.now() };
    const novoHistorico = [novaMsg, ...(eventoAtual.historico || [])];
    
    await DataService.atualizarEvento(eventoAtual.id, { historico: novoHistorico });
    setEventoAtual({ ...eventoAtual, historico: novoHistorico });
    registrarLog(`📝 COMENTOU EVENTO #${eventoAtual.id.substring(0,4)}`);
    setChatMsg('');
  };

  // ALTERADO AQUI: Transferência Global de Eventos
  const transferirEvento = async (eventoId, tecnicoAtual, novoTecnico, novoPredio) => {
    const destinoStr = novoTecnico ? novoTecnico : `Fila (${novoPredio})`;
    const msgSistema = { user: 'SISTEMA', texto: `🔄 Evento transferido para: ${destinoStr}`, time: Date.now() };
    setTransferId(null); 
    Alert.alert('Sucesso', 'Evento transferido!');
    
    await DataService.atualizarEvento(eventoId, { 
      tecnico: novoTecnico, 
      status: novoTecnico ? 'Em andamento' : 'Aguardando atendimento',
      historico: [msgSistema, ...(eventoAtual.historico || [])] 
    });
    setEventoAtual({ ...eventoAtual, tecnico: novoTecnico, historico: [msgSistema, ...(eventoAtual.historico || [])] });
    registrarLog(`🔄 TRANSFERIU EVENTO PARA ${destinoStr}`);
  };

  const eventosFiltrados = eventos.filter(ev => filtroAba === 'TODOS' ? true : ev.tipo === filtroAba);
  const isEventoFechado = (status) => status === 'CONCLUIDO' || status === 'finalizado';

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 4 }}>Gestão de Eventos</Text>
      <Text style={{ color: theme.subtext, fontSize: 13, marginBottom: 18 }}>Eventos internos e externos da equipe</Text>
      
      {user.perfil === 'ADM' && (
        <Card theme={theme}>
          <View style={{flexDirection: 'row', marginBottom: 15}}>
            <TouchableOpacity onPress={()=>setTipo('INTERNO')} style={[styles.tab, {backgroundColor: tipo==='INTERNO'?theme.sec:theme.inputBg}]}><Text style={{color:'#fff', fontWeight: 'bold'}}>🏢 INTERNO</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=>setTipo('EXTERNO')} style={[styles.tab, {backgroundColor: tipo==='EXTERNO'?theme.tert:theme.inputBg}]}><Text style={{color:'#fff', fontWeight: 'bold'}}>🛣️ EXTERNO</Text></TouchableOpacity>
          </View>

          <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} placeholder="Nome do Evento" value={nome} onChangeText={setNome} placeholderTextColor={theme.subtext} />
          
          <View style={{ flexDirection: 'row' }}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 5, backgroundColor: theme.inputBg, color: theme.text }]} placeholder="Solicitante" value={solicitante} onChangeText={setSolicitante} placeholderTextColor={theme.subtext} />
            <TextInput style={[styles.input, { flex: 1, backgroundColor: theme.inputBg, color: theme.text }]} placeholder="Contato (Ramal/Tel)" value={contato} onChangeText={setContato} placeholderTextColor={theme.subtext} />
          </View>

          {tipo === 'INTERNO' ? (
             <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} placeholder="Local do evento (Sala / Setor)" value={local} onChangeText={setLocal} placeholderTextColor={theme.subtext} />
          ) : (
            <>
              <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} placeholder="Cliente / Empresa" value={cliente} onChangeText={setCliente} placeholderTextColor={theme.subtext} />
              <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} placeholder="Endereço do evento" value={endereco} onChangeText={setEndereco} placeholderTextColor={theme.subtext} />
            </>
          )}

          <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} placeholder="Material solicitado" value={material} onChangeText={setMaterial} placeholderTextColor={theme.subtext} />
          
          <View style={{ flexDirection: 'row' }}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 5, backgroundColor: theme.inputBg, color: theme.text }]} placeholder="Data de Instalação" value={dataInstalacao} onChangeText={setDataInstalacao} placeholderTextColor={theme.subtext} />
            <TextInput style={[styles.input, { flex: 1, backgroundColor: theme.inputBg, color: theme.text }]} placeholder="Data do Evento" value={dataEvento} onChangeText={setDataEvento} placeholderTextColor={theme.subtext} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            <TouchableOpacity style={[styles.input, { flex: 1, justifyContent: 'center' }]} onPress={() => setShowTecs(!showTecs)}>
              <Text style={{ color: tecSel ? theme.text : theme.subtext }}>{tecSel || 'Selecionar Técnico Escalado ↓'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={autoEscalar} style={[styles.btnAuto, {backgroundColor: theme.primary}]}><Text style={{ fontSize: 20 }}>⚡</Text></TouchableOpacity>
          </View>

          {showTecs && (
            <View style={{ backgroundColor: theme.card, borderRadius: 12, marginTop: 5, borderWidth: 1, borderColor: theme.border }}>
              {tecnicos.map(t => (
                  <TouchableOpacity key={t.login} style={styles.tecItem} onPress={() => { setTecSel(t.login); setShowTecs(false); }}>
                    <Text style={{ color: theme.text, fontWeight: 'bold' }}>{t.login}</Text>
                  </TouchableOpacity>
              ))}
            </View>
          )}
          <Btn title="CRIAR EVENTO" onPress={salvar} theme={theme} style={{marginTop: 15}} />
        </Card>
      )}

      <View style={{ flexDirection: 'row', marginTop: user.perfil === 'ADM' ? 30 : 0, marginBottom: 15, justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold' }}>Agenda de Eventos</Text>
        <View style={{ flexDirection: 'row', backgroundColor: theme.card, borderRadius: 8, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' }}>
          {['TODOS', 'INTERNO', 'EXTERNO'].map(f => (
             <TouchableOpacity key={f} onPress={() => setFiltroAba(f)} style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: filtroAba === f ? theme.primary : 'transparent' }}>
               <Text style={{ fontSize: 10, fontWeight: 'bold', color: filtroAba === f ? '#fff' : theme.subtext }}>{f}</Text>
             </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {eventosFiltrados.map(ev => (
        <TouchableOpacity activeOpacity={0.8} key={ev.id} onPress={() => abrirModalDetalhes(ev)}>
          <Card theme={theme} style={{ borderLeftWidth: 5, borderLeftColor: isEventoFechado(ev.status) ? theme.border : (ev.tipo === 'EXTERNO' ? theme.tert : theme.sec), marginBottom: 10, opacity: isEventoFechado(ev.status) ? 0.6 : 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                  <Text style={{ backgroundColor: ev.tipo === 'EXTERNO' ? theme.tert : theme.sec, color: '#fff', fontSize: 9, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 }}>
                    {ev.tipo === 'EXTERNO' ? '🛣️ EXTERNO' : '🏢 INTERNO'}
                  </Text>
                  <Text style={{ color: isEventoFechado(ev.status) ? theme.primary : theme.warning, fontWeight: 'bold', fontSize: 10 }}>{ev.status}</Text>
                </View>
                <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>{ev.nome}</Text>
                <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>📍 {ev.tipo === 'INTERNO' ? ev.local : ev.endereco}</Text>
                <Text style={{ color: theme.primary, fontSize: 12, marginTop: 4, fontWeight: 'bold' }}>👨‍🔧 Escala: {ev.tecnico}</Text>
              </View>
              
              {user.perfil === 'ADM' && (
                <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <TouchableOpacity onPress={() => handleExcluir(ev.id, ev.nome)}>
                    <Text style={{ fontSize: 20 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Card>
        </TouchableOpacity>
      ))}

      {eventosFiltrados.length === 0 && <Text style={{ color: theme.subtext, textAlign: 'center', marginTop: 20 }}>Nenhum evento encontrado.</Text>}

      {/* MODAL DETALHES DO EVENTO COM CHAT */}
      <Modal visible={modalDetalhesVisible} animationType="slide" transparent={true} onRequestClose={() => setModalDetalhesVisible(false)}>
        {eventoAtual && (
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
            <View style={{ height: '90%', backgroundColor: theme.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold' }}>Evento: {eventoAtual.nome}</Text>
                <TouchableOpacity onPress={() => setModalDetalhesVisible(false)}><Text style={{ color: theme.primary, fontSize: 18 }}>Fechar</Text></TouchableOpacity>
              </View>
              
              <ScrollView style={{ flex: 1, marginBottom: 10 }} keyboardShouldPersistTaps="handled">
                <Card theme={theme}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                    <Text style={{ color: theme.sec, fontWeight: 'bold', fontSize: 16 }}>Status: {eventoAtual.status}</Text>
                    {!isEventoFechado(eventoAtual.status) && (
                      <TouchableOpacity onPress={() => setShowStatusModal(!showStatusModal)} style={{ backgroundColor: theme.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>MUDAR STATUS</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* CAIXA PARA MUDAR STATUS DO EVENTO */}
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
                        placeholder="Nota opcional sobre a mudança..." placeholderTextColor={theme.subtext} multiline 
                        value={notaStatus} onChangeText={setNotaStatus} 
                      />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Btn title="CANCELAR" outline theme={theme} onPress={() => { setShowStatusModal(false); setNovoStatusSel(''); setNotaStatus(''); }} style={{ flex: 1, marginRight: 5 }} />
                        <Btn title="CONFIRMAR" theme={theme} onPress={alterarStatusEvento} style={{ flex: 1, marginLeft: 5 }} />
                      </View>
                    </View>
                  )}

                  <View style={{ backgroundColor: theme.inputBg, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border }}>
                    <Text style={{ color: theme.subtext, fontSize: 11, marginBottom: 2 }}>Solicitante:</Text>
                    <Text style={{ color: theme.text, fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>{eventoAtual.solicitante || 'Não informado'}</Text>
                    
                    <Text style={{ color: theme.subtext, fontSize: 11, marginBottom: 2 }}>Contato:</Text>
                    <Text style={{ color: theme.text, fontSize: 14, marginBottom: 8 }}>{eventoAtual.contato || 'Não informado'}</Text>
                    
                    <Text style={{ color: theme.subtext, fontSize: 11, marginBottom: 2 }}>Local do Evento:</Text>
                    <Text style={{ color: theme.text, fontSize: 14, marginBottom: 8 }}>{eventoAtual.tipo === 'INTERNO' ? eventoAtual.local : eventoAtual.endereco}</Text>
                    
                    <Text style={{ color: theme.subtext, fontSize: 11, marginBottom: 2 }}>Material Solicitado:</Text>
                    <Text style={{ color: theme.text, fontSize: 14, marginBottom: 8 }}>{eventoAtual.material || 'Nenhum'}</Text>
                    
                    <Text style={{ color: theme.subtext, fontSize: 11, marginBottom: 2 }}>Datas:</Text>
                    <Text style={{ color: theme.text, fontSize: 14 }}>Instalação: {eventoAtual.dataInstalacao || '---'} | Evento: {eventoAtual.dataEvento || '---'}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 }}>
                    <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Técnico: {eventoAtual.tecnico}</Text>
                    {!isEventoFechado(eventoAtual.status) && (
                      <TouchableOpacity style={{ backgroundColor: theme.card, padding: 5, borderRadius: 5, borderWidth: 1, borderColor: theme.border }} onPress={() => setTransferId(transferId === eventoAtual.id ? null : eventoAtual.id)}>
                        <Text style={{ color: theme.text, fontSize: 10 }}>⇄ Transferir</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {transferId === eventoAtual.id && (
                    <View style={{ backgroundColor: theme.inputBg, borderRadius: 10, marginTop: 10, padding: 10, borderWidth: 1, borderColor: theme.primary }}>
                      <Text style={{ color: theme.subtext, marginBottom: 5, fontSize: 12 }}>Transferir para Fila do Setor:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                        {SETORES.map(s => (
                          <TouchableOpacity key={s} onPress={() => transferirEvento(eventoAtual.id, eventoAtual.tecnico, '', s)} style={{ backgroundColor: theme.card, padding: 8, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: theme.border }}>
                            <Text style={{ color: theme.primary, fontSize: 11, fontWeight: 'bold' }}>🏢 {s}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      <Text style={{ color: theme.subtext, marginBottom: 5, fontSize: 12 }}>Ou transferir direto para Técnico/Admin:</Text>
                      {tecnicos.filter(t => t.login !== eventoAtual.tecnico).map((t) => (
                        <TouchableOpacity key={t.login} style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: theme.border }} onPress={() => transferirEvento(eventoAtual.id, eventoAtual.tecnico, t.login, t.predio)}>
                          <Text style={{ color: theme.text, fontWeight: 'bold' }}>➜ {t.login} <Text style={{ color: theme.sec, fontSize: 10 }}>({t.predio})</Text></Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </Card>

                <Text style={{ color: theme.primary, marginTop: 10, marginBottom: 5, fontWeight: 'bold' }}>Histórico do Evento</Text>
                
                {(!eventoAtual.historico || eventoAtual.historico.length === 0) ? (
                  <Text style={{ color: theme.subtext, fontStyle: 'italic' }}>Nenhuma nota ou alteração ainda.</Text>
                ) : (
                  eventoAtual.historico.map((msg, i) => (
                    <View key={i} style={{ alignSelf: msg.user === user.login ? 'flex-end' : msg.user === 'SISTEMA' ? 'center' : 'flex-start', backgroundColor: msg.user === user.login ? theme.primary : msg.user === 'SISTEMA' ? theme.border : theme.inputBg, padding: 10, borderRadius: 10, marginBottom: 5, maxWidth: '85%' }}>
                      <Text style={{ color: msg.user === user.login ? '#fff' : theme.text, fontSize: 10, fontWeight: 'bold', marginBottom: 2 }}>{msg.user}</Text>
                      <Text style={{ color: msg.user === user.login ? '#fff' : theme.text }}>{msg.texto}</Text>
                      <Text style={{ color: msg.user === user.login ? '#eee' : theme.subtext, fontSize: 8, textAlign: 'right', marginTop: 2 }}>{new Date(msg.time).toLocaleTimeString().slice(0, 5)}</Text>
                    </View>
                  ))
                )}
              </ScrollView>

              {!isEventoFechado(eventoAtual.status) && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput style={[styles.input, { flex: 1, backgroundColor: theme.inputBg, color: theme.text, marginVertical: 0, marginRight: 10 }]} placeholder="Inserir anotação..." value={chatMsg} onChangeText={setChatMsg} />
                  <TouchableOpacity onPress={enviarMensagem} style={{ backgroundColor: theme.primary, padding: 12, borderRadius: 12 }}>
                    <Text style={{ color: '#fff' }}>Nota</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </Modal>

      {/* MODAL DE CONCLUSÃO FINAL COM GPS/KM */}
      <Modal visible={modalConclusaoVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
            <Text style={{ fontSize: 30, marginBottom: 5 }}>✅</Text>
            <Text style={{ color: theme.primary, fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>Finalizar Evento</Text>
            
            <Text style={{ color: theme.text, fontWeight: 'bold', alignSelf: 'flex-start', marginBottom: 5, fontSize: 12 }}>Resumo / Notas (Obrigatório):</Text>
            <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, width: '100%', height: 80, textAlignVertical: 'top' }]} placeholder="Descreva a finalização..." placeholderTextColor={theme.subtext} multiline value={notas} onChangeText={setNotas} />

            {eventoAtual?.tipo === 'EXTERNO' && (
              <View style={{ width: '100%', marginTop: 10 }}>
                <Text style={{ color: theme.tert, fontWeight: 'bold', alignSelf: 'flex-start', marginBottom: 5, fontSize: 12 }}>Logística de Deslocação:</Text>
                <View style={{ flexDirection: 'row', width: '100%', marginBottom: 10 }}>
                  {['CARRO EMPRESA', 'MOTO PRÓPRIA'].map(t => (
                    <TouchableOpacity key={t} onPress={() => setTransporte(t)} style={[styles.tab, { backgroundColor: transporte === t ? theme.tert : theme.inputBg, marginHorizontal: 2 }]}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, width: '100%', textAlign: 'center', fontSize: 20, fontWeight: 'bold' }]} placeholder="Total Km (Ex: 15.5)" placeholderTextColor={theme.subtext} keyboardType="numeric" value={km} onChangeText={setKm} />
              </View>
            )}

            <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 20 }}>
              <Btn title="CANCELAR" onPress={() => setModalConclusaoVisible(false)} theme={theme} outline style={{ flex: 1, marginRight: 5 }} disabled={buscandoGPS} />
              <Btn title={buscandoGPS ? "A SALVAR..." : "CONCLUIR DEFINITIVO"} onPress={concluirEvento} theme={theme} style={{ flex: 1, marginLeft: 5 }} disabled={buscandoGPS} />
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: { padding: 12, borderRadius: RADIUS.md, marginVertical: 5, borderWidth: 1, borderColor: 'rgba(140,150,160,0.28)' },
  btnAuto: { padding: 12, borderRadius: RADIUS.md, marginLeft: 5 },
  tab: { flex: 1, padding: 12, borderRadius: RADIUS.md, alignItems: 'center', marginRight: 6 },
  tecItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(140,150,160,0.2)' },
  modalContainer: { flex: 1, backgroundColor: 'rgba(4,6,8,0.72)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 350, borderRadius: RADIUS.xl, padding: 22, alignItems: 'center', ...SHADOW.lg }
});