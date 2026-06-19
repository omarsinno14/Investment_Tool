import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { apiFetch } from "@/lib/api";

export function useNotificationSetup() {
  const tokenRegistered = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web" || tokenRegistered.current) return;

    async function registerPushToken() {
      try {
        const Constants = (await import("expo-constants")).default;
        const isDevice = Constants.isDevice ?? true;
        if (!isDevice) return;

        let Notifications: any;
        try {
          Notifications = await import("expo-notifications");
        } catch {
          return;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") return;

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          (Constants as any).easConfig?.projectId;

        const tokenData = projectId
          ? await Notifications.getExpoPushTokenAsync({ projectId })
          : await Notifications.getDevicePushTokenAsync().catch(() => null);

        if (!tokenData) return;

        const token = typeof tokenData.data === "string" ? tokenData.data : JSON.stringify(tokenData.data);

        await apiFetch("/api/user/push-token", {
          method: "POST",
          body: JSON.stringify({ token, platform: Platform.OS }),
        }).catch(() => {});

        tokenRegistered.current = true;

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
      } catch {
      }
    }

    registerPushToken();
  }, []);
}
