import { useState } from 'react';
import { Image, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Card } from '../components';
import { RADIUS, SHADOW } from '../theme/themes';
import { APK_DOWNLOAD_URL } from '../utils/constants';

export default function WebDownloadScreen({ theme }) {
  const [showPrompt, setShowPrompt] = useState(true);

  const baixar = () => {
    Linking.openURL(APK_DOWNLOAD_URL);
    setShowPrompt(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Pergunta automática ao acessar o site — modal do próprio app (não o
          confirm() nativo do navegador, que trava a página até ser fechado). */}
      <Modal visible={showPrompt} transparent animationType="fade" onRequestClose={() => setShowPrompt(false)}>
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
          <Card theme={theme} style={[styles.promptCard, { borderColor: theme.border }]}>
            <View style={styles.logoRow}>
              <View style={styles.logoBadge}>
                <Image source={require('../../assets/images/logo-tjrr.png')} style={styles.logoImg} resizeMode="contain" />
              </View>
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Baixar o TechGestor?</Text>
            <Text style={[styles.subtitle, { color: theme.subtext }]}>
              O TechGestor é feito para uso pelo aplicativo no celular. Deseja baixar agora?
            </Text>

            <TouchableOpacity style={[styles.btnBaixar, { backgroundColor: theme.primary }, SHADOW.sm]} onPress={baixar} activeOpacity={0.85}>
              <MaterialIcons name="file-download" size={17} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.btnBaixarText}>Baixar agora</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnAgoraNao} onPress={() => setShowPrompt(false)} activeOpacity={0.7}>
              <Text style={[styles.btnAgoraNaoText, { color: theme.subtext }]}>Agora não</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </Modal>

      <Card theme={theme} style={[styles.card, { borderColor: theme.border }]}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <Image source={require('../../assets/images/logo-tjrr.png')} style={styles.logoImg} resizeMode="contain" />
          </View>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>TechGestor</Text>
        <Text style={[styles.subtitle, { color: theme.subtext }]}>
          O TechGestor é feito para uso pelo aplicativo. Baixe o app no seu celular para acessar o sistema.
        </Text>

        <TouchableOpacity
          style={[styles.btnBaixar, { backgroundColor: theme.primary }, SHADOW.sm]}
          onPress={baixar}
          activeOpacity={0.85}
        >
          <MaterialIcons name="file-download" size={17} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.btnBaixarText}>Baixar o app</Text>
        </TouchableOpacity>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 380, alignItems: 'center', padding: 32, borderRadius: RADIUS.xl, borderWidth: 1, ...SHADOW.sm },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  promptCard: { width: '100%', maxWidth: 380, alignItems: 'center', padding: 32, borderRadius: RADIUS.xl, borderWidth: 1, ...SHADOW.lg },
  btnAgoraNao: { marginTop: 12, paddingVertical: 8 },
  btnAgoraNaoText: { fontSize: 13, fontWeight: '600' },
  logoRow: { marginBottom: 14, alignItems: 'center' },
  logoBadge: { width: 84, height: 64, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1220', padding: 8 },
  logoImg: { width: '100%', height: '100%' },
  title: { fontSize: 19, marginBottom: 6, fontWeight: '700' },
  subtitle: { fontSize: 12.5, marginBottom: 24, textAlign: 'center', lineHeight: 18 },

  btnBaixar: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: RADIUS.md },
  btnBaixarText: { color: '#fff', fontWeight: '700', fontSize: 14.5 },
});
