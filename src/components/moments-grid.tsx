import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import type { MyMoment } from "@/api/capsules";
import { formatDate } from "@/utils/format";

type Props = {
  moments: MyMoment[];
  onOpen: (index: number) => void;
};

// Kişisel arşiv: kullanıcının kendi katkıları, en yeniden eskiye.
export function MomentsGrid({ moments, onOpen }: Props) {
  const colors = useColors();

  return (
    <View style={styles.grid}>
      {moments.map((m, index) => (
        <Pressable key={m.id} onPress={() => onOpen(index)} style={styles.tile}>
          <Image source={{ uri: m.photoUrl }} style={[styles.image, m.hidden && { opacity: 0.35 }]} />
          <View style={styles.overlay}>
            <Text style={styles.date}>{formatDate(m.opensAt)}</Text>
            {!m.revealed ? (
              <Text style={styles.tag}>açılmadı</Text>
            ) : m.reactionCount > 0 ? (
              <Text style={styles.tag}>✦ {m.reactionCount}</Text>
            ) : null}
          </View>
        </Pressable>
      ))}
      {moments.length === 0 && (
        <Text style={{ color: colors.muted }}>Katıldığın kapsüller burada bir albüm gibi birikecek.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tile: { width: "32%", aspectRatio: 1 },
  image: { width: "100%", height: "100%", borderRadius: 12 },
  overlay: {
    position: "absolute",
    left: 6,
    right: 6,
    bottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  date: { color: "#fff", fontSize: 11, fontWeight: "600", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 3 },
  tag: { color: "#fff", fontSize: 11, fontWeight: "600", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 3 },
});
