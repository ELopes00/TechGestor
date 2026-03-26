import { ScrollView, Text, View } from 'react-native';
import { Card } from '../components';

export default function LogsScreen({ logs = [], theme }) {
  
  return (
    <ScrollView style={{ padding: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ color: theme.primary, fontSize: 24, fontWeight: 'bold' }}>📜 Auditoria de Logs</Text>
      </View>

      <Card theme={theme} style={{ marginBottom: 15, backgroundColor: theme.inputBg, alignItems: 'center' }}>
        <Text style={{ color: theme.subtext, fontSize: 12, textTransform: 'uppercase' }}>Auditoria do Sistema</Text>
        <Text style={{ color: theme.sec, fontSize: 22, fontWeight: 'bold' }}>Histórico em Tempo Real</Text>
      </Card>
      
      <Card theme={theme} style={{ padding: 0, overflow: 'hidden' }}>
        {logs.length === 0 ? (
          <View style={{ padding: 20 }}>
            <Text style={{ color: theme.subtext, textAlign: 'center', fontStyle: 'italic' }}>Nenhum log registrado ainda.</Text>
          </View>
        ) : (
          logs.map((log, index) => (
            <View key={log.id || index} style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: index % 2 === 0 ? 'transparent' : theme.inputBg, alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 13 }}>{log.mensagem}</Text>
                <Text style={{ color: theme.subtext, fontSize: 11, marginTop: 2 }}>👤 {log.usuario}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: theme.primary, fontSize: 10, fontWeight: 'bold' }}>{new Date(log.data).toLocaleDateString('pt-PT')}</Text>
                <Text style={{ color: theme.subtext, fontSize: 10 }}>{new Date(log.data).toLocaleTimeString('pt-PT').slice(0,5)}</Text>
              </View>
            </View>
          ))
        )}
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}