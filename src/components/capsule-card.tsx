import { ActivityIndicator, Text, View, StyleSheet, Image, Pressable } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useNow } from "@/hooks/use-now";
import { formatCountdown } from "@/utils/format";

export type ContributionStatus = "idle" | "uploading" | "failed" | "submitted";

type Props = {
  prompt: string;
  participantCount: number;
  opensAt: string; // "20:00" gibi gösterim
  opensAtIso: string; // geri sayım için
  imageUrl: string;
  myPhotoUrl: string | null;
  status: ContributionStatus;
  error: string | null;
  onJoin: () => void;
  onRetry: () => void;
  onDelete: () => void;
  onOpenGallery: () => void;
};

export function CapsuleCard(p: Props) {
  const colors = useColors();
  const remaining = new Date(p.opensAtIso).getTime() - useNow();
  const revealed = remaining <= 0;

  const primary = (label: string, onPress: () => void) => (
    <Pressable
      style={({ pressed }) => [styles.button, { backgroundColor: colors.buttonBackground }, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Text style={[styles.buttonText, { color: colors.buttonText }]}>{label}</Text>
    </Pressable>
  );

  const secondary = (label: string, onPress: () => void) => (
    <Pressable
      style={({ pressed }) => [styles.button, { borderColor: colors.muted, borderWidth: 1 }, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Text style={[styles.buttonText, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Image source={{ uri: p.myPhotoUrl ?? p.imageUrl }} style={styles.image} />
      <View style={styles.body}>
        <Text style={[styles.prompt, { color: colors.text }]}>{p.prompt}</Text>
        <Text style={[styles.meta, { color: colors.muted }]}>
          {p.participantCount} katılımcı · {revealed ? "açıldı" : `${p.opensAt}'de açılır`}
        </Text>
        {!revealed && (
          <Text style={[styles.countdown, { color: colors.text }]}>{formatCountdown(remaining)} sonra açılıyor</Text>
        )}

        {revealed && primary("Kapsül açıldı · Galeriyi gör", p.onOpenGallery)}

        {!revealed && p.status === "idle" && primary("Katıl", p.onJoin)}

        {!revealed && p.status === "uploading" && (
          <View style={styles.row}>
            <ActivityIndicator color={colors.text} />
            <Text style={[styles.meta, { color: colors.text }]}>Gönderiliyor...</Text>
          </View>
        )}

        {!revealed && p.status === "failed" && (
          <>
            <Text style={[styles.status, { color: colors.text }]}>Gönderilemedi: {p.error}</Text>
            {primary("Tekrar dene", p.onRetry)}
            {secondary("Başka fotoğraf seç", p.onJoin)}
          </>
        )}

        {!revealed && p.status === "submitted" && (
          <>
            <Text style={[styles.status, { color: colors.text }]}>
              ✓ Katkın gönderildi. {p.opensAt}'de diğerleriyle birlikte açılacak.
            </Text>
            {secondary("Katkımı sil", p.onDelete)}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, borderRadius: 20, overflow: "hidden" },
  image: { width: "100%", height: 220 },
  body: { padding: 16, gap: 8 },
  prompt: { fontSize: 22, fontWeight: "600" },
  meta: { fontSize: 14 },
  countdown: { fontSize: 15, fontWeight: "500", fontVariant: ["tabular-nums"] },
  status: { marginTop: 8, fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  button: { marginTop: 8, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  pressed: { opacity: 0.7 },
  buttonText: { fontSize: 16, fontWeight: "600" },
});
