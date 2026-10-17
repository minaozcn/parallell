import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColors } from "@/hooks/use-colors";

export default function RootLayout() {
  const colors = useColors();

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="capsule/[id]" options={{ title: "" , headerBackTitle: "Geri" }} />
      </Stack>
    </>
  );
}
