import { useCallback, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { Screen, Muted } from "@/components/screen";
import { RevealedCapsule, fetchRevealedCapsules } from "@/api/capsules";
import { formatDate } from "@/utils/format";

export default function Archive() {
  const colors = useColors();
  const [capsules, setCapsules] = useState<RevealedCapsule[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setCapsules(await fetchRevealedCapsules());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <Screen>
      <FlatList
        contentContainerStyle={styles.content}
        data={capsules ?? []}
        keyExtractor={(c) => String(c.id)}
        refreshing={refreshing}
        onRefresh={refresh}
        ListHeaderComponent={<Text style={[styles.title, { color: colors.text }]}>Archive</Text>}
        ListEmptyComponent={
          <Muted>{error ? `Yüklenemedi: ${error}` : capsules ? "Henüz açılmış bir kapsül yok." : "Yükleniyor..."}</Muted>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, { backgroundColor: colors.card }, pressed && { opacity: 0.7 }]}
            onPress={() => router.push({ pathname: "/capsule/[id]", params: { id: String(item.id) } })}
          >
            <Image source={{ uri: item.coverUrl }} style={styles.thumb} />
            <View style={styles.rowText}>
              <Text style={[styles.prompt, { color: colors.text }]} numberOfLines={1}>{item.prompt}</Text>
              <Text style={{ color: colors.muted }}>
                {formatDate(item.opensAt)} · {item.participantCount} katılımcı
              </Text>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  title: { marginTop: 16, marginBottom: 4, fontSize: 24, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 16 },
  thumb: { width: 64, height: 64, borderRadius: 12 },
  rowText: { flex: 1, gap: 4 },
  prompt: { fontSize: 16, fontWeight: "500" },
});
