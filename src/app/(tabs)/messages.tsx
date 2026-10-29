import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { Screen, Muted } from "@/components/screen";
import { Conversation, fetchConversations } from "@/api/social";
import { formatDate } from "@/utils/format";

export default function Messages() {
  const colors = useColors();
  const [items, setItems] = useState<Conversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchConversations()
        .then((c) => { setItems(c); setError(null); })
        .catch((e) => setError(e.message));
    }, []),
  );

  return (
    <Screen>
      <FlatList
        data={items ?? []}
        keyExtractor={(c) => String(c.userId)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<Text style={[styles.title, { color: colors.text }]}>Mesajlar</Text>}
        ListEmptyComponent={
          <Muted>
            {error
              ? `Yüklenemedi: ${error}`
              : items
                ? "Henüz paralel bağlantın yok. Bir kapsülde birinin anına ✦ ver; o da seninkine verirse burada sohbetiniz açılır."
                : "Yükleniyor..."}
          </Muted>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: "/chat/[id]", params: { id: String(item.userId), name: item.displayName } })}
            style={({ pressed }) => [styles.row, { backgroundColor: colors.card }, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.name, { color: colors.text }]}>{item.displayName}</Text>
              <Text style={{ color: colors.muted }} numberOfLines={1}>
                {item.lastMessage ?? "Paralel bağlantı kuruldu ✦"}
              </Text>
            </View>
            <View style={styles.meta}>
              {item.lastAt && <Text style={{ color: colors.muted, fontSize: 12 }}>{formatDate(item.lastAt)}</Text>}
              {item.unread > 0 && (
                <View style={[styles.unread, { backgroundColor: colors.buttonBackground }]}>
                  <Text style={{ color: colors.buttonText, fontSize: 12, fontWeight: "700" }}>{item.unread}</Text>
                </View>
              )}
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 10 },
  title: { marginTop: 16, marginBottom: 4, fontSize: 24, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16, gap: 12 },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: "600" },
  meta: { alignItems: "flex-end", gap: 4 },
  unread: { minWidth: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
});
