import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { Screen, Muted } from "@/components/screen";
import { Me, fetchMe, updateDisplayName } from "@/api/account";

export default function Profile() {
  const colors = useColors();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveName() {
    setSaving(true);
    try {
      const { displayName } = await updateDisplayName(name);
      setMe((m) => (m ? { ...m, displayName } : m));
    } catch (e) {
      Alert.alert("Kaydedilemedi", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchMe()
        .then((m) => { setMe(m); setName(m.displayName); setError(null); })
        .catch((e) => setError(e.message));
    }, []),
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        {error && <Muted>Yüklenemedi: {error}</Muted>}
        {me && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.name, { color: colors.text }]}>{me.displayName}</Text>
              <Text style={{ color: colors.muted }}>✦ {me.points} puan</Text>
            </View>

            <Text style={[styles.section, { color: colors.text }]}>Görünen adın</Text>
            <View style={styles.nameRow}>
              <TextInput
                value={name}
                onChangeText={setName}
                maxLength={24}
                autoCorrect={false}
                style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
                placeholderTextColor={colors.muted}
                placeholder="Takma ad"
              />
              <Pressable
                disabled={saving || name.trim() === me.displayName}
                onPress={saveName}
                style={[
                  styles.save,
                  { backgroundColor: colors.buttonBackground },
                  (saving || name.trim() === me.displayName) && { opacity: 0.4 },
                ]}
              >
                <Text style={{ color: colors.buttonText, fontWeight: "600" }}>{saving ? "..." : "Kaydet"}</Text>
              </Pressable>
            </View>

            <Text style={[styles.section, { color: colors.text }]}>Eşyaların</Text>
            {me.items.length === 0 ? (
              <Muted>Henüz bir eşyan yok. Rewards sekmesinden puanlarınla alabilirsin.</Muted>
            ) : (
              me.items.map((i) => (
                <Text key={i.id} style={{ color: colors.text }}>• {i.name}</Text>
              ))
            )}

            <Muted>Hesabın bu cihaza bağlı anonim bir kimlik. Uygulamayı silersen puanların kaybolur.</Muted>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 10 },
  title: { marginTop: 16, fontSize: 24, fontWeight: "600" },
  card: { padding: 20, borderRadius: 20, gap: 4 },
  name: { fontSize: 20, fontWeight: "600" },
  section: { marginTop: 20, fontSize: 18, fontWeight: "600" },
  nameRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, fontSize: 16 },
  save: { paddingHorizontal: 18, justifyContent: "center", borderRadius: 14 },
});
