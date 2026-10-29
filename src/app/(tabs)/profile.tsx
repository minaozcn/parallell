import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { Screen, Muted } from "@/components/screen";
import { ProfileHeader } from "@/components/profile-header";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/button";
import { AchievementGrid } from "@/components/achievement-grid";
import { MomentsGrid } from "@/components/moments-grid";
import { PhotoViewer } from "@/components/photo-viewer";
import { Achievement, Me, fetchAchievements, fetchMe, toggleBadge } from "@/api/account";
import { MyMoment, fetchMyMoments } from "@/api/capsules";
import { formatDate } from "@/utils/format";

type Tab = "moments" | "achievements";

export default function Profile() {
  const colors = useColors();
  const [me, setMe] = useState<Me | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [moments, setMoments] = useState<MyMoment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("moments");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const load = useCallback(() => {
    Promise.all([fetchMe(), fetchAchievements(), fetchMyMoments()])
      .then(([m, list, mine]) => {
        setMe(m);
        setAchievements(list);
        setMoments(mine);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, []);

  useFocusEffect(load);

  async function onToggleBadge(a: Achievement) {
    try {
      await toggleBadge(a.key);
      load();
    } catch (e) {
      Alert.alert("Değiştirilemedi", (e as Error).message);
    }
  }

  const earned = achievements.filter((a) => a.earnedAt).length;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
          <Pressable onPress={() => router.push("/settings")} hitSlop={12} accessibilityLabel="Ayarlar">
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        </View>

        {error && <Muted>Yüklenemedi: {error}</Muted>}

        {me && (
          <ProfileHeader
            displayName={me.displayName}
            bio={me.bio}
            badge={me.badge}
            frame={me.equipped.frame}
            stats={[
              { value: me.stats.total, label: "an" },
              { value: me.stats.thisMonth, label: "bu ay" },
              { value: earned, label: "rozet" },
              { value: me.points, label: "puan" },
            ]}
          >
            <View style={styles.actions}>
              <Button label="Profili düzenle" variant="secondary" onPress={() => router.push("/profile-edit")} style={styles.action} />
              <Button
                label="Önizle"
                variant="secondary"
                onPress={() => router.push({ pathname: "/user/[id]", params: { id: String(me.id) } })}
                style={styles.action}
              />
            </View>
          </ProfileHeader>
        )}

        {me && (
          <>
            <Segmented
              options={[
                { key: "moments", label: `Anlar · ${moments.length}` },
                { key: "achievements", label: `Rozetler · ${earned}/${achievements.length}` },
              ]}
              value={tab}
              onChange={setTab}
            />

            {tab === "moments" ? (
              <MomentsGrid moments={moments} onOpen={setViewerIndex} />
            ) : (
              <>
                <Muted>Kazandığın bir rozete dokun: profilinde adının altında görünsün.</Muted>
                <AchievementGrid achievements={achievements} onToggle={onToggleBadge} />
              </>
            )}
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
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 18 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16 },
  title: { fontSize: 24, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
  action: { flex: 1 },
});
