import { useEffect, useState } from 'react';
import { Image, Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

import { Card } from '.';
import { RADIUS, SHADOW } from '../theme/themes';
import { APK_DOWNLOAD_URL } from '../utils/constants';

const FLAG_VISTO = '@download_prompt_visto';

export default function WebDownloadWidget({ theme }) {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    AsyncStorage.getItem(FLAG_VISTO).then((visto) => {
      if (!visto) {
        setShowPrompt(true);
        AsyncStorage.setItem(FLAG_VISTO, '1');
      }
    });
  }, []);

  if (Platform.OS !== 'web') return null;

  const baixar = () => {
    Linking.openURL(APK_DOWNLOAD_URL);
    setShowPrompt(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.corner, { backgroundColor: theme.primary }, SHADOW.sm]}
        onPress={baixar}
        activeOpacity={0.85}
      >
        <MaterialIcons name="file-download" size={15} color="#fff" style={{ marginRight: 6 }} />
        <Text style={styles.cornerText}>Baixar app</Text>
      </TouchableOpacity>

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
              Você também pode continuar usando pelo navegador.
            </Text>

            <TouchableOpacity style={[styles.btnBaixar, { backgroundColor: theme.primary }, SHADOW.sm]} onPress={baixar} activeOpacity={0.85}>
              <MaterialIcons name="file-download" size={17} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.btnBaixarText}>Baixar agora</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnAgoraNao} onPress={() => setShowPrompt(false)} activeOpacity={0.7}>
              <Text style={[styles.btnAgoraNaoText, { color: theme.subtext }]}>Continuar no navegador</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  corner: { position: 'fixed', top: 14, right: 14, zIndex: 999, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: RADIUS.md },
  cornerText: { color: '#fff', fontWeight: '700', fontSize: 12.5 },
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
