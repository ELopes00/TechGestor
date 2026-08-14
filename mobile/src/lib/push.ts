import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { DataService } from "./dataService";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Pede permissão, gera o token Expo Push e salva em
 * usuarios/{uid}.expoPushToken — mesmo fluxo do app original (App.js,
 * setupPush()), só que fatorado aqui em vez de inline.
 *
 * Só funciona em dispositivo físico (emulador não recebe push) e precisa
 * do `extra.eas.projectId` preenchido em app.json — ver o comentário lá.
 */
export async function registrarPushMobile(uid: string): Promise<{ sucesso: boolean; erro?: string }> {
  if (!Device.isDevice) {
    return { sucesso: false, erro: "Push só funciona em dispositivo físico, não no emulador." };
  }

  const permissaoAtual = await Notifications.getPermissionsAsync();
  let status = permissaoAtual.status;
  if (status !== "granted") {
    const pedido = await Notifications.requestPermissionsAsync();
    status = pedido.status;
  }
  if (status !== "granted") {
    return { sucesso: false, erro: "Permissão de notificações negada." };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#152f56",
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId || typeof projectId !== "string") {
    return { sucesso: false, erro: "Preencha extra.eas.projectId em app.json (rode `eas init`)." };
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  await DataService.salvarPushToken(uid, tokenData.data);
  return { sucesso: true };
}
