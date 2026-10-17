import { Text, View, StyleSheet, Image, ScrollView, useColorScheme } from "react-native";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import { CapsuleCard } from "@/components/capsule-card";
import { PastCapsuleCard } from "@/components/past-capsule-card";

export default function Index() {
  const scheme = useColorScheme();
  const colors = useColors();
  // Kullanıcının seçtiği fotoğrafın telefondaki adresi. null = henüz katılmadı
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  }
  const logo =
    scheme === "dark"
      ? require("../../assets/images/logo-dark.png")
      : require("../../assets/images/logo-light.png");

  // Geçici değerler: ileride backend'den gelecek
  const points = 120;
  const capsule = {
    prompt: "Show us your sky.",
    participantCount: 34,
    opensAt: "20:00",
    imageUrl: "https://picsum.photos/600/400",
  };
  const pastCapsules = [
    { id: 1, prompt: "Your window view.", date: "16 Eki", status: "revealed", imageUrl: "https://picsum.photos/seed/a/300/300" },
    { id: 2, prompt: "Something blue.", date: "15 Eki", status: "revealed", imageUrl: "https://picsum.photos/seed/b/300/300" },
    { id: 3, prompt: "Your shoes today.", date: "14 Eki", status: "revealed", imageUrl: "https://picsum.photos/seed/c/300/300" },
    { id: 4, prompt: "Show us your sky.", date: "17 Eki", status: "open", imageUrl: "https://picsum.photos/seed/d/300/300" },
  ];
  const revealedCapsules = pastCapsules.filter((c) => c.status === "revealed");

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.points, { color: colors.text }]}>✦ {points}</Text>
        </View>

        <CapsuleCard
          prompt={capsule.prompt}
          participantCount={capsule.participantCount}
          opensAt={capsule.opensAt}
          imageUrl={capsule.imageUrl}
          myPhotoUri={photoUri}
          onJoin={pickPhoto}
          onDelete={() => setPhotoUri(null)}
        />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Geçmiş kapsüller</Text>
        {revealedCapsules.length === 0 ? (
          <Text style={[styles.empty, { color: colors.muted }]}>
            Henüz açılmış bir kapsül yok. İlk kapsül açıldığında burada görünecek.
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pastList}>
            {revealedCapsules.map((c) => (
              <PastCapsuleCard key={c.id} prompt={c.prompt} date={c.date} imageUrl={c.imageUrl} />
            ))}
          </ScrollView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  logo: {
    width: 120,
    height: 62,
  },
  points: {
    fontSize: 16,
  },
  sectionTitle: {
    marginTop: 32,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: "600",
  },
  pastList: {
    gap: 12,
  },
  empty: {
    fontSize: 14,
  },
});
