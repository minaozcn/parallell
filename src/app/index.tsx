import { Text, View, StyleSheet, Image, Pressable } from "react-native";
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

  return (
    <SafeAreaView style={styles.container}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
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
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
