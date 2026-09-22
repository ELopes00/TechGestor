import { getAuth } from 'firebase/auth'; // <--- Importação para identificar quem está logado
import { useEffect, useId, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import Svg, { Circle, Defs, G, LinearGradient, Path, Polygon, Polyline, Stop } from 'react-native-svg';
import * as XLSX from 'xlsx';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../components';
import { RADIUS, SHADOW } from '../theme/themes';
import { getStatusCategoria, getDataFechamento, calcularSLA, calcularMTTR, formatarMinutos, getCorPrioridade } from '../utils/helpers';

const PERIODOS = [
  { id: 'HOJE', label: 'Hoje' },
  { id: 'SEMANA', label: '7 dias' },
  { id: 'MES', label: '30 dias' },
  { id: 'TUDO', label: 'Tudo' },
];

export default function DashboardScreen({ chamados = [], eventos = [], users = [], theme, setTelaAtiva, irParaChamados }) {
  const [modalNotificacoes, setModalNotificacoes] = useState(false);
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

    // "Em Evento Externo" é derivado de um Evento real (não um rótulo manual) —
    // evita mostrar o técnico como escalado num evento externo que não existe.
    const emEventoExterno = (eventos || []).some((ev) =>
      ev.tecnico === u.login && ev.tipo === 'EXTERNO' &&
      ev.status !== 'finalizado' && ev.status !== 'FECHADO' && ev.status !== 'CONCLUIDO'
    );
    if (emEventoExterno) return 'EVENTO';

    // Almoço automático pela escala: começa 4h após o início do expediente e
    // dura 1h (quem entra às 8h almoça 12h-13h; quem entra às 9h, 13h-14h).
    // Fica visível sozinho, sem depender do técnico lembrar de apertar Pausa.
    const horaAlmocoInicio = (horaInicio + 4) % 24;
    const horaAlmocoFim = (horaInicio + 5) % 24;
    const emHorarioDeAlmoco = horaAlmocoInicio < horaAlmocoFim
      ? horaAtual >= horaAlmocoInicio && horaAtual < horaAlmocoFim
      : horaAtual >= horaAlmocoInicio || horaAtual < horaAlmocoFim;
    if (emHorarioDeAlmoco) return 'ALMOCO';

    if (u.status === 'OFFLINE' || !u.status || u.status === 'EVENTO' || u.status === 'ALMOCO') return 'ONLINE';
    return u.status;
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'ONLINE': return theme.online;
      case 'EVENTO': return theme.sec;
      case 'ALMOCO': return theme.tert;
      case 'INDISPONIVEL': return theme.offline;
      case 'OFFLINE': return theme.subtext;
      default: return theme.subtext;
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

  const chamadosAbertos = listaChamados.filter(c => getStatusCategoria(c.status) === 'ABERTO').length;
  const chamadosAndamento = listaChamados.filter(c => getStatusCategoria(c.status) === 'ANDAMENTO').length;
  const chamadosConcluidos = listaChamados.filter(c => getStatusCategoria(c.status) === 'CONCLUIDO').length;
  const chamadosTotal = listaChamados.length;
  const taxaConclusao = chamadosTotal > 0 ? Math.round((chamadosConcluidos / chamadosTotal) * 100) : 0;

  const slaPercent = calcularSLA(listaChamados);
  const mttrMinutos = calcularMTTR(listaChamados);

  // --- TENDÊNCIA DOS ÚLTIMOS 7 DIAS (mini-gráficos dos cards) ---
  const diaDeTimestamp = (ts) => Math.floor(ts / (24 * 60 * 60 * 1000));
  const hojeDia = diaDeTimestamp(Date.now());

  const tendenciaAbertura = Array.from({ length: 7 }, (_, i) => {
    const dia = hojeDia - (6 - i);
    return listaChamados.filter(c => c.dataAbertura && diaDeTimestamp(c.dataAbertura) === dia).length;
  });

  const tendenciaFechamento = Array.from({ length: 7 }, (_, i) => {
    const dia = hojeDia - (6 - i);
    return listaChamados.filter(c => {
      const fechamento = getDataFechamento(c);
      return fechamento && diaDeTimestamp(fechamento) === dia;
    }).length;
  });

  const tendenciaMTTR = Array.from({ length: 7 }, (_, i) => {
    const dia = hojeDia - (6 - i);
    const doDia = listaChamados.filter(c => {
      const fechamento = getDataFechamento(c);
      return fechamento && c.dataAbertura && diaDeTimestamp(fechamento) === dia;
    });
    if (doDia.length === 0) return 0;
    const mediaMs = doDia.reduce((soma, c) => soma + (getDataFechamento(c) - c.dataAbertura), 0) / doDia.length;
    return Math.round(mediaMs / 60000);
  });

  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(Date.now());
  useEffect(() => { setUltimaAtualizacao(Date.now()); }, [chamados]);
  const [horaRelogio, setHoraRelogio] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setHoraRelogio(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const exportarDados = () => {
    const linhas = listaChamados.map(c => ({
      Titulo: c.titulo || c.descricao || '',
      Status: c.status || '',
      Prioridade: c.prioridade || '',
      Predio: c.predio || '',
      Tecnico: c.tecnico || 'Fila',
      Abertura: c.dataAbertura ? new Date(c.dataAbertura).toLocaleString('pt-BR') : '',
      Fechamento: getDataFechamento(c) ? new Date(getDataFechamento(c)).toLocaleString('pt-BR') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(linhas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chamados');
    if (Platform.OS === 'web') {
      XLSX.writeFile(wb, 'TechGestor_Chamados.xlsx');
    }
  };

  const severidadeCounts = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'].reduce((acc, sev) => {
    acc[sev] = listaChamados.filter(c => (c.prioridade || 'BAIXA') === sev && getStatusCategoria(c.status) !== 'CONCLUIDO').length;
    return acc;
  }, {});

  const equipeOnline = listaUsers.filter(u => getStatusReal(u) === 'ONLINE').length;
  const totalEquipe = listaUsers.length;
  const eventosAtivos = listaEventos.length;

  // --- FILTRO DE PERÍODO (afeta o gráfico e a atividade recente) ---
  const agora = Date.now();
  const cutoffPorPeriodo = { HOJE: 24 * 60 * 60 * 1000, SEMANA: 7 * 24 * 60 * 60 * 1000, MES: 30 * 24 * 60 * 60 * 1000, TUDO: Infinity };
  const cutoff = agora - cutoffPorPeriodo[periodo];

  const chamadosNoPeriodo = listaChamados.filter(c => periodo === 'TUDO' || (c.dataAbertura && c.dataAbertura >= cutoff));

  const abertosPeriodo = chamadosNoPeriodo.filter(c => getStatusCategoria(c.status) === 'ABERTO').length;
  const andamentoPeriodo = chamadosNoPeriodo.filter(c => getStatusCategoria(c.status) === 'ANDAMENTO').length;
  const concluidosPeriodo = chamadosNoPeriodo.filter(c => getStatusCategoria(c.status) === 'CONCLUIDO').length;

  const ultimosChamados = [...chamadosNoPeriodo].sort((a, b) => (b.dataAbertura || 0) - (a.dataAbertura || 0)).slice(0, 8);

  const chartData = [
    { name: 'Abertos', population: abertosPeriodo, color: theme.offline, legendFontColor: theme.subtext, legendFontSize: 12 },
    { name: 'Andamento', population: andamentoPeriodo, color: theme.sec, legendFontColor: theme.subtext, legendFontSize: 12 },
    { name: 'Concluídos', population: concluidosPeriodo, color: theme.primary, legendFontColor: theme.subtext, legendFontSize: 12 }
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

  // Um chamado sem técnico designado só deve alertar os técnicos atualmente
  // escalados para aquele prédio (o campo `predio` do técnico reflete a escala
  // do dia, já que a gerência pode remanejá-lo) — não o mosaico inteiro da equipe.
  const relevanteParaMim = (item, isChamado) => {
    if (!usuarioLogado || usuarioLogado.perfil === 'ADM') return true;
    if (isChamado) {
      // Sem técnico ainda: só alerta quem está no mesmo prédio hoje.
      if (!item.tecnico) return item.predio === usuarioLogado.predio;
      // Já foi assumido: continua relevante só para quem assumiu — para os
      // demais técnicos do prédio a notificação desaparece do feed.
      return item.tecnico === usuarioLogado.login;
    }
    return true;
  };

  const feedNotificacoes = [...listaChamados, ...listaEventos]
    .filter(item => relevanteParaMim(item, item.descricao !== undefined))
    .map(item => {
      const isChamado = item.descricao !== undefined;
      const dataItem = item.dataAbertura || item.data || 0;

      let icone = { name: 'push-pin', color: theme.subtext };
      if (isChamado) icone = item.status === 'FECHADO' ? { name: 'check-circle', color: theme.online } : { name: 'error-outline', color: theme.offline };
      else icone = item.status === 'CONCLUIDO' ? { name: 'flag', color: theme.online } : { name: 'event', color: theme.sec };

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

  // Badge do sino = quantidade de chamados realmente pendentes (sem técnico,
  // ainda não fechados) relevantes para mim — não um contador de "não lido"
  // por horário, que se perdia toda vez que a tela do Dashboard desmontava ao
  // trocar de aba. Some sozinho assim que o chamado é assumido ou fechado.
  const chamadosPendentes = listaChamados.filter((c) => {
    const semTecnico = !c.tecnico || c.tecnico === '';
    const naoEstaFechado = c.status !== 'FECHADO' && c.status !== 'finalizado';
    if (!semTecnico || !naoEstaFechado) return false;
    if (!usuarioLogado || usuarioLogado.perfil === 'ADM') return true;
    return c.predio === usuarioLogado.predio;
  });
  const notificacoesNaoLidas = chamadosPendentes.length;

  const abrirSininho = () => {
    setModalNotificacoes(true);
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

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.toolbarBar, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
            <MaterialIcons name="schedule" size={14} color={theme.subtext} style={{ marginRight: 6 }} />
            <Text style={{ color: theme.subtext, fontSize: 12, fontWeight: '700', fontFamily: 'monospace' }}>
              {horaRelogio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Text>

            <View style={[styles.toolbarDivider, { backgroundColor: theme.border }]} />

            <MaterialIcons name="wifi" size={14} color={theme.online} />

            <View style={[styles.toolbarDivider, { backgroundColor: theme.border }]} />

            <MaterialIcons name="person-outline" size={14} color={theme.text} style={{ marginRight: 4 }} />
            <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
              {usuarioLogado?.nomeCompleto || usuarioLogado?.login || 'Admin'}
            </Text>
            <MaterialIcons name="expand-more" size={16} color={theme.subtext} />
          </View>

          <TouchableOpacity onPress={abrirSininho} style={[styles.bellBtn, { backgroundColor: theme.cardAlt, borderColor: theme.border, marginLeft: 8 }]} activeOpacity={0.75}>
            <MaterialIcons name="notifications-none" size={22} color={theme.text} />
            {notificacoesNaoLidas > 0 && (
              <View style={[styles.badge, { borderColor: theme.background, backgroundColor: theme.offline }]}>
                <Text style={styles.badgeText}>{notificacoesNaoLidas > 9 ? '9+' : notificacoesNaoLidas}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* NOVO: CARTÃO DE IDENTIDADE DO TÉCNICO LOGADO */}
      {usuarioLogado && (
        <Card theme={theme} style={{ marginBottom: 20, padding: 15, borderLeftWidth: 5, borderLeftColor: getStatusColor(getStatusReal(usuarioLogado)), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: theme.subtext, fontSize: 11, textTransform: 'uppercase', fontWeight: 'bold' }}>Meu Status Atual</Text>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>{usuarioLogado.nomeCompleto || usuarioLogado.login}</Text>
            <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>🏢 {usuarioLogado.predio}</Text>
          </View>
          <View style={{ alignItems: 'center', backgroundColor: theme.cardAlt, padding: 10, borderRadius: RADIUS.md }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: getStatusColor(getStatusReal(usuarioLogado)), marginBottom: 6 }} />
            <Text style={{ color: getStatusColor(getStatusReal(usuarioLogado)), fontWeight: 'bold', fontSize: 12, textAlign: 'center' }}>
              {getStatusText(getStatusReal(usuarioLogado))}
            </Text>
          </View>
        </Card>
      )}
      
      <View style={[styles.sectionHeaderRow, { justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialIcons name="assignment" size={16} color={theme.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Resumo de Chamados</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: theme.textCode, fontSize: 11, marginRight: 12 }}>
            Última atualização: {formatarTempo(ultimaAtualizacao)}
          </Text>
          {Platform.OS === 'web' && chamadosTotal > 0 && (
            <TouchableOpacity onPress={exportarDados} style={[styles.exportBtn, { borderColor: theme.border, backgroundColor: theme.cardAlt }]} activeOpacity={0.75}>
              <MaterialIcons name="file-download" size={13} color={theme.text} style={{ marginRight: 5 }} />
              <Text style={{ color: theme.text, fontSize: 11, fontWeight: '700' }}>Exportar Dados</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.cardsRow}>
        <TouchableOpacity activeOpacity={0.7} style={styles.cardMetricaWrap} onPress={() => (irParaChamados ? irParaChamados('ABERTO') : setTelaAtiva && setTelaAtiva('CHAMADOS'))}>
          <Card theme={theme} style={[styles.cardMetrica, { overflow: 'hidden' }]}>
            <View style={[styles.glowBlob, { backgroundColor: theme.offline }]} />
            <View style={styles.metricaTopRow}>
              <Text style={[styles.metricaLabel, { color: theme.textCode }]}>Abertos</Text>
              <View style={[styles.metricaIconBox, { backgroundColor: theme.cardAlt }]}>
                <MaterialIcons name="error-outline" size={14} color={theme.offline} />
              </View>
            </View>
            <Text style={{ color: theme.text, fontSize: 34, fontWeight: '800', marginTop: 10, fontFamily: 'monospace' }}>{chamadosAbertos}</Text>
            <Sparkline data={tendenciaAbertura} color={theme.offline} />
          </Card>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} style={styles.cardMetricaWrap} onPress={() => (irParaChamados ? irParaChamados('ANDAMENTO') : setTelaAtiva && setTelaAtiva('CHAMADOS'))}>
          <Card theme={theme} style={[styles.cardMetrica, { overflow: 'hidden' }]}>
            <View style={[styles.glowBlob, { backgroundColor: theme.sec }]} />
            <View style={styles.metricaTopRow}>
              <Text style={[styles.metricaLabel, { color: theme.textCode }]}>Andamento</Text>
              <View style={[styles.metricaIconBox, { backgroundColor: theme.cardAlt }]}>
                <MaterialIcons name="schedule" size={14} color={theme.sec} />
              </View>
            </View>
            <Text style={{ color: theme.text, fontSize: 34, fontWeight: '800', marginTop: 10, fontFamily: 'monospace' }}>{chamadosAndamento}</Text>
            <Sparkline data={tendenciaAbertura} color={theme.sec} />
          </Card>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} style={styles.cardMetricaWrap} onPress={() => (irParaChamados ? irParaChamados('CONCLUIDO') : setTelaAtiva && setTelaAtiva('CHAMADOS'))}>
          <Card theme={theme} style={[styles.cardMetrica, { overflow: 'hidden' }]}>
            <View style={[styles.glowBlob, { backgroundColor: theme.primary }]} />
            <View style={styles.metricaTopRow}>
              <Text style={[styles.metricaLabel, { color: theme.textCode }]}>Concluídos</Text>
              <View style={[styles.metricaIconBox, { backgroundColor: theme.cardAlt }]}>
                <MaterialIcons name="check-circle-outline" size={14} color={theme.primary} />
              </View>
            </View>
            <Text style={{ color: theme.text, fontSize: 34, fontWeight: '800', marginTop: 10, fontFamily: 'monospace' }}>{chamadosConcluidos}</Text>
            <Sparkline data={tendenciaFechamento} color={theme.primary} />
          </Card>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} style={styles.cardMetricaWrap} onPress={() => (irParaChamados ? irParaChamados('TODOS') : setTelaAtiva && setTelaAtiva('CHAMADOS'))}>
          <Card theme={theme} style={[styles.cardMetrica, { overflow: 'hidden' }]}>
            <View style={[styles.glowBlob, { backgroundColor: theme.tert }]} />
            <View style={styles.metricaTopRow}>
              <Text style={[styles.metricaLabel, { color: theme.textCode }]}>Total</Text>
              <View style={[styles.metricaIconBox, { backgroundColor: theme.cardAlt }]}>
                <MaterialIcons name="format-list-bulleted" size={14} color={theme.tert} />
              </View>
            </View>
            <Text style={{ color: theme.text, fontSize: 34, fontWeight: '800', marginTop: 10, fontFamily: 'monospace' }}>{chamadosTotal}</Text>
            <Sparkline data={tendenciaAbertura} color={theme.tert} />
          </Card>
        </TouchableOpacity>
      </View>

      {chamadosTotal > 0 && (
        <Card theme={theme} style={{ marginTop: 4, paddingVertical: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>Taxa de Conclusão</Text>
            <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 13, fontFamily: 'monospace' }}>{taxaConclusao}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.cardAlt }]}>
            <View style={[styles.progressFill, { width: `${taxaConclusao}%`, backgroundColor: theme.primary }]} />
          </View>
        </Card>
      )}

      <View style={styles.cardsRow}>
        <View style={styles.cardMetricaWrap}>
          <Card theme={theme} style={[styles.cardMetrica, { overflow: 'hidden' }]}>
            <View style={styles.metricaTopRow}>
              <Text style={[styles.metricaLabel, { color: theme.textCode }]}>SLA Cumprido</Text>
              <View style={[styles.metricaIconBox, { backgroundColor: theme.cardAlt }]}>
                <MaterialIcons name="verified" size={14} color={theme.online} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ color: theme.online, fontSize: 32, fontWeight: '800', marginTop: 10, fontFamily: 'monospace' }}>{slaPercent == null ? '—' : `${slaPercent}%`}</Text>
                <View style={[styles.progressTrackSm, { backgroundColor: theme.cardAlt }]}>
                  <View style={[styles.progressFill, { width: `${slaPercent == null ? 0 : slaPercent}%`, backgroundColor: theme.online }]} />
                </View>
              </View>
              <Gauge percent={slaPercent} theme={theme} size={64} />
            </View>
          </Card>
        </View>
        <View style={styles.cardMetricaWrap}>
          <Card theme={theme} style={[styles.cardMetrica, { overflow: 'hidden' }]}>
            <View style={[styles.glowBlob, { backgroundColor: theme.tert }]} />
            <View style={styles.metricaTopRow}>
              <Text style={[styles.metricaLabel, { color: theme.textCode }]}>MTTR Médio</Text>
              <View style={[styles.metricaIconBox, { backgroundColor: theme.cardAlt }]}>
                <MaterialIcons name="timer" size={14} color={theme.tert} />
              </View>
            </View>
            <Text style={{ color: theme.text, fontSize: 32, fontWeight: '800', marginTop: 10, fontFamily: 'monospace' }}>{formatarMinutos(mttrMinutos)}</Text>
            <Sparkline data={tendenciaMTTR} color={theme.tert} />
          </Card>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginHorizontal: -6 }}>
        <View style={{ flex: 1, minWidth: 260, paddingHorizontal: 6, marginTop: 6 }}>
          <Card theme={theme} style={{ paddingVertical: 20 }}>
            <Text style={{ color: theme.subtext, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>Distribuição por Status</Text>
            <DonutChart
              theme={theme}
              data={[
                { label: 'Abertos', value: chamadosAbertos, color: theme.offline },
                { label: 'Andamento', value: chamadosAndamento, color: theme.sec },
                { label: 'Concluídos', value: chamadosConcluidos, color: theme.primary },
              ]}
            />
          </Card>
        </View>
        <View style={{ flex: 1, minWidth: 260, paddingHorizontal: 6, marginTop: 6 }}>
          <Card theme={theme} style={{ paddingVertical: 20 }}>
            <Text style={{ color: theme.subtext, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>Distribuição por Severidade</Text>
            <DonutChart
              theme={theme}
              data={[
                { label: 'Baixa', value: severidadeCounts.BAIXA, color: getCorPrioridade('BAIXA', theme) },
                { label: 'Média', value: severidadeCounts.MEDIA, color: getCorPrioridade('MEDIA', theme) },
                { label: 'Alta', value: severidadeCounts.ALTA, color: getCorPrioridade('ALTA', theme) },
                { label: 'Crítica', value: severidadeCounts.CRITICA, color: getCorPrioridade('CRITICA', theme) },
              ]}
            />
          </Card>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 12 }}>
        <View style={styles.sectionHeaderRow}>
          <MaterialIcons name="show-chart" size={16} color={theme.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Atividade no Período</Text>
        </View>
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
            <Text style={{ color: theme.online, fontSize: 26, fontWeight: '800', marginTop: 8, fontFamily: 'monospace' }}>
              {equipeOnline} <Text style={{ fontSize: 15, color: theme.subtext, fontWeight: '600' }}>/ {totalEquipe}</Text>
            </Text>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} style={{ flex: 1, marginLeft: 8 }} onPress={() => setTelaAtiva && setTelaAtiva('EVENTOS')}>
          <Card theme={theme} style={{ alignItems: 'center', padding: 18 }}>
            <Text style={{ color: theme.subtext, fontSize: 13, fontWeight: '600' }}>Eventos Ativos</Text>
            <Text style={{ color: theme.sec, fontSize: 26, fontWeight: '800', marginTop: 8, fontFamily: 'monospace' }}>{eventosAtivos}</Text>
          </Card>
        </TouchableOpacity>
      </View>

      <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
        <MaterialIcons name="groups" size={16} color={theme.primary} style={{ marginRight: 6 }} />
        <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Monitor da Equipe</Text>
      </View>
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
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ marginRight: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.cardAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: statusColor }}>
                    <Text style={{ color: theme.text, fontWeight: '800', fontSize: 12 }}>{(t.nomeCompleto || t.login).charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: statusColor, position: 'absolute', right: -1, bottom: -1, borderWidth: 2, borderColor: theme.card }} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13, flexShrink: 1 }} numberOfLines={1}>{t.login}</Text>
                    {t.nivel && (
                      <View style={{ marginLeft: 6, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: theme.primarySoft }}>
                        <Text style={{ color: theme.primary, fontSize: 9, fontWeight: '800', fontFamily: 'monospace' }}>{t.nivel}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: theme.subtext, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{localAtual}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, alignSelf: 'flex-start', backgroundColor: theme.cardAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor, marginRight: 6 }} />
                <Text style={{ color: statusColor, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{statusText}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
        <MaterialIcons name="history" size={16} color={theme.primary} style={{ marginRight: 6 }} />
        <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Últimos Chamados Registrados</Text>
      </View>

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
                  <View key={item.id} style={[styles.feedItem, { backgroundColor: theme.card, borderColor: theme.border, borderLeftColor: item.icone.color }]}>
                    <View style={[styles.metricaIconBox, { backgroundColor: theme.cardAlt, marginRight: 14 }]}>
                      <MaterialIcons name={item.icone.name} size={16} color={item.icone.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }} numberOfLines={2}>{item.titulo}</Text>
                      <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 2 }}>{item.subtitulo}</Text>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <View style={{ backgroundColor: theme.cardAlt, paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.pill }}>
                          <Text style={{ color: theme.primary, fontSize: 10, fontWeight: '700', fontFamily: 'monospace' }}>{item.tecnico || 'FILA'}</Text>
                        </View>
                        <Text style={{ color: theme.textCode, fontSize: 10, fontFamily: 'monospace' }}>{formatarTempo(item.data)}</Text>
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

