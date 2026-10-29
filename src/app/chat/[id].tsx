import { useCallback, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import { Muted } from "@/components/screen";
import { Message, fetchMessages, sendMessage } from "@/api/social";
import { formatTime } from "@/utils/format";

const POLL_MS = 4000; // basit yaklaşım: ekran açıkken 4 saniyede bir yeni mesajları sor

export default function Chat() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const userId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    fetchMessages(userId)
      .then((m) => { setMessages(m); setError(null); })
      .catch((e) => setError(e.message));
  }, [userId]);

  // Ekran açıkken düzenli yenile, ekrandan çıkınca dur
  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(load, POLL_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const message = await sendMessage(userId, body);
      setMessages((m) => [message, ...(m ?? [])]);
      setText("");
    } catch (e) {
      Alert.alert("Gönderilemedi", (e as Error).message); // yazdığın metin silinmez, tekrar deneyebilirsin
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <Stack.Screen
        options={{
          title: name ?? "",
          headerRight: () => (
            <Pressable onPress={() => router.push({ pathname: "/user/[id]", params: { id: String(userId) } })} hitSlop={12}>
              <Text style={{ color: colors.text, fontWeight: "600" }}>Profil</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        inverted // en yeni mesaj altta; liste aşağıdan yukarı büyür
        data={messages ?? []}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Muted>{error ?? (messages ? "Paralel bağlantınız kuruldu. İlk mesajı sen yaz ✦" : "Yükleniyor...")}</Muted>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.mine
                ? { alignSelf: "flex-end", backgroundColor: colors.buttonBackground }
                : { alignSelf: "flex-start", backgroundColor: colors.card },
            ]}
          >
            <Text style={{ color: item.mine ? colors.buttonText : colors.text, fontSize: 15 }}>{item.body}</Text>
            <Text style={[styles.time, { color: item.mine ? colors.buttonText : colors.muted }]}>{formatTime(item.createdAt)}</Text>
          </View>
        )}
      />
      <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8, borderTopColor: colors.card }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Mesaj yaz"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={1000}
          style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
        />
        <Pressable
          onPress={send}
          disabled={sending || !text.trim()}
          style={[styles.send, { backgroundColor: colors.buttonBackground }, (sending || !text.trim()) && { opacity: 0.4 }]}
        >
          <Text style={{ color: colors.buttonText, fontWeight: "700" }}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 8, flexGrow: 1 },
  empty: { transform: [{ scaleY: -1 }], padding: 20 }, // inverted listede boş mesaj ters dönmesin
  bubble: { maxWidth: "80%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, gap: 2 },
  time: { fontSize: 10, opacity: 0.7, alignSelf: "flex-end" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1 },
  input: { flex: 1, maxHeight: 120, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, fontSize: 15 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
