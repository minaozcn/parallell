import { Text, View, StyleSheet, Image, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>parallell</Text>
          <Text style={styles.points}>✦ {points}</Text>
        </View>

        <View style={styles.card}>
          <Image source={{ uri: capsule.imageUrl }} style={styles.image} />
          <View style={styles.cardBody}>
            <Text style={styles.prompt}>{capsule.prompt}</Text>
            <Text style={styles.meta}>
              {capsule.participantCount} katılımcı · {capsule.opensAt}'de açılır
            </Text>
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={() => console.log("katıl")}
            >
              <Text style={styles.buttonText}>Katıl</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Geçmiş kapsüller</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pastList}>
          {revealedCapsules.map((c) => (
            <View key={c.id} style={styles.pastCard}>
              <Image source={{ uri: c.imageUrl }} style={styles.pastImage} />
              <Text style={styles.pastPrompt} numberOfLines={1}>{c.prompt}</Text>
              <Text style={styles.meta}>{c.date}</Text>
            </View>
          ))}
        </ScrollView>
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
  wordmark: {
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: 1,
  },
  points: {
    fontSize: 16,
  },
  card: {
    marginTop: 16,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#F2F2F2",
  },
  image: {
    width: "100%",
    height: 220,
  },
  cardBody: {
    padding: 16,
    gap: 8,
  },
  prompt: {
    fontSize: 22,
    fontWeight: "600",
  },
  meta: {
    fontSize: 14,
    color: "#666",
  },
  button: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#111",
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.7,
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
  pastCard: {
    width: 140,
    gap: 4,
  },
  pastImage: {
    width: 140,
    height: 140,
    borderRadius: 16,
  },
  pastPrompt: {
    fontSize: 14,
    fontWeight: "500",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
