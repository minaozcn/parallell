import { Text, View, StyleSheet, Image } from "react-native";
import { useColors } from "@/hooks/use-colors";

type Props = {
  prompt: string;
  date: string;
  imageUrl: string;
};

export function PastCapsuleCard({ prompt, date, imageUrl }: Props) {
  const colors = useColors();

  return (
    <View style={styles.card}>
      <Image source={{ uri: imageUrl }} style={styles.image} />
      <Text style={[styles.prompt, { color: colors.text }]} numberOfLines={1}>{prompt}</Text>
      <Text style={[styles.date, { color: colors.muted }]}>{date}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    gap: 4,
  },
  image: {
    width: 140,
    height: 140,
    borderRadius: 16,
  },
  prompt: {
    fontSize: 14,
    fontWeight: "500",
  },
  date: {
    fontSize: 14,
  },
});
