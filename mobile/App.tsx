import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import InicioScreen from "./src/screens/InicioScreen";
import PerfilScreen from "./src/screens/PerfilScreen";
import EmBreveScreen from "./src/screens/EmBreveScreen";
import LoginScreen from "./src/screens/LoginScreen";
import { useUsuarioAtual } from "./src/lib/auth";
import { registrarPushMobile } from "./src/lib/push";
import { cores } from "./src/theme/colors";

const Tab = createBottomTabNavigator();

const ICONES: Record<string, keyof typeof Ionicons.glyphMap> = {
  Início: "home",
  QRCode: "qr-code",
  Notificações: "notifications",
  Perfil: "person",
};

/**
 * Entrada do app — login real (`useUsuarioAtual`, mesmo padrão do web)
 * seguido de Bottom Tabs: Início (Meus Chamados → detalhe do chamado) ·
 * Escanear QR Code · Notificações · Perfil. QR Code e Notificações são
 * placeholders (ver mobile/README.md, "O que falta").
 */
export default function App() {
  const { usuario, carregando } = useUsuarioAtual();

  useEffect(() => {
    if (usuario) registrarPushMobile(usuario.uid).catch(() => {});
  }, [usuario?.uid]);

  if (carregando) {
    return (
      <View style={styles.carregando}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (!usuario) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <LoginScreen />
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: cores.institucional700,
          tabBarInactiveTintColor: cores.textMuted,
          tabBarIcon: ({ color, size }) => <Ionicons name={ICONES[route.name]} color={color} size={size} />,
        })}
      >
        <Tab.Screen name="Início">{() => <InicioScreen usuario={usuario} />}</Tab.Screen>
        <Tab.Screen name="QRCode" options={{ title: "Escanear" }}>
          {() => <EmBreveScreen titulo="Escanear QR Code" emoji="📷" descricao="Vai vincular prédio/setor ao abrir ou localizar um chamado." />}
        </Tab.Screen>
        <Tab.Screen name="Notificações">
          {() => <EmBreveScreen titulo="Notificações" emoji="🔔" descricao="Histórico de avisos de chamados atribuídos e da fila da sua unidade." />}
        </Tab.Screen>
        <Tab.Screen name="Perfil">{() => <PerfilScreen usuario={usuario} />}</Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#152f56" },
  carregando: { flex: 1, backgroundColor: "#152f56", alignItems: "center", justifyContent: "center" },
});
