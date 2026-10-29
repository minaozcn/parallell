import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { Screen, Muted } from "@/components/screen";
import { Achievement, Me, fetchAchievements, fetchMe, toggleBadge, updateDisplayName } from "@/api/account";
import { FRAME_COLORS } from "@/constants/cosmetics";
import { AchievementGrid } from "@/components/achievement-grid";
import { Ionicons } from "@expo/vector-icons";

export default function Profile() {
  const colors = useColors();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const load = useCallback(() => {
    Promise.all([fetchMe(), fetchAchievements()])
      .then(([m, list]) => {
        setMe(m);
        setName(m.displayName);
        setAchievements(list);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function onToggleBadge(a: Achievement) {
    try {
      await toggleBadge(a.key);
      load();
    } catch (e) {
      Alert.alert("Değiştirilemedi", (e as Error).message);
    }
  }

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

  useFocusEffect(load);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        {error && <Muted>Yüklenemedi: {error}</Muted>}
        {me && (
          <>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card },
                me.equipped.frame && { borderWidth: 2, borderColor: FRAME_COLORS[me.equipped.frame] },
              ]}
            >
              <View style={styles.nameLine}>
                <Text style={[styles.name, { color: colors.text }]}>{me.displayName}</Text>
                {me.badge ? (
                  <View style={[styles.badge, { backgroundColor: colors.buttonBackground }]}>
                    <Ionicons name={me.badge.icon as React.ComponentProps<typeof Ionicons>["name"]} size={13} color={colors.buttonText} />
                    <Text style={{ color: colors.buttonText, fontSize: 12, fontWeight: "600" }}>{me.badge.name}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ color: colors.muted }}>✦ {me.points} puan</Text>
              <Text style={{ color: colors.muted }}>
                {me.stats.thisMonth > 0
                  ? `Bu ay ${me.stats.thisMonth} kapsüle katıldın · toplam ${me.stats.total}`
                  : me.stats.total > 0
                    ? `Toplam ${me.stats.total} kapsüle katıldın`
                    : "Henüz bir kapsüle katılmadın"}
              </Text>
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

            <Text style={[styles.section, { color: colors.text }]}>
              Rozetler · {achievements.filter((a) => a.earnedAt).length}/{achievements.length}
            </Text>
            <Muted>Kazandığın bir rozete dokunarak profilinde gösterebilirsin.</Muted>
            <AchievementGrid achievements={achievements} onToggle={onToggleBadge} />

            <Text style={[styles.section, { color: colors.text }]}>Eşyaların</Text>
            {me.items.length === 0 ? (
              <Muted>Henüz bir eşyan yok. Rewards sekmesinden puanlarınla alabilirsin.</Muted>
            ) : (
              me.items.map((i) => (
                <Text key={i.id} style={{ color: colors.text }}>
                  • {i.name}
                  {i.equipped ? <Text style={{ color: colors.muted }}> · kullanılıyor</Text> : null}
                </Text>
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
  nameLine: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  section: { marginTop: 20, fontSize: 18, fontWeight: "600" },
  nameRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, fontSize: 16 },
  save: { paddingHorizontal: 18, justifyContent: "center", borderRadius: 14 },
});
