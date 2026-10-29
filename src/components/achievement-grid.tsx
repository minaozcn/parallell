import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import type { Achievement } from "@/api/account";

type Props = {
  achievements: Achievement[];
  onToggle: (a: Achievement) => void;
};

type IconName = React.ComponentProps<typeof Ionicons>["name"];

// Kazanılan rozetler renkli, kazanılmayanlar soluk ve nasıl kazanılacağı yazılı.
export function AchievementGrid({ achievements, onToggle }: Props) {
  const colors = useColors();

  return (
    <View style={styles.grid}>
      {achievements.map((a) => {
        const earned = Boolean(a.earnedAt);
        return (
          <Pressable
            key={a.key}
            disabled={!earned}
            onPress={() => onToggle(a)}
            style={[
              styles.tile,
              { backgroundColor: colors.card },
              a.equipped && { borderColor: colors.buttonBackground, borderWidth: 2 },
              !earned && { opacity: 0.4 },
            ]}
          >
            <Ionicons name={(earned ? a.icon : "lock-closed-outline") as IconName} size={26} color={colors.text} />
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{a.name}</Text>
            <Text style={[styles.desc, { color: colors.muted }]} numberOfLines={3}>{a.description}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "31%", flexGrow: 1, padding: 12, borderRadius: 16, gap: 4, borderWidth: 2, borderColor: "transparent" },
  name: { fontSize: 13, fontWeight: "600" },
  desc: { fontSize: 11 },
});
