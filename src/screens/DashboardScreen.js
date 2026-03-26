import { getAuth } from 'firebase/auth'; // <--- Importação para identificar quem está logado
import { useEffect, useState } from 'react';
import { Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Card } from '../components';

export default function DashboardScreen({ chamados = [], eventos = [], users = [], theme }) {
  const [modalNotificacoes, setModalNotificacoes] = useState(false);
  const [ultimaAbertura, setUltimaAbertura] = useState(0);
  
  // --- IDENTIFICAÇÃO DO USUÁRIO LOGADO ---
  const auth = getAuth();
  const usuarioLogado = users.find(u => u.uid === auth.currentUser?.uid);

  // --- RELÓGIO AUTOMÁTICO ---
  const [horaAtual, setHoraAtual] = useState(new Date().getHours());

  useEffect(() => {
    const interval = setInterval(() => {
      setHoraAtual(new Date().getHours());
    }, 60000); 
    return () => clearInterval(interval);
  }, []);

  // --- INTELIGÊNCIA DE STATUS ---
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
      default: return theme.subtext || '#aaaaaa';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'ONLINE': return 'Online';
      case 'EVENTO': return 'Em Evento Externo';
      case 'ALMOCO': return 'Em almoço';
      case 'INDISPONIVEL': return 'Indisponível';
      case 'OFFLINE': return 'Offline';
      default: return 'Desconhecido';
    }
  };
  // ---------------------------------------------------------

  const listaChamados = chamados || [];
  const listaEventos = eventos || [];
  const listaUsers = users || [];

  const tecnicos = listaUsers
    .filter((u) => u.perfil === 'TECNICO')
    .sort((a, b) => a.login.localeCompare(b.login));

  const chamadosAbertos = listaChamados.filter(c => c.status === 'ABERTO').length;
  const chamadosAndamento = listaChamados.filter(c => c.status === 'EM ANDAMENTO').length;
  const chamadosConcluidos = listaChamados.filter(c => c.status === 'FECHADO' || c.status === 'CONCLUÍDO').length;
  const chamadosTotal = listaChamados.length;

  const equipeOnline = listaUsers.filter(u => getStatusReal(u) === 'ONLINE').length;
  const totalEquipe = listaUsers.length;
  const eventosAtivos = listaEventos.length;

  const ultimosChamados = listaChamados.slice(0, 5);

  const chartData = [
    { name: 'Abertos', population: chamadosAbertos, color: theme.offline || '#ff4444', legendFontColor: theme.subtext, legendFontSize: 12 },
    { name: 'Andamento', population: chamadosAndamento, color: theme.sec || '#FFAE00', legendFontColor: theme.subtext, legendFontSize: 12 },
    { name: 'Concluídos', population: chamadosConcluidos, color: theme.primary || '#1DB954', legendFontColor: theme.subtext, legendFontSize: 12 }
  ];

  const formatarTempo = (timestamp) => {
    if (!timestamp) return 'Desconhecido';
    const diff = Date.now() - timestamp;
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Agora mesmo';
    if (min < 60) return `Há ${min} min`;
    const horas = Math.floor(min / 60);
    if (horas < 24) return `Há ${horas}h`;
    return `Há ${Math.floor(horas / 24)} dias`;
  };

  const feedNotificacoes = [...listaChamados, ...listaEventos]
    .map(item => {
      const isChamado = item.descricao !== undefined;
      const dataItem = item.dataAbertura || item.data || 0;
      
      let icone = '📌';
      if (isChamado) icone = item.status === 'FECHADO' ? '✅' : '🚨';
      else icone = item.status === 'CONCLUIDO' ? '🏁' : '📅';

      return {
        id: item.id,
        icone,
        titulo: isChamado ? item.descricao : item.nome,
        subtitulo: isChamado ? `Chamado • ${item.predio}` : `Evento ${item.tipo}`,
        status: item.status,
        data: dataItem,
        tecnico: item.tecnico
      };
    })
    .sort((a, b) => b.data - a.data)
    .slice(0, 15);

  const notificacoesNaoLidas = feedNotificacoes.filter(n => n.data > ultimaAbertura).length;

  const abrirSininho = () => {
    setModalNotificacoes(true);
    setUltimaAbertura(Date.now());
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <Text style={[styles.title, { color: theme.primary, marginBottom: 0 }]}>📊 Visão Geral</Text>
        
        <TouchableOpacity onPress={abrirSininho} style={styles.bellBtn}>
          <Text style={{ fontSize: 24 }}>🔔</Text>
          {notificacoesNaoLidas > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificacoesNaoLidas > 9 ? '9+' : notificacoesNaoLidas}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* NOVO: CARTÃO DE IDENTIDADE DO TÉCNICO LOGADO */}
      {usuarioLogado && (
        <Card theme={theme} style={{ marginBottom: 20, padding: 15, borderLeftWidth: 5, borderLeftColor: getStatusColor(getStatusReal(usuarioLogado)), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: theme.subtext, fontSize: 11, textTransform: 'uppercase', fontWeight: 'bold' }}>Meu Status Atual</Text>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>{usuarioLogado.nomeCompleto || usuarioLogado.login}</Text>
            <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>🏢 {usuarioLogado.predio} | ⏰ {String(usuarioLogado.inicio).padStart(2, '0')}h - {String(usuarioLogado.saida).padStart(2, '0')}h</Text>
          </View>
          <View style={{ alignItems: 'center', backgroundColor: theme.inputBg, padding: 10, borderRadius: 10 }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: getStatusColor(getStatusReal(usuarioLogado)), marginBottom: 6 }} />
            <Text style={{ color: getStatusColor(getStatusReal(usuarioLogado)), fontWeight: 'bold', fontSize: 12, textAlign: 'center' }}>
              {getStatusText(getStatusReal(usuarioLogado))}
            </Text>
          </View>
        </Card>
      )}
      
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginTop: 5 }}>Resumo de Chamados</Text>
      <View style={styles.cardsRow}>
        <Card theme={theme} style={[styles.cardMetrica, { borderBottomWidth: 4, borderBottomColor: theme.offline || '#ff4444' }]}>
          <Text style={{ color: theme.text, fontSize: 14 }}>Abertos</Text>
          <Text style={{ color: theme.offline || '#ff4444', fontSize: 32, fontWeight: 'bold' }}>{chamadosAbertos}</Text>
        </Card>
        
        <Card theme={theme} style={[styles.cardMetrica, { borderBottomWidth: 4, borderBottomColor: theme.sec || '#FFAE00' }]}>
          <Text style={{ color: theme.text, fontSize: 14 }}>Andamento</Text>
          <Text style={{ color: theme.sec || '#FFAE00', fontSize: 32, fontWeight: 'bold' }}>{chamadosAndamento}</Text>
        </Card>

        <Card theme={theme} style={[styles.cardMetrica, { borderBottomWidth: 4, borderBottomColor: theme.primary }]}>
          <Text style={{ color: theme.text, fontSize: 14 }}>Concluídos</Text>
          <Text style={{ color: theme.primary, fontSize: 32, fontWeight: 'bold' }}>{chamadosConcluidos}</Text>
        </Card>

        <Card theme={theme} style={[styles.cardMetrica, { borderBottomWidth: 4, borderBottomColor: theme.tert || '#4488FF' }]}>
          <Text style={{ color: theme.text, fontSize: 14 }}>Total</Text>
          <Text style={{ color: theme.tert || '#4488FF', fontSize: 32, fontWeight: 'bold' }}>{chamadosTotal}</Text>
        </Card>
      </View>

      <Card theme={theme} style={{ alignItems: 'center', marginTop: 15, paddingVertical: 15 }}>
        <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>Desempenho Geral</Text>
        {chamadosTotal === 0 ? (
          <Text style={{ color: theme.subtext, fontStyle: 'italic', marginVertical: 20 }}>Nenhum dado para gerar o gráfico.</Text>
        ) : (
          <PieChart
            data={chartData}
            width={Dimensions.get("window").width > 400 ? Dimensions.get("window").width - 100 : 300}
            height={160}
            chartConfig={{ color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})` }}
            accessor={"population"}
            backgroundColor={"transparent"}
            paddingLeft={"15"}
            center={[10, 0]}
            absolute
          />
        )}
      </Card>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }}>
        <Card theme={theme} style={{ flex: 1, marginRight: 8, alignItems: 'center', padding: 20 }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }}>👨‍💻 Equipe Online</Text>
          <Text style={{ color: theme.online, fontSize: 28, fontWeight: 'bold', marginTop: 10 }}>
            {equipeOnline} <Text style={{ fontSize: 16, color: theme.subtext }}>/ {totalEquipe}</Text>
          </Text>
        </Card>

        <Card theme={theme} style={{ flex: 1, marginLeft: 8, alignItems: 'center', padding: 20 }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }}>🎉 Eventos Ativos</Text>
          <Text style={{ color: theme.sec, fontSize: 28, fontWeight: 'bold', marginTop: 10 }}>{eventosAtivos}</Text>
        </Card>
      </View>

      <Text style={[styles.title, { color: theme.primary, fontSize: 16, marginTop: 25 }]}>📍 Monitor da Equipe</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {tecnicos.map((t) => {
          const chamadoAtivo = listaChamados.find((c) => c.tecnico === t.login && (c.status === 'ABERTO' || c.status === 'EM ANDAMENTO'));
          const localAtual = chamadoAtivo ? chamadoAtivo.predio : t.predio || 'Base';
          const isLivre = !chamadoAtivo;
          
          const statusReal = getStatusReal(t);
          let statusColor = getStatusColor(statusReal);
          let statusText = getStatusText(statusReal);

          if (statusReal === 'ONLINE') {
            if (isLivre) {
              statusText = 'Online (Livre)';
            } else {
              statusColor = theme.sec || '#FFAE00'; 
              statusText = 'Em Atendimento';
            }
          }

          return (
            <View key={t.login} style={{ width: '48%', backgroundColor: theme.card, padding: 12, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: statusColor }}>
              <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 13 }} numberOfLines={1}>{t.login}</Text>
              <Text style={{ color: theme.subtext, fontSize: 10, marginTop: 4 }}>📍 {localAtual}</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor, marginRight: 5 }} />
                <Text style={{ color: statusColor, fontSize: 10, fontWeight: 'bold' }}>{statusText}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginTop: 15 }}>Últimos Chamados Registrados</Text>
      
      {ultimosChamados.length === 0 ? (
        <Card theme={theme}>
          <Text style={{ color: theme.subtext, textAlign: 'center' }}>Nenhum chamado registrado no banco de dados.</Text>
        </Card>
      ) : (
        ultimosChamados.map(chamado => (
          <Card key={chamado.id} theme={theme} style={{ padding: 15, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: chamado.status === 'ABERTO' ? (theme.offline || '#ff4444') : chamado.status === 'EM ANDAMENTO' ? (theme.sec || '#FFAE00') : theme.primary }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>{chamado.descricao || 'Sem descrição'}</Text>
              <Text style={{ color: chamado.status === 'ABERTO' ? (theme.offline || '#ff4444') : chamado.status === 'EM ANDAMENTO' ? (theme.sec || '#FFAE00') : theme.primary, fontWeight: 'bold', fontSize: 12 }}>
                {chamado.status}
              </Text>
            </View>
            <Text style={{ color: theme.subtext, marginTop: 5, fontSize: 12 }}>📍 {chamado.predio} | 👨‍🔧 {chamado.tecnico || 'Fila'}</Text>
          </Card>
        ))
      )}

      <Modal visible={modalNotificacoes} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, borderColor: theme.border }]}>
            
            <View style={styles.modalHeader}>
              <Text style={{ color: theme.primary, fontSize: 20, fontWeight: 'bold' }}>🔔 Histórico Recente</Text>
              <TouchableOpacity onPress={() => setModalNotificacoes(false)}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }}>✕ Fechar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, padding: 20 }}>
              {feedNotificacoes.length === 0 ? (
                <Text style={{ color: theme.subtext, textAlign: 'center', marginTop: 50 }}>Nenhuma atividade registada no sistema.</Text>
              ) : (
                feedNotificacoes.map((item) => (
                  <View key={item.id} style={{ flexDirection: 'row', backgroundColor: theme.card, padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: theme.border }}>
                    <Text style={{ fontSize: 24, marginRight: 15 }}>{item.icone}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 14 }} numberOfLines={2}>{item.titulo}</Text>
                      <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 2 }}>{item.subtitulo}</Text>
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <Text style={{ color: theme.primary, fontSize: 11, fontWeight: 'bold' }}>👨‍🔧 {item.tecnico || 'FILA'}</Text>
                        <Text style={{ color: theme.subtext, fontSize: 10 }}>⏱ {formatarTempo(item.data)}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardMetrica: { flex: 1, minWidth: 120, margin: 5, alignItems: 'center', padding: 20 },
  
  bellBtn: { padding: 10, backgroundColor: '#222', borderRadius: 50, position: 'relative' },
  badge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#ff4444', borderRadius: 12, width: 22, height: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#121212' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { height: '80%', borderTopLeftRadius: 25, borderTopRightRadius: 25, borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' }
});