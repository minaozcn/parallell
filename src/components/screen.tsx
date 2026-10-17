import { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";

// Sekme ekranlarının ortak çerçevesi: güvenli alan + tema arka planı
export function Screen({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.background }]}>
      {children}
    </SafeAreaView>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  const colors = useColors();
  return <Text style={[styles.muted, { color: colors.muted }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  muted: { fontSize: 14, marginTop: 16 },
});
