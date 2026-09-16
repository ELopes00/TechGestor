import { getAuth } from 'firebase/auth'; // <--- Importação para identificar quem está logado
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../components';
import { RADIUS, SHADOW } from '../theme/themes';

const PERIODOS = [
  { id: 'HOJE', label: 'Hoje' },
  { id: 'SEMANA', label: '7 dias' },
  { id: 'MES', label: '30 dias' },
  { id: 'TUDO', label: 'Tudo' },
];

export default function DashboardScreen({ chamados = [], eventos = [], users = [], theme, setTelaAtiva }) {
  const [modalNotificacoes, setModalNotificacoes] = useState(false);
  const [ultimaAbertura, setUltimaAbertura] = useState(0);
  const [periodo, setPeriodo] = useState('SEMANA');
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState(null);

  // --- INDICADOR "AO VIVO" ---
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

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
  const taxaConclusao = chamadosTotal > 0 ? Math.round((chamadosConcluidos / chamadosTotal) * 100) : 0;

  const equipeOnline = listaUsers.filter(u => getStatusReal(u) === 'ONLINE').length;
  const totalEquipe = listaUsers.length;
  const eventosAtivos = listaEventos.length;

  // --- FILTRO DE PERÍODO (afeta o gráfico e a atividade recente) ---
  const agora = Date.now();
  const cutoffPorPeriodo = { HOJE: 24 * 60 * 60 * 1000, SEMANA: 7 * 24 * 60 * 60 * 1000, MES: 30 * 24 * 60 * 60 * 1000, TUDO: Infinity };
  const cutoff = agora - cutoffPorPeriodo[periodo];

  const chamadosNoPeriodo = listaChamados.filter(c => periodo === 'TUDO' || (c.dataAbertura && c.dataAbertura >= cutoff));

  const abertosPeriodo = chamadosNoPeriodo.filter(c => c.status === 'ABERTO').length;
  const andamentoPeriodo = chamadosNoPeriodo.filter(c => c.status === 'EM ANDAMENTO').length;
  const concluidosPeriodo = chamadosNoPeriodo.filter(c => c.status === 'FECHADO' || c.status === 'CONCLUÍDO').length;

  const ultimosChamados = [...chamadosNoPeriodo].sort((a, b) => (b.dataAbertura || 0) - (a.dataAbertura || 0)).slice(0, 8);

  const chartData = [
    { name: 'Abertos', population: abertosPeriodo, color: theme.offline || '#ff4444', legendFontColor: theme.subtext, legendFontSize: 12 },
    { name: 'Andamento', population: andamentoPeriodo, color: theme.sec || '#FFAE00', legendFontColor: theme.subtext, legendFontSize: 12 },
    { name: 'Concluídos', population: concluidosPeriodo, color: theme.primary || '#1DB954', legendFontColor: theme.subtext, legendFontSize: 12 }
  ];
  const totalNoPeriodo = abertosPeriodo + andamentoPeriodo + concluidosPeriodo;

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
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.title, { color: theme.text, marginBottom: 2 }]}>Visão Geral</Text>
            <View style={[styles.liveBadge, { backgroundColor: theme.primarySoft }]}>
              <Animated.View style={[styles.liveDot, { backgroundColor: theme.primary, opacity: pulseAnim }]} />
              <Text style={{ color: theme.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.3 }}>AO VIVO</Text>
            </View>
          </View>
          <Text style={{ color: theme.subtext, fontSize: 13 }}>Acompanhe a operação em tempo real</Text>
        </View>

        <TouchableOpacity onPress={abrirSininho} style={[styles.bellBtn, { backgroundColor: theme.cardAlt, borderColor: theme.border }]} activeOpacity={0.75}>
          <MaterialIcons name="notifications-none" size={22} color={theme.text} />
          {notificacoesNaoLidas > 0 && (
            <View style={[styles.badge, { borderColor: theme.background, backgroundColor: theme.offline }]}>
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
          <View style={{ alignItems: 'center', backgroundColor: theme.cardAlt, padding: 10, borderRadius: RADIUS.md }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: getStatusColor(getStatusReal(usuarioLogado)), marginBottom: 6 }} />
            <Text style={{ color: getStatusColor(getStatusReal(usuarioLogado)), fontWeight: 'bold', fontSize: 12, textAlign: 'center' }}>
              {getStatusText(getStatusReal(usuarioLogado))}
            </Text>
          </View>
        </Card>
      )}
      
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Resumo de Chamados</Text>
      <View style={styles.cardsRow}>
        <TouchableOpacity activeOpacity={0.7} style={styles.cardMetricaWrap} onPress={() => setTelaAtiva && setTelaAtiva('CHAMADOS')}>
          <Card theme={theme} style={[styles.cardMetrica, { borderLeftWidth: 3, borderLeftColor: theme.offline }]}>
            <Text style={{ color: theme.subtext, fontSize: 13 }}>Abertos</Text>
            <Text style={{ color: theme.text, fontSize: 30, fontWeight: '800', marginTop: 4 }}>{chamadosAbertos}</Text>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} style={styles.cardMetricaWrap} onPress={() => setTelaAtiva && setTelaAtiva('CHAMADOS')}>
          <Card theme={theme} style={[styles.cardMetrica, { borderLeftWidth: 3, borderLeftColor: theme.sec }]}>
            <Text style={{ color: theme.subtext, fontSize: 13 }}>Andamento</Text>
            <Text style={{ color: theme.text, fontSize: 30, fontWeight: '800', marginTop: 4 }}>{chamadosAndamento}</Text>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} style={styles.cardMetricaWrap} onPress={() => setTelaAtiva && setTelaAtiva('CHAMADOS')}>
          <Card theme={theme} style={[styles.cardMetrica, { borderLeftWidth: 3, borderLeftColor: theme.primary }]}>
            <Text style={{ color: theme.subtext, fontSize: 13 }}>Concluídos</Text>
            <Text style={{ color: theme.text, fontSize: 30, fontWeight: '800', marginTop: 4 }}>{chamadosConcluidos}</Text>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} style={styles.cardMetricaWrap} onPress={() => setTelaAtiva && setTelaAtiva('CHAMADOS')}>
          <Card theme={theme} style={[styles.cardMetrica, { borderLeftWidth: 3, borderLeftColor: theme.tert }]}>
            <Text style={{ color: theme.subtext, fontSize: 13 }}>Total</Text>
            <Text style={{ color: theme.text, fontSize: 30, fontWeight: '800', marginTop: 4 }}>{chamadosTotal}</Text>
          </Card>
        </TouchableOpacity>
      </View>

      {chamadosTotal > 0 && (
        <Card theme={theme} style={{ marginTop: 4, paddingVertical: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>Taxa de Conclusão</Text>
            <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 13 }}>{taxaConclusao}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.cardAlt }]}>
            <View style={[styles.progressFill, { width: `${taxaConclusao}%`, backgroundColor: theme.primary }]} />
          </View>
        </Card>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 12 }}>
        <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Atividade no Período</Text>
        <View style={[styles.periodTabs, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
          {PERIODOS.map(p => (
            <TouchableOpacity
              key={p.id}
              onPress={() => setPeriodo(p.id)}
              activeOpacity={0.75}
              style={[styles.periodTab, periodo === p.id && { backgroundColor: theme.primary }]}
            >
              <Text style={{ color: periodo === p.id ? '#fff' : theme.subtext, fontSize: 10.5, fontWeight: '700' }}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Card theme={theme} style={{ alignItems: 'center', paddingVertical: 18 }}>
        {totalNoPeriodo === 0 ? (
          <Text style={{ color: theme.subtext, fontStyle: 'italic', marginVertical: 20 }}>Nenhum chamado neste período.</Text>
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

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
        <TouchableOpacity
          activeOpacity={usuarioLogado?.perfil === 'ADM' ? 0.7 : 1}
          style={{ flex: 1, marginRight: 8 }}
          onPress={() => usuarioLogado?.perfil === 'ADM' && setTelaAtiva && setTelaAtiva('ADMIN')}
        >
          <Card theme={theme} style={{ alignItems: 'center', padding: 18 }}>
            <Text style={{ color: theme.subtext, fontSize: 13, fontWeight: '600' }}>Equipe Online</Text>
            <Text style={{ color: theme.online, fontSize: 26, fontWeight: '800', marginTop: 8 }}>
              {equipeOnline} <Text style={{ fontSize: 15, color: theme.subtext, fontWeight: '600' }}>/ {totalEquipe}</Text>
            </Text>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} style={{ flex: 1, marginLeft: 8 }} onPress={() => setTelaAtiva && setTelaAtiva('EVENTOS')}>
          <Card theme={theme} style={{ alignItems: 'center', padding: 18 }}>
            <Text style={{ color: theme.subtext, fontSize: 13, fontWeight: '600' }}>Eventos Ativos</Text>
            <Text style={{ color: theme.sec, fontSize: 26, fontWeight: '800', marginTop: 8 }}>{eventosAtivos}</Text>
          </Card>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 22 }]}>Monitor da Equipe</Text>
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
              statusColor = theme.sec;
              statusText = 'Em Atendimento';
            }
          }

          return (
            <TouchableOpacity
              key={t.login}
              activeOpacity={0.75}
              style={[styles.teamCard, SHADOW.sm, { backgroundColor: theme.card, borderColor: theme.border, borderLeftColor: statusColor }]}
              onPress={() => setTecnicoSelecionado({ ...t, statusColor, statusText, localAtual, chamadoAtivo })}
            >
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{t.login}</Text>
              <Text style={{ color: theme.subtext, fontSize: 11, marginTop: 4 }}>{localAtual}</Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: statusColor, marginRight: 6 }} />
                <Text style={{ color: statusColor, fontSize: 10.5, fontWeight: '700' }}>{statusText}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 22 }]}>Últimos Chamados Registrados</Text>

      {ultimosChamados.length === 0 ? (
        <Card theme={theme}>
          <Text style={{ color: theme.subtext, textAlign: 'center' }}>Nenhum chamado registrado no banco de dados.</Text>
        </Card>
      ) : (
        ultimosChamados.map(chamado => {
          const corStatus = chamado.status === 'ABERTO' ? theme.offline : chamado.status === 'EM ANDAMENTO' ? theme.sec : theme.primary;
          return (
            <Card key={chamado.id} theme={theme} style={{ padding: 16, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: corStatus }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15, flex: 1, marginRight: 10 }}>{chamado.descricao || 'Sem descrição'}</Text>
                <Text style={{ color: corStatus, fontWeight: '700', fontSize: 11 }}>
                  {chamado.status}
                </Text>
              </View>
              <Text style={{ color: theme.subtext, marginTop: 6, fontSize: 12 }}>{chamado.predio} · {chamado.tecnico || 'Fila'}</Text>
            </Card>
          );
        })
      )}

      <Modal visible={!!tecnicoSelecionado} transparent animationType="fade" onRequestClose={() => setTecnicoSelecionado(null)}>
        <TouchableOpacity style={[styles.centerModalBg, { backgroundColor: theme.overlay }]} activeOpacity={1} onPress={() => setTecnicoSelecionado(null)}>
          <TouchableOpacity activeOpacity={1} style={[styles.techModalCard, { backgroundColor: theme.surface, borderColor: theme.border }, SHADOW.lg]}>
            {tecnicoSelecionado && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>{tecnicoSelecionado.nomeCompleto || tecnicoSelecionado.login}</Text>
                    <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 2 }}>@{tecnicoSelecionado.login}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setTecnicoSelecionado(null)} activeOpacity={0.7}>
                    <MaterialIcons name="close" size={20} color={theme.subtext} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.techStatusRow, { backgroundColor: theme.cardAlt }]}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tecnicoSelecionado.statusColor, marginRight: 8 }} />
                  <Text style={{ color: tecnicoSelecionado.statusColor, fontWeight: '700', fontSize: 13 }}>{tecnicoSelecionado.statusText}</Text>
                </View>

                <View style={{ marginTop: 14 }}>
                  <Text style={{ color: theme.subtext, fontSize: 11, textTransform: 'uppercase', fontWeight: '700' }}>Localização atual</Text>
                  <Text style={{ color: theme.text, fontSize: 14, marginTop: 4 }}>{tecnicoSelecionado.localAtual}</Text>
                </View>

                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: theme.subtext, fontSize: 11, textTransform: 'uppercase', fontWeight: '700' }}>Horário de expediente</Text>
                  <Text style={{ color: theme.text, fontSize: 14, marginTop: 4 }}>{String(tecnicoSelecionado.inicio ?? 8).padStart(2, '0')}h – {String(tecnicoSelecionado.saida ?? 17).padStart(2, '0')}h</Text>
                </View>

                {tecnicoSelecionado.chamadoAtivo && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ color: theme.subtext, fontSize: 11, textTransform: 'uppercase', fontWeight: '700' }}>Atendendo agora</Text>
                    <Text style={{ color: theme.text, fontSize: 14, marginTop: 4 }} numberOfLines={2}>{tecnicoSelecionado.chamadoAtivo.descricao || 'Chamado sem descrição'}</Text>
                  </View>
                )}

                {setTelaAtiva && (
                  <TouchableOpacity
                    style={[{ marginTop: 18, backgroundColor: theme.primary, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' }]}
                    activeOpacity={0.85}
                    onPress={() => { setTelaAtiva('CHAMADOS'); setTecnicoSelecionado(null); }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>VER CHAMADOS</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalNotificacoes} transparent animationType="slide">
        <View style={[styles.modalBg, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>

            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>Histórico Recente</Text>
              <TouchableOpacity onPress={() => setModalNotificacoes(false)} activeOpacity={0.7}>
                <MaterialIcons name="close" size={22} color={theme.subtext} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, padding: 20 }}>
              {feedNotificacoes.length === 0 ? (
                <Text style={{ color: theme.subtext, textAlign: 'center', marginTop: 50 }}>Nenhuma atividade registada no sistema.</Text>
              ) : (
                feedNotificacoes.map((item) => (
                  <View key={item.id} style={[styles.feedItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={{ fontSize: 22, marginRight: 14 }}>{item.icone}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }} numberOfLines={2}>{item.titulo}</Text>
                      <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 2 }}>{item.subtitulo}</Text>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '700' }}>{item.tecnico || 'FILA'}</Text>
                        <Text style={{ color: theme.subtext, fontSize: 10 }}>{formatarTempo(item.data)}</Text>
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
  title: { fontSize: 22, fontWeight: '800' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardMetricaWrap: { flex: 1, minWidth: 120, margin: 5 },
  cardMetrica: { padding: 18, marginBottom: 0 },

  liveBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill, marginLeft: 10, gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },

  progressTrack: { height: 8, borderRadius: RADIUS.pill, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: RADIUS.pill },

  periodTabs: { flexDirection: 'row', borderRadius: RADIUS.pill, borderWidth: 1, padding: 3 },
  periodTab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.pill },

  bellBtn: { width: 42, height: 42, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badge: { position: 'absolute', top: -4, right: -4, borderRadius: 12, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  teamCard: { width: '48%', padding: 14, borderRadius: RADIUS.md, marginBottom: 10, borderWidth: 1, borderLeftWidth: 3 },

  modalBg: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { height: '80%', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  feedItem: { flexDirection: 'row', padding: 14, borderRadius: RADIUS.md, marginBottom: 10, borderWidth: 1 },

  centerModalBg: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  techModalCard: { width: '100%', maxWidth: 360, borderRadius: RADIUS.xl, borderWidth: 1, padding: 22 },
  techStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingVertical: 8, paddingHorizontal: 12, borderRadius: RADIUS.md, alignSelf: 'flex-start' },
});