function Sparkline({ data = [], color, width = 100, height = 28 }) {
  const gradId = useId().replace(/:/g, '');
  const max = Math.max(...data, 1);
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const points = data.map((v, i) => `${i * step},${height - (v / max) * (height - 4) - 2}`).join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <View style={styles.sparklineWrap}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Polygon points={areaPoints} fill={`url(#${gradId})`} />
        <Polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

function Gauge({ percent, theme, size = 84 }) {
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent ?? 0));
  const filled = (clamped / 100) * circumference;
  const cor = clamped >= 80 ? theme.online : clamped >= 50 ? theme.sec : theme.offline;

  return (
    <View style={{ width: size, alignItems: 'center' }}>
      <Svg width={size} height={size / 2 + strokeWidth}>
        <Path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          stroke={theme.cardAlt}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {percent != null && (
          <Path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            stroke={cor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${filled} ${circumference}`}
            fill="none"
            strokeLinecap="round"
          />
        )}
      </Svg>
      <Text style={{ color: percent == null ? theme.subtext : cor, fontSize: 11, fontWeight: '800', fontFamily: 'monospace', marginTop: -4 }}>
        {percent == null ? '—' : `${percent}%`}
      </Text>
    </View>
  );
}

function DonutChart({ data, theme, size = 156, strokeWidth = 20 }) {
  const [selected, setSelected] = useState(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((s, d) => s + d.value, 0);

  let cumulative = 0;
  const segments = data.map((d) => {
    const fraction = total > 0 ? d.value / total : 0;
    const dash = fraction * circumference;
    const offset = cumulative * circumference;
    cumulative += fraction;
    return { ...d, dash, offset, fraction };
  });

  const activeSegment = segments.find(s => s.label === selected);
  const toggle = (label) => setSelected(prev => (prev === label ? null : label));

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation={-90} originX={size / 2} originY={size / 2}>
            {total === 0 ? (
              <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.border} strokeWidth={strokeWidth} fill="transparent" />
            ) : segments.map((s, i) => (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={s.color}
                strokeWidth={selected === s.label ? strokeWidth + 5 : strokeWidth}
                strokeDasharray={`${s.dash} ${circumference - s.dash}`}
                strokeDashoffset={-s.offset}
                strokeLinecap="butt"
                fill="transparent"
                opacity={selected && selected !== s.label ? 0.3 : 1}
                onPress={() => toggle(s.label)}
              />
            ))}
          </G>
        </Svg>
        <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
          {activeSegment ? (
            <>
              <Text style={{ color: activeSegment.color, fontSize: 22, fontWeight: '800', fontFamily: 'monospace' }}>{activeSegment.value}</Text>
              <Text style={{ color: theme.subtext, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', marginTop: 2, letterSpacing: 0.3 }} numberOfLines={1}>{activeSegment.label}</Text>
            </>
          ) : (
            <>
              <Text style={{ color: theme.text, fontSize: 24, fontWeight: '800', fontFamily: 'monospace' }}>{total}</Text>
              <Text style={{ color: theme.subtext, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', marginTop: 2, letterSpacing: 0.3 }}>Total</Text>
            </>
          )}
        </View>
      </View>

      <View style={{ marginTop: 18, width: '100%' }}>
        {segments.map((s, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.7}
            onPress={() => toggle(s.label)}
            style={{
              flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 10, borderRadius: RADIUS.sm, marginBottom: 4,
              backgroundColor: selected === s.label ? theme.cardAlt : 'transparent',
            }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: s.color, marginRight: 10 }} />
            <Text style={{ flex: 1, color: theme.text, fontSize: 13, fontWeight: '600' }}>{s.label}</Text>
            <Text style={{ color: theme.subtext, fontSize: 12, fontFamily: 'monospace', marginRight: 10 }}>{total > 0 ? Math.round(s.fraction * 100) : 0}%</Text>
            <Text style={{ color: s.color, fontSize: 14, fontWeight: '800', fontFamily: 'monospace', minWidth: 26, textAlign: 'right' }}>{s.value}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  metricaLabelRow: { flexDirection: 'row', alignItems: 'center' },
  metricaTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  metricaLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, flex: 1, marginRight: 6 },
  metricaIconBox: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  glowBlob: { position: 'absolute', width: 90, height: 90, borderRadius: 45, opacity: 0.12, right: -30, bottom: -30 },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cardMetricaWrap: { flex: 1, minWidth: 140 },
  cardMetrica: { padding: 18, marginBottom: 0, minHeight: 128, borderRadius: RADIUS.xl + 4 },

  liveBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill, marginLeft: 10, gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },

  progressTrack: { height: 8, borderRadius: RADIUS.pill, overflow: 'hidden' },
  progressTrackSm: { height: 4, borderRadius: RADIUS.pill, overflow: 'hidden', marginTop: 10 },
  progressFill: { height: '100%', borderRadius: RADIUS.pill },

  periodTabs: { flexDirection: 'row', borderRadius: RADIUS.pill, borderWidth: 1, padding: 3 },
  periodTab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.pill },

  bellBtn: { width: 42, height: 42, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  toolbarBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 42, borderRadius: RADIUS.md, borderWidth: 1 },
  toolbarDivider: { width: 1, height: 16, marginHorizontal: 10 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm, borderWidth: 1 },
  sparklineWrap: { marginTop: 8, marginLeft: -4 },
  badge: { position: 'absolute', top: -4, right: -4, borderRadius: 12, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  teamCard: { width: '48%', padding: 14, borderRadius: RADIUS.md, marginBottom: 10, borderWidth: 1, borderLeftWidth: 3 },

  modalBg: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { height: '80%', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  feedItem: { flexDirection: 'row', padding: 14, borderRadius: RADIUS.md, marginBottom: 10, borderWidth: 1, borderLeftWidth: 3 },

  centerModalBg: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  techModalCard: { width: '100%', maxWidth: 360, borderRadius: RADIUS.xl, borderWidth: 1, padding: 22 },
  techStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingVertical: 8, paddingHorizontal: 12, borderRadius: RADIUS.md, alignSelf: 'flex-start' },
});