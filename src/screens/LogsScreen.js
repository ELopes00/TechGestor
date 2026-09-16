import { ScrollView, Text, View } from 'react-native';
import { Card } from '../components';
import { RADIUS } from '../theme/themes';

export default function LogsScreen({ logs = [], theme }) {

  return (
    <ScrollView style={{ padding: 20 }}>
      <View style={{ marginBottom: 20 }}>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>Auditoria de Logs</Text>
        <Text style={{ color: theme.subtext, fontSize: 13, marginTop: 2 }}>Histórico em tempo real de ações no sistema</Text>
      </View>

      <Card theme={theme} style={{ padding: 0, overflow: 'hidden', borderRadius: RADIUS.lg }}>
        {logs.length === 0 ? (
          <View style={{ padding: 24 }}>
            <Text style={{ color: theme.subtext, textAlign: 'center', fontStyle: 'italic' }}>Nenhum log registrado ainda.</Text>
          </View>
        ) : (
          logs.map((log, index) => (
            <View key={log.id || index} style={{ flexDirection: 'row', paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: index % 2 === 0 ? 'transparent' : theme.cardAlt, alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>{log.mensagem}</Text>
                <Text style={{ color: theme.subtext, fontSize: 11, marginTop: 2 }}>{log.usuario}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: theme.primary, fontSize: 10, fontWeight: '700' }}>{new Date(log.data).toLocaleDateString('pt-PT')}</Text>
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