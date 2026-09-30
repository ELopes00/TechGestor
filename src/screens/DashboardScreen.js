import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { Avatar, Badge, Btn, Card, PriorityBadge, SectionTitle, StatusChip, useBreakpoints } from '../components';
import { PERFIL_LABEL } from '../components/Sidebar';
import { DataService } from '../services/DataService';
import { RADIUS, SHADOW } from '../theme/themes';
import {
  calcularMTTR, calcularSLA, formatProtocolo, formatTempoRelativo, formatarMinutos,
  getStatusCategoria, isChamadoFechado, isSlaVencido,
} from '../utils/helpers';

const PERIODOS = [
  { id: 'HOJE', label: 'Hoje', ms: 24 * 60 * 60 * 1000 },
  { id: 'SEMANA', label: '7 dias', ms: 7 * 24 * 60 * 60 * 1000 },
  { id: 'MES', label: '30 dias', ms: 30 * 24 * 60 * 60 * 1000 },
  { id: 'TUDO', label: 'Tudo', ms: Infinity },
];

const STATUS_PESSOAL = [
  { id: 'ONLINE', label: 'Disponível (Online)', cor: '#1a9c5c' },
  { id: 'ALMOCO', label: 'Em pausa (Almoço)', cor: '#d97706' },
  { id: 'INDISPONIVEL', label: 'Ocupado (Indisponível)', cor: '#dc2626' },
];

const POR_PAGINA = 5;

