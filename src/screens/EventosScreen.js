import * as Location from 'expo-location';
import { useState } from 'react';
import { Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Btn, Card } from '../components';
import { DataService } from '../services/DataService';

export default function EventosScreen({ user, eventos, users, theme, addLog }) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('INTERNO');
  const [tecSel, setTecSel] = useState('');
  const [showTecs, setShowTecs] = useState(false);

  const [local, setLocal] = useState('');
  const [ramal, setRamal] = useState('');

  const [cliente, setCliente] = useState('');
  const [endereco, setEndereco] = useState('');

  const [modalConclusaoVisible, setModalConclusaoVisible] = useState(false);
  const [eventoAtual, setEventoAtual] = useState(null);
  
  const [notas, setNotas] = useState('');
  const [transporte, setTransporte] = useState('CARRO EMPRESA');
  const [km, setKm] = useState('');
  
  const [buscandoGPS, setBuscandoGPS] = useState(false);
  const [filtroAba, setFiltroAba] = useState('TODOS'); 

  const registrarLog = (mensagem) => {
    if (addLog && typeof addLog === 'function') {
      addLog(mensagem);
    } else {
      console.log("LOG: ", mensagem);
    }
  };

  const tecnicos = users.filter(u => u.perfil === 'TECNICO');
  const getContagem = (login) => eventos.filter(e => e.tecnico === login).length;
  const minEventos = tecnicos.length > 0 ? Math.min(...tecnicos.map(t => getContagem(t.login))) : 0;

  const autoEscalar = () => {
    if (tecnicos.length === 0) return Alert.alert('Ops!', 'Nenhum técnico disponível.');

    const disponiveis = tecnicos.filter(t => getContagem(t.login) === minEventos);
    const randomIndex = Math.floor(Math.random() * disponiveis.length);

    setTecSel(disponiveis[randomIndex].login);
  };

  const handleSelectTecnico = (t) => {
    const contagem = getContagem(t.login);
    const isBlocked = contagem > minEventos;

    if (isBlocked) {
      if (user.perfil !== 'ADM') {
        const msgErro = 'Este técnico já pegou um evento. Aguarde até que os outros técnicos também façam os seus turnos.';
        if (Platform.OS === 'web') window.alert(msgErro);
        else Alert.alert('Bloqueado pelo Rodízio', msgErro);
      } else {
        const msgAviso = `O técnico ${t.login} já fez o seu evento nesta rodada.\n\nTem certeza que quer forçar a escala e furar o rodízio?`;
        
        if (Platform.OS === 'web') {
          if (window.confirm(msgAviso)) {
            setTecSel(t.login);
            setShowTecs(false);
          }
        } else {
          Alert.alert(
            'Furar o Rodízio?',
            msgAviso,
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Sim, Desbloquear', style: 'destructive', onPress: () => { setTecSel(t.login); setShowTecs(false); } }
            ]
          );
        }
      }
    } else {
      setTecSel(t.login);
      setShowTecs(false);
    }
  };

  const salvar = async () => {
    if (!nome || !tecSel) return Alert.alert('Erro', 'O nome do evento e o técnico são obrigatórios!');
    if (tipo === 'INTERNO' && !local) return Alert.alert('Erro', 'Preencha a Sala/Setor!');
    if (tipo === 'EXTERNO' && (!cliente || !endereco)) return Alert.alert('Erro', 'Preencha o Cliente e o Endereço!');

    try {
      const payload = { 
        nome, tipo, tecnico: tecSel, status: 'PENDENTE', data: Date.now(),
        local: tipo === 'INTERNO' ? local : null, ramal: tipo === 'INTERNO' ? ramal : null,
        cliente: tipo === 'EXTERNO' ? cliente : null, endereco: tipo === 'EXTERNO' ? endereco : null,
      };

      await DataService.salvarEvento(payload);
      registrarLog(`CRIOU EVENTO ${tipo}: ${nome}`);
      setNome(''); setTecSel(''); setLocal(''); setRamal(''); setCliente(''); setEndereco('');
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

    if (Platform.OS === 'web') {
      if (window.confirm(`Deseja apagar "${nomeEvento}" permanentemente?`)) await deletarRef();
    } else {
      Alert.alert("Excluir Evento", `Deseja apagar "${nomeEvento}" permanentemente?`, [
        { text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: deletarRef }
      ]);
    }
  };

  const prepararConclusao = (evento) => {
    setEventoAtual(evento);
    setNotas('');
    if (evento.tipo === 'EXTERNO') {
      setKm('');
      setTransporte('CARRO EMPRESA');
    }
    setModalConclusaoVisible(true);
  };

  const concluirEvento = async () => {
    if (!notas || notas.trim() === '') return Alert.alert('Erro', 'Por favor, descreva o que foi feito no evento (Notas)!');

    let payloadAtualizacao = { status: 'CONCLUIDO', notas: notas };

    if (eventoAtual.tipo === 'EXTERNO') {
      const kmFormatado = parseFloat(km.toString().replace(',', '.'));

      if (!km || isNaN(kmFormatado)) return Alert.alert('Erro', 'Insira uma quilometragem válida (ex: 10.5 ou 10,5)!');
      
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
      } catch (errorGPS) { console.log("Erro de GPS ignorado: ", errorGPS); }

      payloadAtualizacao = { ...payloadAtualizacao, transporte: transporte, km: kmFormatado, gps: coordsGPS };
    }

    try {
      await DataService.atualizarEvento(eventoAtual.id, payloadAtualizacao);
      registrarLog(`✅ CONCLUIU EVENTO ${eventoAtual.tipo}: ${eventoAtual.nome}`);
      
      setBuscandoGPS(false);
      setModalConclusaoVisible(false);
      
      if (eventoAtual.tipo === 'EXTERNO' && !payloadAtualizacao.gps) {
        Alert.alert('Sucesso Parcial', 'Evento fechado e KMs registados, mas o sinal de GPS falhou.');
      } else {
        Alert.alert('Sucesso', 'Evento concluído com sucesso!');
      }
    } catch (errorDB) {
      setBuscandoGPS(false);
      Alert.alert('Erro', 'Falha ao salvar a conclusão do evento no banco de dados.');
    }
  };

  const abrirMapa = (lat, lng) => {
    const url = `http://maps.google.com/maps?q=${lat},${lng}`;
    Linking.openURL(url).catch(() => Alert.alert('Erro', 'Não foi possível abrir o mapa.'));
  };

  const eventosFiltrados = eventos.filter(ev => filtroAba === 'TODOS' ? true : ev.tipo === filtroAba);

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ color: theme.primary, fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>🎉 Gestão de Eventos</Text>
      
      {user.perfil === 'ADM' && (
        <Card theme={theme}>
          <View style={{flexDirection: 'row', marginBottom: 15}}>
            <TouchableOpacity onPress={()=>setTipo('INTERNO')} style={[styles.tab, {backgroundColor: tipo==='INTERNO'?theme.sec:theme.inputBg}]}><Text style={{color:'#fff', fontWeight: 'bold'}}>🏢 INTERNO</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=>setTipo('EXTERNO')} style={[styles.tab, {backgroundColor: tipo==='EXTERNO'?theme.tert:theme.inputBg}]}><Text style={{color:'#fff', fontWeight: 'bold'}}>🛣️ EXTERNO</Text></TouchableOpacity>
          </View>

          <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} placeholder={tipo === 'INTERNO' ? "Nome do Evento" : "Resumo do Serviço (ex: Instalação de Rede)"} value={nome} onChangeText={setNome} placeholderTextColor={theme.subtext} />
          
          {tipo === 'INTERNO' ? (
            <View style={{ flexDirection: 'row' }}>
              <TextInput style={[styles.input, { flex: 2, marginRight: 5, backgroundColor: theme.inputBg, color: theme.text }]} placeholder="Sala / Setor" value={local} onChangeText={setLocal} placeholderTextColor={theme.subtext} />
              <TextInput style={[styles.input, { flex: 1, backgroundColor: theme.inputBg, color: theme.text }]} placeholder="Ramal" value={ramal} onChangeText={setRamal} placeholderTextColor={theme.subtext} keyboardType="numeric" />
            </View>
          ) : (
            <>
              <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} placeholder="Nome do Cliente / Empresa" value={cliente} onChangeText={setCliente} placeholderTextColor={theme.subtext} />
              <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} placeholder="Endereço Completo" value={endereco} onChangeText={setEndereco} placeholderTextColor={theme.subtext} />
            </>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={[styles.input, { flex: 1, justifyContent: 'center' }]} onPress={() => setShowTecs(!showTecs)}>
              <Text style={{ color: tecSel ? theme.text : theme.subtext }}>{tecSel || 'Selecionar Técnico ↓'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={autoEscalar} style={[styles.btnAuto, {backgroundColor: theme.primary}]}><Text style={{ fontSize: 20 }}>⚡</Text></TouchableOpacity>
          </View>

          {showTecs && (
            <View style={{ backgroundColor: theme.card, borderRadius: 12, marginTop: 5, borderWidth: 1, borderColor: theme.border }}>
              {tecnicos.map(t => {
                const contagem = getContagem(t.login);
                const isBlocked = contagem > minEventos;
                
                return (
                  <TouchableOpacity key={t.login} style={styles.tecItem} onPress={() => handleSelectTecnico(t)}>
                    <Text style={{ color: isBlocked ? theme.offline : theme.text, fontWeight: isBlocked ? 'normal' : 'bold' }}>
                      {t.login} {isBlocked ? `(AGUARDANDO OS OUTROS)` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
        <Card key={ev.id} theme={theme} style={{ borderLeftWidth: 5, borderLeftColor: ev.status === 'CONCLUIDO' ? theme.border : (ev.tipo === 'EXTERNO' ? theme.tert : theme.sec), marginBottom: 10, opacity: ev.status === 'CONCLUIDO' ? 0.6 : 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                <Text style={{ backgroundColor: ev.tipo === 'EXTERNO' ? theme.tert : theme.sec, color: '#fff', fontSize: 9, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 }}>
                  {ev.tipo === 'EXTERNO' ? '🛣️ EXTERNO' : '🏢 INTERNO'}
                </Text>
                <Text style={{ color: ev.status === 'CONCLUIDO' ? theme.primary : theme.warning, fontWeight: 'bold', fontSize: 10 }}>{ev.status}</Text>
              </View>
              
              <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>{ev.nome}</Text>
              
              {ev.tipo === 'INTERNO' ? (
                <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>📍 Sala/Setor: {ev.local} {ev.ramal ? `(Ramal: ${ev.ramal})` : ''}</Text>
              ) : (
                <View style={{ marginTop: 4 }}>
                  <Text style={{ color: theme.text, fontSize: 12 }}>👤 Cliente: {ev.cliente}</Text>
                  <Text style={{ color: theme.subtext, fontSize: 11 }}>📍 Endereço: {ev.endereco}</Text>
                </View>
              )}

              <Text style={{ color: theme.primary, fontSize: 12, marginTop: 4, fontWeight: 'bold' }}>👨‍🔧 Escala: {ev.tecnico}</Text>
              
              {ev.notas && (
                <View style={{ marginTop: 8, backgroundColor: theme.inputBg, padding: 8, borderRadius: 6, borderWidth: 1, borderColor: theme.border }}>
                  <Text style={{ color: theme.primary, fontSize: 10, fontWeight: 'bold' }}>📝 Resumo do Evento:</Text>
                  <Text style={{ color: theme.text, fontSize: 12, marginTop: 2 }}>{ev.notas}</Text>
                </View>
              )}

              {ev.km !== undefined && (
                <View style={{ marginTop: 5, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: theme.tert, fontSize: 11, fontWeight: 'bold' }}>🛣️ Transporte: {ev.transporte} | {ev.km} Km</Text>
                  {ev.gps && (
                    <TouchableOpacity onPress={() => abrirMapa(ev.gps.lat, ev.gps.lng)} style={{ marginLeft: 10, backgroundColor: theme.inputBg, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: theme.border }}>
                      <Text style={{ fontSize: 10, color: theme.text, fontWeight: 'bold' }}>📍 Ver no Mapa</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
            
            {(user.perfil === 'ADM' || user.login === ev.tecnico) && (
              <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                {ev.status !== 'CONCLUIDO' && (
                  <TouchableOpacity onPress={() => prepararConclusao(ev)} style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 22 }}>✅</Text>
                  </TouchableOpacity>
                )}
                {user.perfil === 'ADM' && (
                  <TouchableOpacity onPress={() => handleExcluir(ev.id, ev.nome)}>
                    <Text style={{ fontSize: 20 }}>🗑️</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            
          </View>
        </Card>
      ))}

      {eventosFiltrados.length === 0 && <Text style={{ color: theme.subtext, textAlign: 'center', marginTop: 20 }}>Nenhum evento encontrado.</Text>}

      <Modal visible={modalConclusaoVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
            <Text style={{ fontSize: 30, marginBottom: 5 }}>✅</Text>
            <Text style={{ color: theme.primary, fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>Concluir Evento</Text>
            
            <Text style={{ color: theme.text, fontWeight: 'bold', alignSelf: 'flex-start', marginBottom: 5, fontSize: 12 }}>Resumo / Notas (Obrigatório):</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, width: '100%', height: 80, textAlignVertical: 'top' }]} 
              placeholder="Descreva o que foi feito no evento..." 
              placeholderTextColor={theme.subtext} 
              multiline
              value={notas} 
              onChangeText={setNotas} 
            />

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

                <TextInput 
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, width: '100%', textAlign: 'center', fontSize: 20, fontWeight: 'bold' }]} 
                  placeholder="Total Km (Ex: 15,5)" 
                  placeholderTextColor={theme.subtext} 
                  keyboardType="numeric"
                  value={km} 
                  onChangeText={setKm} 
                />
              </View>
            )}

            <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 20 }}>
              <Btn title="CANCELAR" onPress={() => setModalConclusaoVisible(false)} theme={theme} outline style={{ flex: 1, marginRight: 5 }} disabled={buscandoGPS} />
              <Btn title={buscandoGPS ? "A SALVAR..." : "CONCLUIR EVENTO"} onPress={concluirEvento} theme={theme} style={{ flex: 1, marginLeft: 5 }} disabled={buscandoGPS} />
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: { padding: 12, borderRadius: 10, marginVertical: 5, borderWidth: 1, borderColor: '#333' },
  btnAuto: { padding: 12, borderRadius: 10, marginLeft: 5 },
  tab: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  tecItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 350, borderRadius: 15, padding: 20, alignItems: 'center' }
});