import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { Muted } from "@/components/screen";
import { CapsuleMap } from "@/components/capsule-map";
import { MomentsGrid } from "@/components/moments-grid";
import { PhotoViewer } from "@/components/photo-viewer";
import { FRAMES } from "@/constants/cosmetics";
import { CosmeticFrame } from "@/components/cosmetic-frame";
import { Profile, UserReportReason, blockUser, fetchProfile, reportUser } from "@/api/social";
import { formatDate } from "@/utils/format";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

// "An pasaportu": takipçi ya da beğeni sayısı yok; kişinin açılmış anları, yerleri ve rozetleri var.
export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchProfile(Number(id))
        .then((p) => { setProfile(p); setError(null); })
        .catch((e) => setError(e.message));
    }, [id]),
  );

  function openMenu() {
    if (!profile) return;
    const report = (reason: UserReportReason) =>
      reportUser(profile.id, reason)
        .then(() => Alert.alert("Teşekkürler", "Bildirimin alındı."))
        .catch((e) => Alert.alert("Bildirilemedi", e.message));

    Alert.alert(profile.displayName, undefined, [
      {
        text: "Bildir",
        onPress: () =>
          Alert.alert("Kullanıcıyı bildir", "Neden?", [
            { text: "Taciz / rahatsız edici", onPress: () => report("harassment") },
            { text: "Spam", onPress: () => report("spam") },
            { text: "Uygunsuz içerik", onPress: () => report("inappropriate") },
            { text: "Diğer", onPress: () => report("other") },
            { text: "Vazgeç", style: "cancel" },
          ]),
      },
      {
        text: "Engelle",
        style: "destructive",
        onPress: () =>
          Alert.alert("Engellensin mi?", "Birbirinizin anlarını göremez ve mesajlaşamazsınız.", [
            { text: "Vazgeç", style: "cancel" },
            {
              text: "Engelle",
              style: "destructive",
              onPress: () => blockUser(profile.id).then(() => router.back()).catch((e) => Alert.alert("Olmadı", e.message)),
            },
          ]),
      },
      { text: "Vazgeç", style: "cancel" },
    ]);
  }

  const located = profile?.moments.filter((m) => m.lat !== null && m.lng !== null) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: profile?.displayName ?? "",
          headerRight: () =>
            profile && !profile.isMe ? (
              <Pressable onPress={openMenu} hitSlop={12}>
                <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
              </Pressable>
            ) : null,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {error && <Muted>Yüklenemedi: {error}</Muted>}
        {profile && (
          <>
            <CosmeticFrame look={profile.frame ? FRAMES[profile.frame] : null} radius={22} width={3}>
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <View style={styles.nameLine}>
                  <Text style={[styles.name, { color: colors.text }]}>{profile.displayName}</Text>
                  {profile.badge && (
                    <View style={[styles.badge, { backgroundColor: colors.buttonBackground }]}>
                      <Ionicons name={profile.badge.icon as IconName} size={13} color={colors.buttonText} />
                      <Text style={{ color: colors.buttonText, fontSize: 12, fontWeight: "600" }}>{profile.badge.name}</Text>
                    </View>
                  )}
                </View>
                {profile.bio ? <Text style={{ color: colors.text }}>{profile.bio}</Text> : null}
                <Text style={{ color: colors.muted }}>
                  {profile.stats.moments} an · {profile.stats.cities} şehir · {profile.stats.countries} ülke ·{" "}
                  {profile.stats.achievements} rozet
                </Text>
              </View>
            </CosmeticFrame>

            {!profile.isMe &&
              (profile.connected ? (
                <Pressable
                  onPress={() =>
                    router.push({ pathname: "/chat/[id]", params: { id: String(profile.id), name: profile.displayName } })
                  }
                  style={({ pressed }) => [styles.button, { backgroundColor: colors.buttonBackground }, pressed && { opacity: 0.7 }]}
                >
                  <Text style={{ color: colors.buttonText, fontWeight: "600", fontSize: 16 }}>Mesaj gönder</Text>
                </Pressable>
              ) : (
                <Muted>Aynı kapsülde birbirinizin anına ✦ verdiğinizde paralel bağlantı kurulur ve mesajlaşabilirsiniz.</Muted>
              ))}

            {located.length > 0 && (
              <>
                <Text style={[styles.section, { color: colors.text }]}>Anların geçtiği yerler</Text>
                <View style={styles.map}>
                  <CapsuleMap contributions={located} onSelect={(i) => setViewerIndex(profile.moments.indexOf(located[i]))} />
                </View>
              </>
            )}

            <Text style={[styles.section, { color: colors.text }]}>Anlar</Text>
            <MomentsGrid
              moments={profile.moments.map((m) => ({ ...m, revealed: true, hidden: false, reactionCount: 0 }))}
              onOpen={setViewerIndex}
            />
          </>
        )}
      </ScrollView>

      <PhotoViewer
        photos={(profile?.moments ?? []).map((m) => ({ ...m, mine: true, caption: `${m.prompt} · ${formatDate(m.opensAt)}` }))}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  card: { padding: 20, borderRadius: 20, gap: 6 },
  nameLine: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  name: { fontSize: 22, fontWeight: "600" },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  button: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  section: { marginTop: 12, fontSize: 18, fontWeight: "600" },
  map: { height: 220, borderRadius: 20, overflow: "hidden" },
});
