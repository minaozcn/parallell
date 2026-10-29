import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { AppThemeProvider, usePalette } from "@/hooks/app-theme";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function RootStack() {
  const { colors, isDark } = usePalette();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="capsule/[id]" options={{ title: "", headerBackTitle: "Geri" }} />
        <Stack.Screen name="user/[id]" options={{ title: "", headerBackTitle: "Geri" }} />
        <Stack.Screen name="chat/[id]" options={{ title: "", headerBackTitle: "Geri" }} />
        <Stack.Screen name="settings" options={{ title: "Ayarlar", headerBackTitle: "Geri" }} />
        <Stack.Screen name="profile-edit" options={{ title: "Profili düzenle", presentation: "modal" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootStack />
    </AppThemeProvider>
  );
}