export default function DashboardScreen({ user, chamados = [], eventos = [], users = [], theme, setTelaAtiva, irParaChamados, addLog }) {
  const { isMobile, isDesktop, width } = useBreakpoints();
  const [periodo, setPeriodo] = useState('HOJE');
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState(null);
  const [filtroFila, setFiltroFila] = useState('');
  const [pagina, setPagina] = useState(1);
  const [statusSel, setStatusSel] = useState(user?.status && user.status !== 'OFFLINE' ? user.status : 'ONLINE');
  const [statusMenu, setStatusMenu] = useState(false);
  const [salvandoStatus, setSalvandoStatus] = useState(false);

  // --- RELÓGIO AUTOMÁTICO ---
  const [horaAtual, setHoraAtual] = useState(new Date().getHours());
  useEffect(() => {
    const interval = setInterval(() => setHoraAtual(new Date().getHours()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { setPagina(1); }, [filtroFila]);

  // --- INTELIGÊNCIA DE STATUS ---
  const getStatusReal = (u) => {
    const horaInicio = u.inicio || 8;
    const horaSaida = u.saida || 17;
    const noHorario = horaInicio < horaSaida
      ? horaAtual >= horaInicio && horaAtual < horaSaida
      : horaAtual >= horaInicio || horaAtual < horaSaida;

    if (!noHorario) return 'OFFLINE';

    // "Em Evento Externo" é derivado de um Evento real (não um rótulo manual).
    const emEventoExterno = (eventos || []).some((ev) =>
      ev.tecnico === u.login && ev.tipo === 'EXTERNO' &&
      ev.status !== 'finalizado' && ev.status !== 'FECHADO' && ev.status !== 'CONCLUIDO'
    );
    if (emEventoExterno) return 'EVENTO';

    // Almoço automático pela escala: começa 4h após o início do expediente e dura 1h.
    const horaAlmocoInicio = (horaInicio + 4) % 24;
    const horaAlmocoFim = (horaInicio + 5) % 24;
    const emHorarioDeAlmoco = horaAlmocoInicio < horaAlmocoFim
      ? horaAtual >= horaAlmocoInicio && horaAtual < horaAlmocoFim
      : horaAtual >= horaAlmocoInicio || horaAtual < horaAlmocoFim;
    if (emHorarioDeAlmoco || u.status === 'ALMOCO') return 'ALMOCO';

    if (u.status === 'INDISPONIVEL') return 'INDISPONIVEL';
    return 'ONLINE';
  };

  const STATUS_INFO = {
    ONLINE: { label: 'ONLINE', cor: theme.online },
    EVENTO: { label: 'EM EVENTO', cor: theme.sec },
    ALMOCO: { label: 'ALMOÇO', cor: theme.sec },
    INDISPONIVEL: { label: 'OCUPADO', cor: theme.offline },
    OFFLINE: { label: 'OFFLINE', cor: theme.neutral },
  };

  const listaChamados = chamados || [];
  const tecnicos = (users || []).filter((u) => u.perfil === 'TECNICO').sort((a, b) => (a.login || '').localeCompare(b.login || ''));

  // --- KPIs ---
  const abertos = listaChamados.filter((c) => !isChamadoFechado(c.status));
  const umaHoraAtras = Date.now() - 60 * 60 * 1000;
  const ultimaHora = listaChamados.filter((c) => c.dataAbertura >= umaHoraAtras).length;
  const atrasados = abertos.filter((c) => isSlaVencido(c));
  const tecnicosOnline = tecnicos.filter((t) => ['ONLINE', 'EVENTO'].includes(getStatusReal(t))).length;
  const capacidade = tecnicos.length ? Math.round((tecnicosOnline / tecnicos.length) * 1000) / 10 : 0;
  const eventosAtivos = (eventos || []).filter((e) => e.status !== 'CONCLUIDO' && e.status !== 'finalizado' && e.status !== 'FECHADO');
  const eventosExternos = eventosAtivos.filter((e) => e.tipo === 'EXTERNO').length;
  const slaPercent = calcularSLA(listaChamados);
  const mttr = calcularMTTR(listaChamados);

  // --- PERÍODO ---
  const cutoff = Date.now() - PERIODOS.find((p) => p.id === periodo).ms;
  const noPeriodo = listaChamados.filter((c) => periodo === 'TUDO' || (c.dataAbertura && c.dataAbertura >= cutoff));

  const porUnidade = useMemo(() => {
    const mapa = {};
    noPeriodo.forEach((c) => { const k = c.predio || 'Sem unidade'; mapa[k] = (mapa[k] || 0) + 1; });
    return Object.entries(mapa).map(([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd);
  }, [noPeriodo]);
  const maxUnidade = Math.max(1, ...porUnidade.map((u) => u.qtd));

  const porHora = useMemo(() => {
    const horas = Array.from({ length: 13 }, (_, i) => ({ hora: 7 + i, qtd: 0 }));
    noPeriodo.forEach((c) => {
      if (!c.dataAbertura) return;
      const h = new Date(c.dataAbertura).getHours();
      const slot = horas.find((x) => x.hora === h);
      if (slot) slot.qtd += 1;
    });
    return horas;
  }, [noPeriodo]);

  // --- FILA RECENTE ---
  const fila = [...abertos]
    .filter((c) => {
      const t = filtroFila.toLowerCase();
      if (!t) return true;
      return [c.titulo, c.descricao, c.predio, c.solicitante, c.tecnico, formatProtocolo(c)].some((v) => String(v || '').toLowerCase().includes(t));
    })
    .sort((a, b) => (b.dataAbertura || 0) - (a.dataAbertura || 0));
  const totalPaginas = Math.max(1, Math.ceil(fila.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const filaPagina = fila.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  const salvarStatus = async () => {
    if (!user?.uid && !user?.id) return;
    setSalvandoStatus(true);
    try {
      await DataService.atualizarUsuario(user.uid || user.id, { status: statusSel });
      addLog && addLog(`ATUALIZOU DISPONIBILIDADE PARA ${statusSel}`);
    } catch (e) { console.log(e); }
    setSalvandoStatus(false);
  };

  const meuStatus = user ? getStatusReal({ ...user, status: user.status }) : 'OFFLINE';
  const nome = user?.nomeCompleto || user?.login || 'Usuário';
  const gridGap = 16;
  const kpiCols = isDesktop ? 4 : width >= 640 ? 2 : 1;

  const KpiCard = ({ label, value, sub, icon, cor, destaque, onPress, children }) => (
    <TouchableOpacity activeOpacity={onPress ? 0.8 : 1} onPress={onPress} style={{ width: kpiCols === 1 ? '100%' : `${100 / kpiCols}%`, paddingHorizontal: gridGap / 2 }}>
      <Card theme={theme} style={{ minHeight: 150, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={{ color: destaque ? theme.offline : theme.subtext, fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6 }}>
              <Text style={{ color: cor, fontSize: 32, fontWeight: '700', letterSpacing: -0.6 }}>{value}</Text>
              {sub ? <Text style={{ color: theme.subtext, fontSize: 15, marginLeft: 6 }}>{sub}</Text> : null}
            </View>
          </View>
          <View style={{ width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: destaque ? theme.criticalWash : theme.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name={icon} size={21} color={destaque ? theme.offline : theme.primary} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 14, gap: 8 }}>{children}</View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: isMobile ? 16 : 24 }}>

      {/* CARTÃO DO USUÁRIO LOGADO */}
      {user && (
        <Card theme={theme} style={{ flexDirection: isDesktop ? 'row' : 'column', alignItems: isDesktop ? 'center' : 'stretch', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={[styles.bigAvatar, { backgroundColor: theme.primary }, SHADOW.glow]}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{nome.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}</Text>
            </View>
            <View style={{ marginLeft: 16, flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <Text style={{ color: theme.text, fontSize: 21, fontWeight: '600', letterSpacing: -0.3 }}>{nome}</Text>
                <Badge label={`${(PERFIL_LABEL[user.perfil] || user.perfil || '').toUpperCase()}${user.nivel ? ` • ${user.nivel}` : ''}`} color={theme.primary} bg={theme.cardAlt} border={theme.cardAlt} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                <MaterialIcons name="location-on" size={15} color={theme.primary} style={{ marginRight: 6 }} />
                <Text style={{ color: theme.subtext, fontSize: 13 }}>{user.predio || 'Base'}</Text>
                <Text style={{ color: theme.textCode, marginHorizontal: 10 }}>•</Text>
                <MaterialIcons name="schedule" size={14} color={theme.subtext} style={{ marginRight: 5 }} />
                <Text style={{ color: theme.subtext, fontSize: 13 }}>Expediente {String(user.inicio ?? 8).padStart(2, '0')}h – {String(user.saida ?? 17).padStart(2, '0')}h</Text>
              </View>
            </View>
          </View>

          <View style={[styles.statusBox, { backgroundColor: theme.cardAlt, marginTop: isDesktop ? 0 : 16, width: isDesktop ? 420 : '100%' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.onlinePill, { backgroundColor: theme.card }]}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: STATUS_INFO[meuStatus].cor, marginRight: 6 }} />
                <Text style={{ color: STATUS_INFO[meuStatus].cor, fontSize: 11.5, fontWeight: '700', letterSpacing: 0.6 }}>{STATUS_INFO[meuStatus].label}</Text>
              </View>
              <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 12 }} onPress={() => setStatusMenu(!statusMenu)} activeOpacity={0.7}>
                <Text style={{ color: theme.text, fontSize: 14 }} numberOfLines={1}>{STATUS_PESSOAL.find((s) => s.id === statusSel)?.label || 'Disponível (Online)'}</Text>
                <MaterialIcons name={statusMenu ? 'expand-less' : 'expand-more'} size={20} color={theme.text} />
              </TouchableOpacity>
            </View>
            {statusMenu && (
              <View style={{ marginTop: 8, backgroundColor: theme.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: theme.border }}>
                {STATUS_PESSOAL.map((s) => (
                  <TouchableOpacity key={s.id} onPress={() => { setStatusSel(s.id); setStatusMenu(false); }} style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.cor, marginRight: 10 }} />
                    <Text style={{ color: theme.text, fontSize: 13, fontWeight: statusSel === s.id ? '700' : '400' }}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Btn theme={theme} title={salvandoStatus ? 'Salvando...' : 'Atualizar'} icon="sync" compact onPress={salvarStatus} disabled={salvandoStatus} style={{ alignSelf: 'flex-start', marginTop: 10, backgroundColor: theme.primaryStrong, borderColor: theme.primaryStrong }} />
          </View>
        </Card>
      )}

      {/* KPIs */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gridGap / 2 }}>
        <KpiCard label="Chamados abertos" value={abertos.length} icon="confirmation-number" cor={theme.primaryStrong} onPress={() => irParaChamados && irParaChamados('TODOS')}>
          <Badge label={`+${ultimaHora}`} color={theme.primary} bg={theme.cardAlt} border={theme.cardAlt} />
          <Text style={{ color: theme.subtext, fontSize: 12.5 }}>registrados na última hora</Text>
        </KpiCard>
        <KpiCard label="Chamados em atraso" value={atrasados.length} icon="alarm-off" cor={theme.offline} destaque={atrasados.length > 0} onPress={() => irParaChamados && irParaChamados('ANDAMENTO')}>
          {atrasados.length > 0 ? (
            <>
              <Badge label="SLA CRÍTICO" icon="warning" color={theme.offline} solid />
              <Text style={{ color: theme.offline, fontSize: 12.5 }}>Intervenção imediata</Text>
            </>
          ) : (
            <>
              <Badge label="SLA OK" color={theme.online} bg={theme.successWash} border={theme.online + '40'} />
              <Text style={{ color: theme.subtext, fontSize: 12.5 }}>Nenhum prazo estourado</Text>
            </>
          )}
        </KpiCard>
        <KpiCard label="Técnicos online" value={tecnicosOnline} sub={`/ ${tecnicos.length} ativos`} icon="groups" cor={theme.online} onPress={() => user?.perfil === 'ADM' && setTelaAtiva && setTelaAtiva('ADMIN')}>
          <Badge label={`${capacidade}%`} color={theme.online} bg={theme.successWash} border={theme.successWash} />
          <Text style={{ color: theme.subtext, fontSize: 12.5 }}>capacidade em campo</Text>
        </KpiCard>
        <KpiCard label="Eventos / Audiências" value={eventosAtivos.length} icon="videocam" cor={theme.text} onPress={() => setTelaAtiva && setTelaAtiva('EVENTOS')}>
          <Badge label={`${eventosExternos} Externos`} color={theme.primary} bg={theme.cardAlt} border={theme.cardAlt} />
          <Text style={{ color: theme.subtext, fontSize: 12.5 }}>• {eventosAtivos.length - eventosExternos} Internos</Text>
        </KpiCard>
      </View>

      {/* DISTRIBUIÇÃO + INTENSIDADE */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', marginHorizontal: isDesktop ? -gridGap / 2 : 0 }}>
        <View style={{ flex: isDesktop ? 1.35 : undefined, paddingHorizontal: isDesktop ? gridGap / 2 : 0 }}>
          <Card theme={theme} style={{ flex: isDesktop ? 1 : undefined }}>
            <SectionTitle
              theme={theme}
              title="Distribuição por Comarca & Unidade"
              subtitle="Carga operacional por setor judiciário"
              right={
                <View style={[styles.periodTabs, { borderColor: theme.border }]}>
                  {PERIODOS.map((p) => (
                    <TouchableOpacity key={p.id} onPress={() => setPeriodo(p.id)} style={[styles.periodTab, periodo === p.id && { backgroundColor: theme.cardAlt }]}>
                      <Text style={{ color: periodo === p.id ? theme.primary : theme.subtext, fontSize: 11.5, fontWeight: '700', letterSpacing: 0.4 }}>{p.label.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              }
            />
            {porUnidade.length === 0 ? (
              <Text style={{ color: theme.subtext, fontStyle: 'italic', paddingVertical: 24, textAlign: 'center' }}>Nenhum chamado neste período.</Text>
            ) : porUnidade.slice(0, 6).map((u, i) => (
              <View key={u.nome} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: theme.text, fontSize: 13.5, fontWeight: '500' }}>{u.nome}</Text>
                  <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}>{u.qtd} chamado{u.qtd > 1 ? 's' : ''}</Text>
                </View>
                <View style={[styles.track, { backgroundColor: theme.track }]}>
                  <View style={[styles.fill, { width: `${(u.qtd / maxUnidade) * 100}%`, backgroundColor: i < 3 ? theme.primaryStrong : theme.primary, opacity: i < 3 ? 1 : 0.55 }]} />
                </View>
              </View>
            ))}
            <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
              <Text style={{ color: theme.subtext, fontSize: 12.5 }}>Total consolidado: {noPeriodo.length} atendimentos no período</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="trending-up" size={16} color={theme.online} style={{ marginRight: 4 }} />
                <Text style={{ color: theme.online, fontSize: 12.5, fontWeight: '600' }}>{slaPercent == null ? '—' : `${slaPercent}%`} SLA cumprido</Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={{ flex: isDesktop ? 1 : undefined, paddingHorizontal: isDesktop ? gridGap / 2 : 0 }}>
          <Card theme={theme} style={{ flex: isDesktop ? 1 : undefined }}>
            <SectionTitle theme={theme} title="Intensidade Operacional por Hora" subtitle="Abertura de chamados ao longo do expediente" />
            <AreaChart data={porHora} theme={theme} />
            <View style={[styles.infoStrip, { backgroundColor: theme.cardAlt }]}>
              <MaterialIcons name="timer" size={17} color={theme.primary} />
              <Text style={{ color: theme.text, fontSize: 13, marginLeft: 8, flex: 1 }}>
                Tempo médio de resolução (MTTR): <Text style={{ color: theme.primary, fontWeight: '700' }}>{formatarMinutos(mttr)}</Text>
              </Text>
              <Badge label={atrasados.length > 0 ? 'ATENÇÃO' : 'ESTÁVEL'} solid color={atrasados.length > 0 ? theme.sec : theme.online} />
            </View>
          </Card>
        </View>
      </View>

      {/* FILA + MONITOR DA EQUIPE */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', marginHorizontal: isDesktop ? -gridGap / 2 : 0 }}>
        <View style={{ flex: isDesktop ? 2.1 : undefined, paddingHorizontal: isDesktop ? gridGap / 2 : 0 }}>
          <Card theme={theme} style={{ flex: isDesktop ? 1 : undefined }}>
            <View style={{ flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', marginBottom: 14 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600' }}>Fila de Chamados Recentes</Text>
                  <Badge label={`${abertos.length} pendentes`} color={theme.primary} bg={theme.cardAlt} border={theme.cardAlt} />
                </View>
                <Text style={{ color: theme.subtext, fontSize: 12.5, marginTop: 2 }}>Triagem contínua conforme Resolução de Governança DITEC</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: isMobile ? 12 : 0 }}>
                <View style={[styles.searchBox, { backgroundColor: theme.cardAlt, flex: isMobile ? 1 : undefined }]}>
                  <MaterialIcons name="search" size={17} color={theme.subtext} />
                  <TextInput
                    value={filtroFila}
                    onChangeText={setFiltroFila}
                    placeholder="Filtrar chamado..."
                    placeholderTextColor={theme.textCode}
                    style={[{ color: theme.text, marginLeft: 6, fontSize: 13, width: isMobile ? undefined : 150, flex: isMobile ? 1 : undefined }, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                  />
                </View>
                <Btn theme={theme} variant="soft" title="Ver todos" icon="filter-list" compact onPress={() => irParaChamados && irParaChamados('TODOS')} style={{ marginTop: 0, marginLeft: 8 }} />
              </View>
            </View>

            {!isMobile && (
              <View style={[styles.tableHead, { backgroundColor: theme.tableHead }]}>
                <Text style={[styles.th, { color: theme.subtext, width: 110 }]}>PROTOCOLO</Text>
                <Text style={[styles.th, { color: theme.subtext, flex: 1 }]}>INCIDENTE / DESCRIÇÃO</Text>
                <Text style={[styles.th, { color: theme.subtext, width: 110 }]}>UNIDADE</Text>
                <Text style={[styles.th, { color: theme.subtext, width: 90 }]}>PRIORIDADE</Text>
                <Text style={[styles.th, { color: theme.subtext, width: 130 }]}>STATUS</Text>
              </View>
            )}

            {filaPagina.length === 0 ? (
              <Text style={{ color: theme.subtext, textAlign: 'center', paddingVertical: 30 }}>Nenhuma pendência ativa.</Text>
            ) : filaPagina.map((c) => {
              const vencido = isSlaVencido(c);
              const corProtocolo = vencido || c.prioridade === 'ALTA' || c.prioridade === 'CRITICA' ? theme.offline : theme.primaryStrong;
              return isMobile ? (
                <TouchableOpacity key={c.id} activeOpacity={0.8} onPress={() => irParaChamados && irParaChamados('TODOS')} style={[styles.mobileRow, { borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: corProtocolo, fontWeight: '700', fontSize: 13 }}>{formatProtocolo(c)}</Text>
                    <PriorityBadge prioridade={c.prioridade} />
                  </View>
                  <Text style={{ color: theme.text, fontWeight: '600', fontSize: 14, marginTop: 6 }} numberOfLines={1}>{c.titulo || c.descricao}</Text>
                  <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{c.predio} • {formatTempoRelativo(c.dataAbertura)}</Text>
                  <StatusChip status={c.status} style={{ marginTop: 8 }} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity key={c.id} activeOpacity={0.75} onPress={() => irParaChamados && irParaChamados('TODOS')} style={[styles.tr, { borderBottomColor: theme.border }]}>
                  <Text style={{ width: 110, color: corProtocolo, fontWeight: '700', fontSize: 13 }}>{formatProtocolo(c)}</Text>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13.5 }} numberOfLines={1}>{c.titulo || c.descricao}</Text>
                    <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{c.titulo ? c.descricao : c.solicitante || ''}</Text>
                  </View>
                  <Text style={{ width: 110, color: theme.text, fontSize: 13 }} numberOfLines={2}>{c.predio}</Text>
                  <View style={{ width: 90 }}><PriorityBadge prioridade={c.prioridade} /></View>
                  <View style={{ width: 130 }}><StatusChip status={c.status} /></View>
                </TouchableOpacity>
              );
            })}

            <View style={[styles.cardFooter, { borderTopColor: 'transparent', marginTop: 10 }]}>
              <Text style={{ color: theme.subtext, fontSize: 12.5 }}>Mostrando {filaPagina.length} de {fila.length} pendências ativas</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <PageBtn theme={theme} icon="chevron-left" disabled={paginaAtual <= 1} onPress={() => setPagina(paginaAtual - 1)} />
                {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
                  const inicio = Math.max(1, Math.min(paginaAtual - 2, totalPaginas - 4));
                  const n = inicio + i;
                  return <PageBtn key={n} theme={theme} label={String(n)} active={n === paginaAtual} onPress={() => setPagina(n)} />;
                })}
                <PageBtn theme={theme} icon="chevron-right" disabled={paginaAtual >= totalPaginas} onPress={() => setPagina(paginaAtual + 1)} />
              </View>
            </View>
          </Card>
        </View>

        <View style={{ flex: isDesktop ? 1 : undefined, paddingHorizontal: isDesktop ? gridGap / 2 : 0 }}>
          <Card theme={theme} style={{ flex: isDesktop ? 1 : undefined }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <MaterialIcons name="badge" size={20} color={theme.primary} />
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600' }}>Monitor da Equipe</Text>
              <Badge label="Ao Vivo" color={theme.text} bg={theme.cardAlt} border={theme.cardAlt} />
            </View>
            <Text style={{ color: theme.subtext, fontSize: 12.5, marginTop: 4, marginBottom: 14 }}>Distribuição técnica pelas sedes e unidades descentralizadas</Text>

            {tecnicos.length === 0 && <Text style={{ color: theme.subtext, fontStyle: 'italic' }}>Nenhum técnico cadastrado.</Text>}
            {tecnicos.slice(0, 6).map((t) => {
              const statusReal = getStatusReal(t);
              const info = STATUS_INFO[statusReal];
              const ativo = listaChamados.find((c) => c.tecnico === t.login && !isChamadoFechado(c.status));
              const ultimo = ativo || listaChamados.find((c) => c.tecnico === t.login);
              const apagado = statusReal === 'OFFLINE';
              return (
                <TouchableOpacity
                  key={t.id || t.login}
                  activeOpacity={0.8}
                  onPress={() => setTecnicoSelecionado({ ...t, statusReal, info, ativo })}
                  style={[styles.teamCard, { backgroundColor: theme.cardAlt, opacity: apagado ? 0.75 : 1 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Avatar nome={t.nomeCompleto || t.login} size={34} theme={theme} color={apagado ? theme.neutral : statusReal === 'ALMOCO' ? theme.neutral : ativo ? '#1a9c5c' : theme.primaryStrong} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ color: theme.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{t.nomeCompleto || t.login}</Text>
                      <Text style={{ color: theme.subtext, fontSize: 12 }} numberOfLines={1}>{(ativo && ativo.predio) || t.predio || 'Base'}{t.nivel ? ` • ${t.nivel}` : ''}</Text>
                    </View>
                    <Text style={{ color: info.cor, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5 }}>{info.label}</Text>
                  </View>
                  <View style={[styles.teamFoot, { backgroundColor: theme.card }]}>
                    <Text style={{ color: theme.subtext, fontSize: 12, flex: 1 }} numberOfLines={1}>
                      {apagado ? `Turno: ${String(t.inicio ?? 8).padStart(2, '0')}h – ${String(t.saida ?? 17).padStart(2, '0')}h` : ultimo ? `Último: ${formatProtocolo(ultimo)} (${ultimo.titulo || ultimo.descricao || ''})` : 'Sem atendimentos registrados'}
                    </Text>
                    <Text style={{ color: ativo ? theme.online : theme.textCode, fontSize: 12, fontWeight: '600', marginLeft: 8 }}>
                      {apagado ? 'Escala' : statusReal === 'ALMOCO' ? 'Pausa' : ativo ? 'Em campo' : 'Livre'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <Btn theme={theme} variant="soft" icon="groups" title={`Ver escala integral (${tecnicos.length} técnicos)`} onPress={() => setTelaAtiva && setTelaAtiva('AGENDAMENTO')} style={{ marginTop: 6 }} />
          </Card>
        </View>
      </View>

      {/* DETALHE DO TÉCNICO */}
      <Modal visible={!!tecnicoSelecionado} transparent animationType="fade" onRequestClose={() => setTecnicoSelecionado(null)}>
        <TouchableOpacity style={[styles.centerModalBg, { backgroundColor: theme.overlay }]} activeOpacity={1} onPress={() => setTecnicoSelecionado(null)}>
          <TouchableOpacity activeOpacity={1} style={[styles.techModalCard, { backgroundColor: theme.surface, borderColor: theme.border }, SHADOW.lg]}>
            {tecnicoSelecionado && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Avatar nome={tecnicoSelecionado.nomeCompleto || tecnicoSelecionado.login} size={44} theme={theme} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>{tecnicoSelecionado.nomeCompleto || tecnicoSelecionado.login}</Text>
                    <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 2 }}>@{tecnicoSelecionado.login}{tecnicoSelecionado.nivel ? ` • ${tecnicoSelecionado.nivel}` : ''}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setTecnicoSelecionado(null)} activeOpacity={0.7}>
                    <MaterialIcons name="close" size={20} color={theme.subtext} />
                  </TouchableOpacity>
                </View>

                <Badge label={tecnicoSelecionado.info.label} color={tecnicoSelecionado.info.cor} bg={tecnicoSelecionado.info.cor + '1a'} border={tecnicoSelecionado.info.cor + '40'} style={{ marginTop: 16 }} />

                <InfoLinha theme={theme} label="Localização atual" valor={(tecnicoSelecionado.ativo && tecnicoSelecionado.ativo.predio) || tecnicoSelecionado.predio || 'Base'} />
                <InfoLinha theme={theme} label="Horário de expediente" valor={`${String(tecnicoSelecionado.inicio ?? 8).padStart(2, '0')}h – ${String(tecnicoSelecionado.saida ?? 17).padStart(2, '0')}h`} />
                {tecnicoSelecionado.ativo && (
                  <InfoLinha theme={theme} label="Atendendo agora" valor={`${formatProtocolo(tecnicoSelecionado.ativo)} — ${tecnicoSelecionado.ativo.titulo || tecnicoSelecionado.ativo.descricao || ''}`} />
                )}

                <Btn theme={theme} title="Ver chamados" icon="confirmation-number" onPress={() => { setTecnicoSelecionado(null); irParaChamados ? irParaChamados('TODOS') : setTelaAtiva('CHAMADOS'); }} style={{ marginTop: 20 }} />
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const InfoLinha = ({ theme, label, valor }) => (
  <View style={{ marginTop: 14 }}>
    <Text style={{ color: theme.subtext, fontSize: 11, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.6 }}>{label}</Text>
    <Text style={{ color: theme.text, fontSize: 14, marginTop: 4 }}>{valor}</Text>
  </View>
);

const PageBtn = ({ theme, label, icon, active, disabled, onPress }) => (
  <TouchableOpacity
    disabled={disabled}
    onPress={onPress}
    style={{ minWidth: 30, height: 30, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginLeft: 4, paddingHorizontal: 6, backgroundColor: active ? theme.primaryStrong : icon ? theme.cardAlt : 'transparent', opacity: disabled ? 0.4 : 1 }}
  >
    {icon ? <MaterialIcons name={icon} size={18} color={theme.text} /> : <Text style={{ color: active ? '#fff' : theme.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>}
  </TouchableOpacity>
);

// Gráfico de área suave (curva de Catmull-Rom) com picos destacados.
function AreaChart({ data, theme, height = 190 }) {
  const [w, setW] = useState(0);
  const max = Math.max(1, ...data.map((d) => d.qtd));
  const padX = 8;
  const padTop = 16;
  const padBottom = 8;
  const innerH = height - padTop - padBottom;
  const pts = data.map((d, i) => ({
    x: padX + (i * (w - padX * 2)) / Math.max(1, data.length - 1),
    y: padTop + innerH - (d.qtd / max) * innerH,
    ...d,
  }));

  let linha = '';
  if (pts.length && w > 0) {
    linha = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      linha += ` C ${c1x} ${Math.min(c1y, padTop + innerH)} ${c2x} ${Math.min(c2y, padTop + innerH)} ${p2.x} ${p2.y}`;
    }
  }
  const area = linha ? `${linha} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z` : '';

  const ordenados = [...data].sort((a, b) => b.qtd - a.qtd);
  const picos = ordenados.filter((d) => d.qtd > 0).slice(0, 2).map((d) => d.hora);
  const total = data.reduce((s, d) => s + d.qtd, 0);
  const rotulos = data.filter((_, i) => i % 3 === 0 || i === data.length - 1);

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Defs>
            <LinearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.primary} stopOpacity="0.35" />
              <Stop offset="1" stopColor={theme.primary} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <Line key={f} x1={0} x2={w} y1={padTop + innerH * f} y2={padTop + innerH * f} stroke={theme.border} strokeDasharray="4 4" strokeWidth={1} />
          ))}
          {total > 0 && <Path d={area} fill="url(#gradArea)" />}
          {total > 0 && <Path d={linha} stroke={theme.primaryStrong} strokeWidth={2.5} fill="none" />}
          {total > 0 && pts.filter((p) => picos.includes(p.hora)).map((p) => (
            <Circle key={p.hora} cx={p.x} cy={p.y} r={5} fill={theme.primaryStrong} stroke={theme.card} strokeWidth={2} />
          ))}
          {total === 0 && <Line x1={0} x2={w} y1={padTop + innerH} y2={padTop + innerH} stroke={theme.primary} strokeWidth={2} />}
        </Svg>
      )}
      {total === 0 && <Text style={{ position: 'absolute', alignSelf: 'center', top: 80, color: theme.subtext, fontStyle: 'italic' }}>Sem aberturas no período</Text>}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        {rotulos.map((d) => {
          const pico = picos.includes(d.hora);
          return <Text key={d.hora} style={{ color: pico ? theme.primaryStrong : theme.subtext, fontSize: 12, fontWeight: pico ? '700' : '400' }}>{String(d.hora).padStart(2, '0')}:00{pico ? ' (Pico)' : ''}</Text>;
        })}
      </View>
      {picos.length > 0 && (
        <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 6 }}>
          Picos: {picos.map((h) => `${String(h).padStart(2, '0')}h`).join(' e ')} • {total} aberturas no período
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bigAvatar: { width: 56, height: 56, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  statusBox: { borderRadius: RADIUS.lg, padding: 12 },
  onlinePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm },
  periodTabs: { flexDirection: 'row', borderWidth: 1, borderRadius: RADIUS.sm, padding: 2 },
  periodTab: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  track: { height: 10, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, paddingTop: 12, marginTop: 'auto' },
  infoStrip: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: RADIUS.md, marginTop: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', height: 38, borderRadius: RADIUS.md, paddingHorizontal: 10 },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderRadius: RADIUS.md },
  th: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.6 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1 },
  mobileRow: { borderWidth: 1, borderRadius: RADIUS.lg, padding: 12, marginBottom: 10 },
  teamCard: { borderRadius: RADIUS.lg, padding: 12, marginBottom: 12 },
  teamFoot: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingHorizontal: 10, paddingVertical: 8, borderRadius: RADIUS.md },
  centerModalBg: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  techModalCard: { width: '100%', maxWidth: 400, borderRadius: RADIUS.lg, borderWidth: 1, padding: 22 },
});
