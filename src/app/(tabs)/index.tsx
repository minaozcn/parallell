import { useCallback, useState } from "react";
import { Alert, Text, View, StyleSheet, Image, ScrollView, useColorScheme } from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useColors } from "@/hooks/use-colors";
import { Screen, Muted } from "@/components/screen";
import { CapsuleCard, ContributionStatus } from "@/components/capsule-card";
import { PastCapsuleCard } from "@/components/past-capsule-card";
import { CurrentCapsule, RevealedCapsule, fetchCurrentCapsule, fetchRevealedCapsules, submitContribution, deleteContribution } from "@/api/capsules";
import { fetchMe } from "@/api/account";
import { formatDate, formatTime } from "@/utils/format";

export default function Home() {
  const scheme = useColorScheme();
  const colors = useColors();
  const logo =
    scheme === "dark"
      ? require("../../../assets/images/logo-dark.png")
      : require("../../../assets/images/logo-light.png");

  const [capsule, setCapsule] = useState<CurrentCapsule | null>(null);
  const [revealed, setRevealed] = useState<RevealedCapsule[]>([]);
  const [points, setPoints] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Yükleme durumu: seçilen ama henüz sunucuya ulaşmamış fotoğraf
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [current, past, me] = await Promise.all([fetchCurrentCapsule(), fetchRevealedCapsules(), fetchMe()]);
      setCapsule(current);
      setRevealed(past);
      setPoints(me.points);
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, []);

  // Ekran her öne geldiğinde (ör. Rewards'tan dönünce) verileri tazele
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function upload(uri: string) {
    if (!capsule) return;
    setUploading(true);
    setUploadError(null);
    try {
      await submitContribution(capsule.id, uri);
      setPendingUri(null); // başarı: artık sunucudaki fotoğrafı göstereceğiz
      await load();
    } catch (e) {
      setUploadError((e as Error).message); // hata asla başarı sayılmaz; fotoğraf tekrar denemek için saklanır
    } finally {
      setUploading(false);
    }
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled) return;
    setPendingUri(result.assets[0].uri);
    upload(result.assets[0].uri);
  }

  function confirmDelete() {
    const contribution = capsule?.myContribution;
    if (!contribution) return;
    Alert.alert("Katkını sil", "Kazandığın puanlar da geri alınacak. Kapsül açılana kadar yeniden katılabilirsin.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteContribution(contribution.id);
            await load();
          } catch (e) {
            Alert.alert("Silinemedi", (e as Error).message);
          }
        },
      },
    ]);
  }

  let status: ContributionStatus = "idle";
  if (uploading) status = "uploading";
  else if (uploadError) status = "failed";
  else if (capsule?.myContribution) status = "submitted";

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.points, { color: colors.text }]}>✦ {points ?? "—"}</Text>
        </View>

        {loadError && !capsule ? (
          <Muted>Yüklenemedi: {loadError}</Muted>
        ) : !capsule ? (
          <Muted>Yükleniyor...</Muted>
        ) : (
          <CapsuleCard
            prompt={capsule.prompt}
            participantCount={capsule.participantCount}
            opensAt={formatTime(capsule.opensAt)}
            imageUrl={capsule.imageUrl}
            myPhotoUrl={pendingUri ?? capsule.myContribution?.photoUrl ?? null}
            status={status}
            error={uploadError}
            onJoin={pickPhoto}
            onRetry={() => pendingUri && upload(pendingUri)}
            onDelete={confirmDelete}
          />
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Geçmiş kapsüller</Text>
        {revealed.length === 0 ? (
          <Muted>Henüz açılmış bir kapsül yok. İlk kapsül açıldığında burada görünecek.</Muted>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pastList}>
            {revealed.slice(0, 10).map((c) => (
              <PastCapsuleCard
                key={c.id}
                prompt={c.prompt}
                date={formatDate(c.opensAt)}
                imageUrl={c.coverUrl}
                onPress={() => router.push({ pathname: "/capsule/[id]", params: { id: String(c.id) } })}
              />
            ))}
          </ScrollView>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  logo: { width: 120, height: 62 },
  points: { fontSize: 16 },
  sectionTitle: { marginTop: 32, marginBottom: 12, fontSize: 18, fontWeight: "600" },
  pastList: { gap: 12 },
});
