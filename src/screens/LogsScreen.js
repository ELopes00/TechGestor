import { ScrollView, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../components';
import { RADIUS } from '../theme/themes';

const getLogVisual = (mensagem = '', theme) => {
  const m = mensagem.toUpperCase();
  if (m.includes('ALERTA')) return { icon: 'warning-amber', color: theme.warning };
  if (m.includes('SAIU') || m.includes('LOGOUT')) return { icon: 'logout', color: theme.subtext };
  if (m.includes('LOGOU') || m.includes('ENTROU')) return { icon: 'login', color: theme.online };
  if (m.includes('EXCLUIU') || m.includes('APAGOU') || m.includes('LIMPOU')) return { icon: 'delete-outline', color: theme.offline };
  if (m.includes('CRIOU') || m.includes('CADASTROU')) return { icon: 'add-circle-outline', color: theme.primary };
  if (m.includes('ALTEROU') || m.includes('MODIFIC')) return { icon: 'edit', color: theme.sec };
  if (m.includes('EMPRESTOU') || m.includes('DEVOLUÇÃO') || m.includes('TRANSFER')) return { icon: 'swap-horiz', color: theme.tert };
  return { icon: 'receipt-long', color: theme.subtext };
};

export default function LogsScreen({ logs = [], theme }) {

  return (
    <ScrollView style={{ padding: 20 }}>
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialIcons name="receipt-long" size={19} color={theme.primary} style={{ marginRight: 7 }} />
          <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>Auditoria de Logs</Text>
        </View>
        <Text style={{ color: theme.subtext, fontSize: 13, marginTop: 2 }}>Histórico em tempo real de ações no sistema</Text>
      </View>

      <Card theme={theme} style={{ padding: 0, overflow: 'hidden', borderRadius: RADIUS.lg }}>
        {logs.length === 0 ? (
          <View style={{ padding: 24 }}>
            <Text style={{ color: theme.subtext, textAlign: 'center', fontStyle: 'italic' }}>Nenhum log registrado ainda.</Text>
          </View>
        ) : (
          logs.map((log, index) => {
            const visual = getLogVisual(log.mensagem, theme);
            return (
              <View key={log.id || index} style={{ flexDirection: 'row', paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: index % 2 === 0 ? 'transparent' : theme.cardAlt, alignItems: 'center' }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: theme.cardAlt, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <MaterialIcons name={visual.icon} size={15} color={visual.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>{log.mensagem}</Text>
                  <Text style={{ color: theme.subtext, fontSize: 11, marginTop: 2 }}>{log.usuario}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: theme.primary, fontSize: 10, fontWeight: '700', fontFamily: 'monospace' }}>{new Date(log.data).toLocaleDateString('pt-PT')}</Text>
                  <Text style={{ color: theme.subtext, fontSize: 10, fontFamily: 'monospace' }}>{new Date(log.data).toLocaleTimeString('pt-PT').slice(0,5)}</Text>
                </View>
              </View>
            );
          })
        )}
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
