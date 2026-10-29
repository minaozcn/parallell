import { Modal, Pressable, StyleSheet, Text } from "react-native";
import Animated, { Easing, FadeIn, FadeInUp, ZoomIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import type { Achievement } from "@/api/account";

type Props = {
  queue: Achievement[]; // gösterilecek rozetler; ilki ekranda
  total: number; // bu seferde kazanılan toplam rozet (1 / 3 sayacı için)
  onNext: () => void;
};

type IconName = React.ComponentProps<typeof Ionicons>["name"];

// Rozet kazanınca açılan kutlama paneli. Birden fazla rozet varsa her biri ayrı ayrı gösterilir.
export function AchievementCelebration({ queue, total, onNext }: Props) {
  const colors = useColors();
  const current = queue[0];
  const index = total - queue.length + 1;

  return (
    <Modal visible={Boolean(current)} transparent animationType="none" onRequestClose={onNext}>
      <Animated.View entering={FadeIn.duration(250)} style={styles.backdrop}>
        {current && (
          // key: her yeni rozette panel baştan animasyonla açılsın
          <Animated.View
            key={current.key}
            entering={FadeInUp.duration(320).easing(Easing.out(Easing.cubic))}
            style={[styles.card, { backgroundColor: colors.background }]}
          >
            {/* İkon panelden hemen sonra, tek seferlik ve taşmasız bir büyümeyle gelir */}
            <Animated.View
              entering={ZoomIn.delay(120).duration(380).easing(Easing.out(Easing.cubic))}
              style={[styles.iconCircle, { backgroundColor: colors.buttonBackground }]}
            >
              <Ionicons name={current.icon as IconName} size={56} color={colors.buttonText} />
            </Animated.View>

            <Text style={[styles.congrats, { color: colors.muted }]}>Tebrikler!</Text>
            <Text style={[styles.title, { color: colors.text }]}>
              <Text style={styles.bold}>{current.name}</Text> rozetini kazandın
            </Text>
            <Text style={[styles.desc, { color: colors.muted }]}>{current.description}</Text>

            <Pressable
              onPress={onNext}
              style={({ pressed }) => [styles.button, { backgroundColor: colors.buttonBackground }, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.buttonText, { color: colors.buttonText }]}>
                {queue.length > 1 ? "Sıradaki" : "Harika"}
              </Text>
            </Pressable>

            {total > 1 && <Text style={[styles.counter, { color: colors.muted }]}>{index} / {total}</Text>}
          </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 32 },
  card: { borderRadius: 28, padding: 28, alignItems: "center", gap: 10 },
  iconCircle: { width: 112, height: 112, borderRadius: 56, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  congrats: { fontSize: 15, fontWeight: "500", letterSpacing: 1 },
  title: { fontSize: 22, textAlign: "center" },
  bold: { fontWeight: "700" },
  desc: { fontSize: 14, textAlign: "center" },
  button: { marginTop: 12, alignSelf: "stretch", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  buttonText: { fontSize: 16, fontWeight: "600" },
  counter: { fontSize: 12, marginTop: 2 },
});
