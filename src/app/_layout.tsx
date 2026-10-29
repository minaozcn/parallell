import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppThemeProvider, usePalette } from "@/hooks/app-theme";

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
