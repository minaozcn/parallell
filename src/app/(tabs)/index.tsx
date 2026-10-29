import { useCallback, useState } from "react";
import { Alert, Text, View, StyleSheet, Image, ScrollView } from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { usePalette } from "@/hooks/app-theme";
import { Screen, Muted } from "@/components/screen";
import { CapsuleCard, ContributionStatus } from "@/components/capsule-card";
import { PastCapsuleCard } from "@/components/past-capsule-card";
import { CurrentCapsule, RevealedCapsule, fetchCurrentCapsule, fetchRevealedCapsules, submitContribution, deleteContribution } from "@/api/capsules";
import { Achievement, fetchMe } from "@/api/account";
import { AchievementCelebration } from "@/components/achievement-celebration";
import { formatDate, formatTime } from "@/utils/format";
import { getApproxLocation } from "@/utils/location";

export default function Home() {
  const { colors, isDark } = usePalette();
  const logo =
    isDark
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

  // Kazanılan rozetler sırayla, her biri ayrı panelde gösterilir
  const [celebrations, setCelebrations] = useState<Achievement[]>([]);
  const [celebrationTotal, setCelebrationTotal] = useState(0);

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
      const location = await getApproxLocation(); // izin yoksa null: konumsuz katılım
      const result = await submitContribution(capsule.id, uri, location);
      if (result.newAchievements.length > 0) {
        setCelebrations(result.newAchievements);
        setCelebrationTotal(result.newAchievements.length);
      }
      setPendingUri(null); // başarı: artık sunucudaki fotoğrafı göstereceğiz
      await load();
    } catch (e) {
      setUploadError((e as Error).message); // hata asla başarı sayılmaz; fotoğraf tekrar denemek için saklanır
    } finally {
      setUploading(false);
    }
  }

  async function pickPhoto(source: "camera" | "library") {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    };
    let result: ImagePicker.ImagePickerResult;
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Kamera izni gerekli", "Fotoğraf çekmek için Ayarlar'dan kamera iznini açabilirsin.");
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }
    if (result.canceled) return;
    setPendingUri(result.assets[0].uri);
    upload(result.assets[0].uri);
  }

  function choosePhotoSource() {
    Alert.alert("Katıl", "Bu anı nasıl paylaşmak istersin?", [
      { text: "Fotoğraf çek", onPress: () => pickPhoto("camera") },
      { text: "Galeriden seç", onPress: () => pickPhoto("library") },
      { text: "Vazgeç", style: "cancel" },
    ]);
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
            opensAtIso={capsule.opensAt}
            imageUrl={capsule.imageUrl}
            myPhotoUrl={pendingUri ?? capsule.myContribution?.photoUrl ?? null}
            status={status}
            error={uploadError}
            onJoin={choosePhotoSource}
            onRetry={() => pendingUri && upload(pendingUri)}
            onDelete={confirmDelete}
            onOpenGallery={() => router.push({ pathname: "/capsule/[id]", params: { id: String(capsule.id) } })}
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

      <AchievementCelebration
        queue={celebrations}
        total={celebrationTotal}
        onNext={() => setCelebrations((q) => q.slice(1))}
      />
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
