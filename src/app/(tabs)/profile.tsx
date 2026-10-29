import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { Screen, Muted } from "@/components/screen";
import { Achievement, Me, fetchAchievements, fetchMe, toggleBadge, updateBio, updateDisplayName } from "@/api/account";
import { FRAMES } from "@/constants/cosmetics";
import { CosmeticFrame } from "@/components/cosmetic-frame";
import { AchievementGrid } from "@/components/achievement-grid";
import { MomentsGrid } from "@/components/moments-grid";
import { PhotoViewer } from "@/components/photo-viewer";
import { MyMoment, fetchCurrentCapsule, fetchMyMoments } from "@/api/capsules";
import { NotificationPrefs, ensurePermission, getPrefs, savePrefs, syncCapsuleNotifications } from "@/utils/notifications";
import { formatDate } from "@/utils/format";
import { Ionicons } from "@expo/vector-icons";

export default function Profile() {
  const colors = useColors();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState("");
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [moments, setMoments] = useState<MyMoment[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  const load = useCallback(() => {
    Promise.all([fetchMe(), fetchAchievements(), fetchMyMoments()])
      .then(([m, list, mine]) => {
        setMe(m);
        setName(m.displayName);
        setBio(m.bio ?? "");
        setAchievements(list);
        setMoments(mine);
        setError(null);
      })
      .catch((e) => setError(e.message));
    getPrefs().then(setPrefs);
  }, []);

  async function saveBio() {
    try {
      const { bio: saved } = await updateBio(bio);
      setMe((m) => (m ? { ...m, bio: saved } : m));
    } catch (e) {
      Alert.alert("Kaydedilemedi", (e as Error).message);
    }
  }

  async function updatePrefs(change: Partial<NotificationPrefs>) {
    if (!prefs) return;
    const turningOn = Object.values(change).some(Boolean);
    if (turningOn && !(await ensurePermission())) {
      Alert.alert("Bildirim izni kapalı", "Ayarlar > parallell (Expo Go) > Bildirimler bölümünden izin verebilirsin.");
      return;
    }
    const next = { ...prefs, ...change, asked: true };
    setPrefs(next);
    await savePrefs(next);
    // Ayar değişti: güncel kapsülün bildirimlerini yeniden kur
    const capsule = await fetchCurrentCapsule().catch(() => null);
    if (capsule) {
      syncCapsuleNotifications({ prompt: capsule.prompt, opensAt: capsule.opensAt, joined: Boolean(capsule.myContribution) });
    }
  }

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
            <CosmeticFrame look={me.equipped.frame ? FRAMES[me.equipped.frame] : null} radius={22} width={3}>
              <View style={[styles.card, { backgroundColor: colors.card }]}>
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
            </CosmeticFrame>

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

            <Text style={[styles.section, { color: colors.text }]}>Hakkında</Text>
            <View style={styles.nameRow}>
              <TextInput
                value={bio}
                onChangeText={setBio}
                maxLength={160}
                multiline
                placeholder="Kısa bir cümle: nereden, neye bakmayı seversin?"
                placeholderTextColor={colors.muted}
                style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
              />
              <Pressable
                disabled={bio.trim() === (me.bio ?? "")}
                onPress={saveBio}
                style={[styles.save, { backgroundColor: colors.buttonBackground }, bio.trim() === (me.bio ?? "") && { opacity: 0.4 }]}
              >
                <Text style={{ color: colors.buttonText, fontWeight: "600" }}>Kaydet</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => router.push({ pathname: "/user/[id]", params: { id: String(me.id) } })}>
              <Text style={{ color: colors.text, fontWeight: "600" }}>Profilimi başkalarının gördüğü gibi gör ›</Text>
            </Pressable>

            <Text style={[styles.section, { color: colors.text }]}>Anların · {moments.length}</Text>
            <MomentsGrid moments={moments} onOpen={setViewerIndex} />

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

            <Text style={[styles.section, { color: colors.text }]}>Bildirimler</Text>
            {prefs && (
              <>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Kapsül açılınca haber ver</Text>
                  <Switch value={prefs.reveal} onValueChange={(v) => updatePrefs({ reveal: v })} />
                </View>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Katılmadıysam son 1 saatte hatırlat</Text>
                  <Switch value={prefs.reminder} onValueChange={(v) => updatePrefs({ reminder: v })} />
                </View>
              </>
            )}

            <Muted>Hesabın bu cihaza bağlı anonim bir kimlik. Uygulamayı silersen puanların kaybolur.</Muted>
          </>
        )}
      </ScrollView>

      <PhotoViewer
        photos={moments.map((m) => ({
          ...m,
          mine: true,
          caption: [
            `${m.prompt} · ${formatDate(m.opensAt)}`,
            m.hidden
              ? "Bildirimler nedeniyle gizlendi"
              : m.revealed
                ? m.reactionCount > 0
                  ? `${m.reactionCount} kişi bu anını gördü ✦`
                  : "Henüz tepki yok"
                : "Kapsül henüz açılmadı",
          ].join("\n"),
        }))}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
      />
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
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  switchLabel: { flex: 1, fontSize: 15, marginRight: 12 },
});
