import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { Muted } from "@/components/screen";
import { CapsuleMap } from "@/components/capsule-map";
import { MomentsGrid } from "@/components/moments-grid";
import { PhotoViewer } from "@/components/photo-viewer";
import { ProfileHeader } from "@/components/profile-header";
import { Button } from "@/components/button";
import { Profile, UserReportReason, blockUser, fetchProfile, reportUser } from "@/api/social";
import { formatDate } from "@/utils/format";

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
            <ProfileHeader
              displayName={profile.displayName}
              bio={profile.bio}
              badge={profile.badge}
              frame={profile.frame}
              stats={[
                { value: profile.stats.moments, label: "an" },
                { value: profile.stats.cities, label: "şehir" },
                { value: profile.stats.countries, label: "ülke" },
                { value: profile.stats.achievements, label: "rozet" },
              ]}
            >
              {!profile.isMe &&
                (profile.connected ? (
                  <Button
                    label="Mesaj gönder"
                    onPress={() =>
                      router.push({ pathname: "/chat/[id]", params: { id: String(profile.id), name: profile.displayName } })
                    }
                    style={styles.fullWidth}
                  />
                ) : (
                  <View style={[styles.hint, { backgroundColor: colors.card }]}>
                    <Text style={{ color: colors.muted, textAlign: "center", fontSize: 13, lineHeight: 18 }}>
                      Aynı kapsülde birbirinizin anına ✦ verdiğinizde paralel bağlantı kurulur ve mesajlaşabilirsiniz.
                    </Text>
                  </View>
                ))}
            </ProfileHeader>

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
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  fullWidth: { alignSelf: "stretch" },
  hint: { alignSelf: "stretch", padding: 14, borderRadius: 14 },
  section: { marginTop: 10, fontSize: 17, fontWeight: "600" },
  map: { height: 220, borderRadius: 20, overflow: "hidden" },
});
