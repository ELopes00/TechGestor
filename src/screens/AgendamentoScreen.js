import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Btn, Card } from '../components';
import { DataService } from '../services/DataService';
import { RADIUS } from '../theme/themes';

export default function AgendamentoScreen({ user, agendamentos, setAgendamentos, users, addLog, theme }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [servico, setServico] = useState('');
  const [tecSel, setTecSel] = useState('');
  const [hora, setHora] = useState('08:00');
  const [showTecs, setShowTecs] = useState(false);

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, dateStr });
    }
    return days;
  };

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const agendar = async () => {
    if (!servico || !hora || !tecSel) return Alert.alert('Erro', 'Preencha o serviço, a hora e o técnico!');
    try {
      await DataService.salvarAgendamento({
        data: selectedDate, servico, hora, tecnico: tecSel, status: 'PENDENTE', marcadoPor: user.login
      });
      setServico(''); setHora('08:00'); setTecSel('');
      Alert.alert('Sucesso', 'Agendamento salvo na nuvem!');
      if(addLog) addLog(`CRIOU AGENDAMENTO PARA: ${tecSel}`);
    } catch (error) { Alert.alert('Erro', 'Não foi possível agendar. ' + error.message); }
  };

  const handleAcaoAgendamento = async (id, acao) => {
    const mensagem = acao === 'CONCLUIR' ? "Deseja marcar este serviço como concluído?" : "Tem certeza que deseja cancelar e apagar este agendamento?";
    const confirmarEApagar = async () => {
      try {
        await DataService.deletarAgendamento(id);
        if(addLog) addLog(`${acao === 'CONCLUIR' ? 'CONCLUIU' : 'CANCELOU'} AGENDAMENTO`);
      } catch (error) { Alert.alert('Erro', 'Falha ao processar: ' + error.message); }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(mensagem)) confirmarEApagar();
    } else {
      Alert.alert(acao === 'CONCLUIR' ? "Concluir Tarefa" : "Cancelar Agendamento", mensagem, [
        { text: "Voltar", style: "cancel" }, { text: "Sim", style: "destructive", onPress: confirmarEApagar }
      ]);
    }
  };

  const dias = generateCalendar();
  const tarefasDoDia = agendamentos.filter(a => a.data === selectedDate);

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 4 }}>Agenda da Equipe</Text>
      <Text style={{ color: theme.subtext, fontSize: 13, marginBottom: 16 }}>Planeje e acompanhe os atendimentos</Text>

      {/* CALENDÁRIO AGENDA */}
      <Card theme={theme} style={{ marginBottom: 15, padding: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={{ padding: 10 }} activeOpacity={0.7}><Text style={{ color: theme.primary, fontSize: 18, fontWeight: '700' }}>{'‹'}</Text></TouchableOpacity>
          <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>{months[currentDate.getMonth()]} {currentDate.getFullYear()}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={{ padding: 10 }} activeOpacity={0.7}><Text style={{ color: theme.primary, fontSize: 18, fontWeight: '700' }}>{'›'}</Text></TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <Text key={`wd-${i}`} style={{ width: '14.2%', textAlign: 'center', color: theme.subtext, fontWeight: 'bold', marginBottom: 5, fontSize: 12 }}>{d}</Text>
          ))}
          {dias.map((d, i) => (
            <TouchableOpacity 
              key={i} 
              disabled={!d}
              style={{
                width: '14.2%', 
                height: 35, // altura fixa e pequena
                justifyContent: 'center', alignItems: 'center',
                backgroundColor: d?.dateStr === selectedDate ? theme.primary : 'transparent',
                borderRadius: 17.5, // Metade da altura para ficar redondo
                marginVertical: 2
              }}
              onPress={() => d && setSelectedDate(d.dateStr)}
            >
              <Text style={{ color: d?.dateStr === selectedDate ? '#fff' : (d ? theme.text : 'transparent'), fontWeight: d?.dateStr === selectedDate ? 'bold' : 'normal', fontSize: 14 }}>
                {d ? d.day : ''}
              </Text>
              {d && agendamentos.some(a => a.data === d.dateStr) && (
                <View style={{ width: 4, height: 4, backgroundColor: theme.sec, borderRadius: 2, position: 'absolute', bottom: 3 }} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 10 }}>Tarefas: {selectedDate.split('-').reverse().join('/')}</Text>

      {tarefasDoDia.length === 0 ? (
        <Text style={{ color: theme.subtext, marginBottom: 15, fontStyle: 'italic', fontSize: 12 }}>Nenhum serviço agendado para esta data.</Text>
      ) : (
        tarefasDoDia.map(t => (
          <Card key={t.id} theme={theme} style={{ marginBottom: 10, borderLeftWidth: 3, borderLeftColor: theme.sec, padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>{t.servico}</Text>
                <Text style={{ color: theme.subtext, fontSize: 11, marginTop: 2 }}>{t.hora} · {t.tecnico}</Text>
              </View>
              {user.perfil === 'ADM' && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => handleAcaoAgendamento(t.id, 'CONCLUIR')} style={{ paddingHorizontal: 8 }}><Text style={{ fontSize: 18 }}>✅</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleAcaoAgendamento(t.id, 'CANCELAR')} style={{ paddingLeft: 8 }}><Text style={{ fontSize: 18 }}>🗑️</Text></TouchableOpacity>
                </View>
              )}
            </View>
          </Card>
        ))
      )}

      {user.perfil === 'ADM' && (
        <Card theme={theme} style={{ marginTop: 10, padding: 14 }}>
          <Text style={{ color: theme.text, fontWeight: '700', marginBottom: 12, fontSize: 14 }}>Agendar Novo Serviço</Text>
          <View style={{ flexDirection: 'row', marginBottom: 10 }}>
            <TextInput style={[styles.input, { flex: 2, backgroundColor: theme.inputBg, color: theme.text, marginRight: 8, borderColor: theme.border }]} placeholder="Ex: Formatar PC" placeholderTextColor={theme.subtext} value={servico} onChangeText={setServico} />
            <TextInput style={[styles.input, { flex: 1, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="08:00" placeholderTextColor={theme.subtext} value={hora} onChangeText={setHora} />
          </View>
          <TouchableOpacity style={[styles.input, { width: '100%', backgroundColor: theme.inputBg, borderColor: theme.border, justifyContent: 'center', marginBottom: 10 }]} onPress={() => setShowTecs(!showTecs)} activeOpacity={0.75}>
            <Text style={{ color: tecSel ? theme.text : theme.subtext }}>{tecSel || 'Selecionar Técnico ↓'}</Text>
          </TouchableOpacity>
          {showTecs && (
            <View style={{ backgroundColor: theme.cardAlt, borderRadius: RADIUS.md, marginBottom: 10, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' }}>
              {users.filter((u) => u.perfil === 'TECNICO').map((u) => (
                <TouchableOpacity key={u.login} onPress={() => { setTecSel(u.login); setShowTecs(false); }} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border }} activeOpacity={0.7}>
                  <Text style={{ color: theme.text, fontWeight: '600' }}>{u.login}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Btn title="AGENDAR TAREFA" onPress={agendar} theme={theme} />
        </Card>
      )}
      
      <View style={{height: 40}}/>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: { padding: 12, borderRadius: RADIUS.md, borderWidth: 1 }
});