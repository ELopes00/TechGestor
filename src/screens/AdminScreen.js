import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState, useEffect } from 'react';
import { Alert, Dimensions, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Btn, Card } from '../components';
import { DataService } from '../services/DataService';
import { RADIUS, SHADOW } from '../theme/themes';

const SETORES = ['Administrativo', 'Criminal', 'Civel', 'Palacio', 'Latife', 'Chamado Externo', 'SUBCS'];

export default function AdminScreen({ users, chamados = [], eventos = [], addLog, theme }) {
  const [abaAtiva, setAbaAtiva] = useState('USUARIOS'); 

  const [nome, setNome] = useState('');
  const [loginUsuario, setLoginUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [predio, setPredio] = useState('Administrativo');
  const [inicio, setInicio] = useState(8);
  const [saida, setSaida] = useState(17);
  const [perfilNovo, setPerfilNovo] = useState('TECNICO');

  const [modalEditVisible, setModalEditVisible] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const [relatorioDate, setRelatorioDate] = useState(new Date());
  const [tecnicoFiltro, setTecnicoFiltro] = useState('TODOS'); 
  const [showTecsRelatorio, setShowTecsRelatorio] = useState(false); 

  const [horaAtual, setHoraAtual] = useState(new Date().getHours());

  useEffect(() => {
    const interval = setInterval(() => {
      setHoraAtual(new Date().getHours());
    }, 60000); 
    return () => clearInterval(interval);
  }, []);

  const getStatusReal = (u) => {
    const horaInicio = u.inicio || 8;
    const horaSaida = u.saida || 17;
    let noHorario = false;

    if (horaInicio < horaSaida) {
      noHorario = horaAtual >= horaInicio && horaAtual < horaSaida;
    } else {
      noHorario = horaAtual >= horaInicio || horaAtual < horaSaida;
    }

    if (!noHorario) return 'OFFLINE';
    if (u.status === 'OFFLINE' || !u.status) return 'ONLINE';

    return u.status;
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'ONLINE': return theme.online || '#00cc66';
      case 'EVENTO': return '#FFAE00';
      case 'ALMOCO': return theme.tert || '#4488FF'; 
      case 'INDISPONIVEL': return '#ff4444';
      case 'OFFLINE': return theme.subtext || '#aaaaaa'; 
      default: return theme.online || '#00cc66';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'ONLINE': return 'Online';
      case 'EVENTO': return 'Em Evento Externo';
      case 'ALMOCO': return 'Em almoço'; 
      case 'INDISPONIVEL': return 'Indisponível';
      case 'OFFLINE': return 'Offline';
      default: return 'Online';
    }
  };

  const alternarStatus = async (user, statusReal) => {
    if (statusReal === 'OFFLINE') {
      return Alert.alert('Aviso', 'Este técnico está fora do horário de expediente. O sistema mantém-no Offline.');
    }

    let novoStatus;
    switch(statusReal) {
      case 'ONLINE': novoStatus = 'EVENTO'; break;
      case 'EVENTO': novoStatus = 'ALMOCO'; break;
      case 'ALMOCO': novoStatus = 'INDISPONIVEL'; break;
      case 'INDISPONIVEL': novoStatus = 'ONLINE'; break;
      default: novoStatus = 'ONLINE';
    }
    
    try {
      await DataService.atualizarUsuario(user.uid || user.id, { status: novoStatus });
      if(addLog) addLog(`ALTEROU STATUS: ${user.login} para ${novoStatus}`);
    } catch (e) {
      Alert.alert('Erro', 'Falha ao alterar status.');
    }
  };

  const criarUsuario = async () => {
    if (!loginUsuario || !senha) return Alert.alert('Erro', 'Preencha os campos!');
    try {
      await DataService.registrar(loginUsuario, senha, nome, perfilNovo, predio, '', inicio, saida);
      if(addLog) addLog(`CRIOU USUÁRIO: ${loginUsuario} (${perfilNovo})`);
      Alert.alert('Sucesso', `${perfilNovo} cadastrado!`);
      setNome(''); setLoginUsuario(''); setSenha('');
    } catch (e) { Alert.alert('Erro', e.message); }
  };

  const salvarEdicao = async () => {
    if (!editUser) return;
    try {
      const payload = { 
        nomeCompleto: editUser.nomeCompleto, 
        predio: editUser.predio, 
        inicio: editUser.inicio, 
        saida: editUser.saida,
        perfil: editUser.perfil 
      };

      await DataService.atualizarUsuario(editUser.uid || editUser.id, payload);
      if(addLog) addLog(`EDITOU USUÁRIO: ${editUser.login}`);
      setModalEditVisible(false);
      Alert.alert('Sucesso', 'Usuário atualizado!');
    } catch (e) { Alert.alert('Erro', 'Falha ao atualizar.'); }
  };

  const excluirUsuarioDireto = async (u) => {
    const acaoDeletar = async () => {
      try {
        await DataService.deletarUsuario(u.uid || u.id);
        if(addLog) addLog(`EXCLUIU USUÁRIO: ${u.login}`);
        Alert.alert('Sucesso', 'Usuário apagado do sistema!');
      } catch (e) { Alert.alert('Erro', 'Falha ao excluir o usuário.'); }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Tem certeza que deseja apagar o utilizador ${u.login}?`)) {
        acaoDeletar();
      }
    } else {
      Alert.alert("Excluir Usuário", `Tem certeza que deseja apagar ${u.login}?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Sim, Excluir", style: "destructive", onPress: acaoDeletar }
      ]);
    }
  };

  const abrirModalEdicao = (u) => { setEditUser(u); setModalEditVisible(true); };

  const changeRelatorioMonth = (offset) => setRelatorioDate(new Date(relatorioDate.getFullYear(), relatorioDate.getMonth() + offset, 1));

  const gerarRelatorioMensal = () => {
    const mesSelecionado = relatorioDate.getMonth(); 
    const anoSelecionado = relatorioDate.getFullYear();

    let tecnicos = users.filter(u => u.perfil === 'TECNICO');
    if (tecnicoFiltro !== 'TODOS') tecnicos = tecnicos.filter(u => u.login === tecnicoFiltro);

    const ranking = tecnicos.map(tec => {
      const chamadosDoMes = chamados.filter(c => {
        if (c.status !== 'FECHADO' || c.tecnico !== tec.login) return false;
        const dataChamado = new Date(c.dataAbertura);
        return dataChamado.getMonth() === mesSelecionado && dataChamado.getFullYear() === anoSelecionado;
      });

      const eventosDoMes = eventos.filter(e => {
        if (e.status !== 'CONCLUIDO' || e.tecnico !== tec.login) return false;
        const dataEvento = new Date(e.data);
        return dataEvento.getMonth() === mesSelecionado && dataEvento.getFullYear() === anoSelecionado;
      });

      return {
        login: tec.login, nome: tec.nomeCompleto || tec.login, inicio: tec.inicio || 8, saida: tec.saida || 17,
        chamadosFechados: chamadosDoMes.length, eventosConcluidos: eventosDoMes.length, totalProdutividade: chamadosDoMes.length + eventosDoMes.length
      };
    });

    return ranking.sort((a, b) => b.totalProdutividade - a.totalProdutividade);
  };

  const dadosRelatorio = gerarRelatorioMensal();
  const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const totalGeralChamados = dadosRelatorio.reduce((acc, curr) => acc + curr.chamadosFechados, 0);
  const totalGeralEventos = dadosRelatorio.reduce((acc, curr) => acc + curr.eventosConcluidos, 0);
  const tecnicoDestaque = dadosRelatorio.length > 0 && dadosRelatorio[0].totalProdutividade > 0 ? dadosRelatorio[0].nome : 'Nenhum';

  const exportarPDF = async () => {
    const mesNome = mesesNomes[relatorioDate.getMonth()];
    const ano = relatorioDate.getFullYear();
    const html = `
      <html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" /><style>body { font-family: sans-serif; padding: 40px; color: #333; } .header { text-align: center; border-bottom: 2px solid #1DB954; padding-bottom: 20px; } h1 { color: #1DB954; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border-bottom: 1px solid #eee; padding: 15px; text-align: left; } th { background-color: #1DB954; color: #fff; }</style></head><body><div class="header"><h1>TechGestor</h1><div>Relatório Executivo • ${mesNome} ${ano}</div></div><table><tr><th>Técnico</th><th style="text-align: center;">Chamados</th><th style="text-align: center;">Eventos</th><th style="text-align: right;">Total Produtivo</th></tr>${dadosRelatorio.map(t => `<tr><td><strong>${t.nome}</strong></td><td style="text-align: center;">${t.chamadosFechados}</td><td style="text-align: center;">${t.eventosConcluidos}</td><td style="text-align: right; font-weight: bold; color: #1DB954;">${t.totalProdutividade}</td></tr>`).join('')}</table></body></html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      if(addLog) addLog(`GEROU PDF DO RELATÓRIO DE ${mesNome.toUpperCase()}`);
    } catch (error) { Alert.alert('Erro', 'Não foi possível gerar PDF.'); }
  };

  return (
    <ScrollView style={{ padding: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <View>
          <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>Painel Administrativo</Text>
          <Text style={{ color: theme.subtext, fontSize: 13, marginTop: 2 }}>Equipe, acessos e relatórios</Text>
        </View>
        {abaAtiva === 'RELATORIOS' && (
          <TouchableOpacity onPress={exportarPDF} style={[{ backgroundColor: theme.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.md }, SHADOW.sm]} activeOpacity={0.85}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>EXPORTAR PDF</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 20, backgroundColor: theme.card, borderRadius: RADIUS.md, padding: 5, borderWidth: 1, borderColor: theme.border }}>
        <TouchableOpacity onPress={() => setAbaAtiva('USUARIOS')} style={{ flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: RADIUS.sm, backgroundColor: abaAtiva === 'USUARIOS' ? theme.primarySoft : 'transparent' }} activeOpacity={0.75}>
          <Text style={{ color: abaAtiva === 'USUARIOS' ? theme.primary : theme.subtext, fontWeight: '700', fontSize: 12 }}>EQUIPE</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAbaAtiva('RELATORIOS')} style={{ flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: RADIUS.sm, backgroundColor: abaAtiva === 'RELATORIOS' ? theme.primarySoft : 'transparent' }} activeOpacity={0.75}>
          <Text style={{ color: abaAtiva === 'RELATORIOS' ? theme.primary : theme.subtext, fontWeight: '700', fontSize: 12 }}>RELATÓRIOS</Text>
        </TouchableOpacity>
      </View>

      {abaAtiva === 'USUARIOS' && (
        <>
          <Card theme={theme}>
            <Text style={{ color: theme.primary, fontWeight: 'bold', marginBottom: 10 }}>Cadastrar Novo Usuário</Text>
            
            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
              <TouchableOpacity onPress={() => setPerfilNovo('TECNICO')} style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: perfilNovo === 'TECNICO' ? theme.primary : theme.inputBg, marginRight: 5, alignItems: 'center' }}>
                <Text style={{ color: perfilNovo === 'TECNICO' ? '#fff' : theme.subtext, fontWeight: 'bold', fontSize: 12 }}>👨‍🔧 TÉCNICO</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPerfilNovo('ADM')} style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: perfilNovo === 'ADM' ? theme.tert : theme.inputBg, marginLeft: 5, alignItems: 'center' }}>
                <Text style={{ color: perfilNovo === 'ADM' ? '#fff' : theme.subtext, fontWeight: 'bold', fontSize: 12 }}>🛡️ ADMIN</Text>
              </TouchableOpacity>
            </View>

            <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} placeholder="Nome Completo" placeholderTextColor={theme.subtext} value={nome} onChangeText={setNome} />
            <View style={{ flexDirection: 'row' }}>
              <TextInput style={[styles.input, { flex: 1, marginRight: 5, backgroundColor: theme.inputBg, color: theme.text }]} placeholder="Login" autoCapitalize="none" placeholderTextColor={theme.subtext} value={loginUsuario} onChangeText={setLoginUsuario} />
              <TextInput style={[styles.input, { flex: 1, backgroundColor: theme.inputBg, color: theme.text }]} placeholder="Senha" secureTextEntry placeholderTextColor={theme.subtext} value={senha} onChangeText={setSenha} />
            </View>
            <View style={styles.row}>
              {SETORES.map(s => (
                <TouchableOpacity key={s} onPress={() => setPredio(s)} style={[styles.chip, { backgroundColor: predio === s ? theme.primary : theme.inputBg }]}>
                  <Text style={{ color: predio === s ? '#fff' : theme.subtext, fontSize: 12 }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Btn title={`SALVAR ${perfilNovo}`} onPress={criarUsuario} theme={theme} style={{ marginTop: 10 }} />
          </Card>

          <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 }}>Equipe Cadastrada</Text>
          {users.map(u => {
            const statusReal = getStatusReal(u); 
            return (
              <Card key={u.id} theme={theme} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderLeftWidth: 4, borderLeftColor: getStatusColor(statusReal) }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>{u.nomeCompleto || u.login} ({u.login})</Text>
                  <Text style={{ color: theme.subtext, fontSize: 12, marginBottom: 4 }}>
                    {u.perfil === 'ADM' ? '🛡️ Admin' : '👨‍🔧 Técnico'} | 🏢 {u.predio} | ⏰ {String(u.inicio).padStart(2, '0')}:00h - {String(u.saida).padStart(2, '0')}:00h
                  </Text>
                  <TouchableOpacity onPress={() => alternarStatus(u, statusReal)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: getStatusColor(statusReal), marginRight: 6 }} />
                      <Text style={{ color: getStatusColor(statusReal), fontSize: 12, fontWeight: 'bold' }}>{getStatusText(statusReal)}</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => abrirModalEdicao(u)} style={{ paddingHorizontal: 10 }}>
                    <Text style={{ fontSize: 20 }}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => excluirUsuarioDireto(u)} style={{ paddingLeft: 10 }}>
                    <Text style={{ fontSize: 20 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })}
        </>
      )}

      {abaAtiva === 'RELATORIOS' && (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
            <View style={{ backgroundColor: theme.card, flexDirection: 'row', alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: theme.border, flex: 1, marginRight: 10 }}>
              <TouchableOpacity onPress={() => changeRelatorioMonth(-1)} style={{ padding: 12 }}><Text style={{ color: theme.primary, fontWeight: 'bold' }}>{'<'}</Text></TouchableOpacity>
              <Text style={{ color: theme.text, flex: 1, textAlign: 'center', fontWeight: 'bold' }}>{mesesNomes[relatorioDate.getMonth()]} {relatorioDate.getFullYear()}</Text>
              <TouchableOpacity onPress={() => changeRelatorioMonth(1)} style={{ padding: 12 }}><Text style={{ color: theme.primary, fontWeight: 'bold' }}>{'>'}</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={{ backgroundColor: theme.card, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border, flex: 1 }} onPress={() => setShowTecsRelatorio(!showTecsRelatorio)}>
              <Text style={{ color: tecnicoFiltro === 'TODOS' ? theme.subtext : theme.text, textAlign: 'center', fontWeight: 'bold', fontSize: 12 }} numberOfLines={1}>{tecnicoFiltro === 'TODOS' ? 'Todos os Técnicos ↓' : `${tecnicoFiltro} ↓`}</Text>
            </TouchableOpacity>
          </View>
          
          {showTecsRelatorio && (
            <View style={{ backgroundColor: theme.card, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: theme.border }}>
              <TouchableOpacity onPress={() => { setTecnicoFiltro('TODOS'); setShowTecsRelatorio(false); }} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}><Text style={{ color: theme.text, textAlign: 'center' }}>Todos os Técnicos</Text></TouchableOpacity>
              {users.filter(u => u.perfil === 'TECNICO').map(t => (
                <TouchableOpacity key={t.login} onPress={() => { setTecnicoFiltro(t.login); setShowTecsRelatorio(false); }} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}><Text style={{ color: theme.primary, fontWeight: 'bold', textAlign: 'center' }}>{t.login}</Text></TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            <View style={[styles.kpiCard, { backgroundColor: theme.card, borderColor: theme.border }]}><Text style={{ color: theme.subtext, fontSize: 10, textTransform: 'uppercase', marginBottom: 5 }}>Chamados</Text><Text style={{ color: theme.primary, fontSize: 24, fontWeight: 'bold' }}>{totalGeralChamados}</Text></View>
            <View style={[styles.kpiCard, { backgroundColor: theme.card, borderColor: theme.border, marginHorizontal: 10 }]}><Text style={{ color: theme.subtext, fontSize: 10, textTransform: 'uppercase', marginBottom: 5 }}>Eventos</Text><Text style={{ color: theme.tert, fontSize: 24, fontWeight: 'bold' }}>{totalGeralEventos}</Text></View>
            <View style={[styles.kpiCard, { backgroundColor: theme.card, borderColor: theme.border }]}><Text style={{ color: theme.subtext, fontSize: 10, textTransform: 'uppercase', marginBottom: 5 }}>Destaque</Text><Text style={{ color: theme.sec, fontSize: 14, fontWeight: 'bold' }} numberOfLines={2}>{tecnicoFiltro === 'TODOS' ? tecnicoDestaque : tecnicoFiltro}</Text></View>
          </View>

          {dadosRelatorio.length > 0 && tecnicoFiltro === 'TODOS' && (
            <Card theme={theme} style={{ marginBottom: 20, alignItems: 'center' }}>
              <Text style={{ color: theme.text, fontWeight: 'bold', marginBottom: 15 }}>Produtividade Mensal</Text>
              <BarChart
                data={{
                  labels: dadosRelatorio.map(t => t.nome.split(' ')[0].substring(0, 5)), 
                  datasets: [{ data: dadosRelatorio.map(t => t.totalProdutividade) }]
                }}
                width={Dimensions.get("window").width > 400 ? Dimensions.get("window").width - 150 : 300} 
                height={220}
                yAxisLabel=""
                chartConfig={{
                  backgroundColor: theme.card,
                  backgroundGradientFrom: theme.card,
                  backgroundGradientTo: theme.card,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(29, 185, 84, ${opacity})`, 
                  labelColor: (opacity = 1) => theme.subtext,
                  style: { borderRadius: 16 },
                  barPercentage: 0.7,
                }}
                style={{ borderRadius: 16 }}
                showValuesOnTopOfBars={true}
              />
            </Card>
          )}

          <Card theme={theme} style={{ padding: 0, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', backgroundColor: theme.inputBg, paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <Text style={{ flex: 3, color: theme.subtext, fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' }}>Técnico</Text>
              <Text style={{ flex: 1.5, color: theme.subtext, fontWeight: 'bold', fontSize: 12, textAlign: 'center', textTransform: 'uppercase' }}>CH</Text>
              <Text style={{ flex: 1.5, color: theme.subtext, fontWeight: 'bold', fontSize: 12, textAlign: 'center', textTransform: 'uppercase' }}>EV</Text>
              <Text style={{ flex: 1.5, color: theme.primary, fontWeight: 'bold', fontSize: 12, textAlign: 'right', textTransform: 'uppercase' }}>Total</Text>
            </View>

            {dadosRelatorio.length === 0 || totalGeralChamados + totalGeralEventos === 0 ? (
              <View style={{ padding: 20 }}><Text style={{ color: theme.subtext, textAlign: 'center', fontStyle: 'italic' }}>Sem dados.</Text></View>
            ) : (
              dadosRelatorio.map((tec, index) => (
                <View key={tec.login} style={{ flexDirection: 'row', paddingVertical: 15, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: index % 2 === 0 ? 'transparent' : theme.inputBg, alignItems: 'center' }}>
                  <View style={{ flex: 3 }}>
                    <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>{tec.nome}</Text>
                    <Text style={{ color: theme.subtext, fontSize: 10, marginTop: 4 }}>🕒 {String(tec.inicio).padStart(2, '0')}:00 - {String(tec.saida).padStart(2, '0')}:00</Text>
                  </View>
                  <Text style={{ flex: 1.5, color: theme.text, fontSize: 14, textAlign: 'center' }}>{tec.chamadosFechados}</Text>
                  <Text style={{ flex: 1.5, color: theme.text, fontSize: 14, textAlign: 'center' }}>{tec.eventosConcluidos}</Text>
                  <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                    <View style={{ backgroundColor: theme.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>{tec.totalProdutividade}</Text></View>
                  </View>
                </View>
              ))
            )}
          </Card>
        </>
      )}

      <Modal visible={modalEditVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
            <Text style={{ color: theme.primary, fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>Editar: {editUser?.login}</Text>
            {editUser && (
              <>
                <View style={{ flexDirection: 'row', marginBottom: 15, width: '100%' }}>
                  <TouchableOpacity onPress={() => setEditUser({...editUser, perfil: 'TECNICO'})} style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: editUser.perfil === 'TECNICO' ? theme.primary : theme.inputBg, marginRight: 5, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>TÉCNICO</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditUser({...editUser, perfil: 'ADM'})} style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: editUser.perfil === 'ADM' ? theme.tert : theme.inputBg, marginLeft: 5, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>ADMIN</Text>
                  </TouchableOpacity>
                </View>

                <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, width: '100%' }]} value={editUser.nomeCompleto} onChangeText={(t) => setEditUser({...editUser, nomeCompleto: t})} placeholder="Nome Completo" placeholderTextColor={theme.subtext} />
                
                <View style={{ flexDirection: 'row', width: '100%', marginTop: 10, justifyContent: 'space-between' }}>
                  <View style={{ width: '48%' }}>
                    <Text style={{ color: theme.subtext, fontSize: 11, marginBottom: 2, marginLeft: 4, fontWeight: 'bold' }}>ENTRADA (h)</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, width: '100%', textAlign: 'center' }]} 
                      value={String(editUser.inicio)} 
                      onChangeText={(t) => setEditUser({...editUser, inicio: Number(t)})} 
                      placeholder="Ex: 8" 
                      keyboardType="numeric"
                      maxLength={2}
                      placeholderTextColor={theme.subtext}
                    />
                  </View>
                  <View style={{ width: '48%' }}>
                    <Text style={{ color: theme.subtext, fontSize: 11, marginBottom: 2, marginLeft: 4, fontWeight: 'bold' }}>SAÍDA (h)</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, width: '100%', textAlign: 'center' }]} 
                      value={String(editUser.saida)} 
                      onChangeText={(t) => setEditUser({...editUser, saida: Number(t)})} 
                      placeholder="Ex: 17" 
                      keyboardType="numeric" 
                      maxLength={2}
                      placeholderTextColor={theme.subtext}
                    />
                  </View>
                </View>

                <View style={[styles.row, { width: '100%', marginBottom: 15, marginTop: 10 }]}>
                  {SETORES.map(s => (
                    <TouchableOpacity key={s} onPress={() => setEditUser({...editUser, predio: s})} style={[styles.chip, { backgroundColor: editUser.predio === s ? theme.primary : theme.inputBg }]}>
                      <Text style={{ color: editUser.predio === s ? '#fff' : theme.subtext, fontSize: 11 }}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            
            <View style={{ flexDirection: 'column', width: '100%', marginTop: 15 }}>
              <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginBottom: 10 }}>
                <Btn title="CANCELAR" onPress={() => setModalEditVisible(false)} theme={theme} outline style={{ flex: 1, marginRight: 5 }} />
                <Btn title="SALVAR" onPress={salvarEdicao} theme={theme} style={{ flex: 1, marginLeft: 5 }} />
              </View>
              <TouchableOpacity onPress={() => excluirUsuarioDireto(editUser)} style={{ backgroundColor: theme.offline, padding: 13, borderRadius: RADIUS.md, alignItems: 'center' }} activeOpacity={0.85}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>EXCLUIR USUÁRIO</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }}/>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: { padding: 12, borderRadius: RADIUS.md, marginVertical: 5, borderWidth: 1, borderColor: 'rgba(140,150,160,0.28)' },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  chip: { padding: 9, borderRadius: RADIUS.pill, marginRight: 6, marginBottom: 6, paddingHorizontal: 12 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(4,6,8,0.72)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 350, borderRadius: RADIUS.xl, padding: 22, alignItems: 'center', ...SHADOW.lg },
  kpiCard: { flex: 1, padding: 16, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }
});