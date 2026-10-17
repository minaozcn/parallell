import { ActivityIndicator, Text, View, StyleSheet, Image, Pressable } from "react-native";
import { useColors } from "@/hooks/use-colors";

export type ContributionStatus = "idle" | "uploading" | "failed" | "submitted";

type Props = {
  prompt: string;
  participantCount: number;
  opensAt: string;
  imageUrl: string;
  myPhotoUrl: string | null;
  status: ContributionStatus;
  error: string | null;
  onJoin: () => void;
  onRetry: () => void;
  onDelete: () => void;
};

export function CapsuleCard(p: Props) {
  const colors = useColors();

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
          {p.participantCount} katılımcı · {p.opensAt}'de açılır
        </Text>

        {p.status === "idle" && primary("Katıl", p.onJoin)}

        {p.status === "uploading" && (
          <View style={styles.row}>
            <ActivityIndicator color={colors.text} />
            <Text style={[styles.meta, { color: colors.text }]}>Gönderiliyor...</Text>
          </View>
        )}

        {p.status === "failed" && (
          <>
            <Text style={[styles.status, { color: colors.text }]}>Gönderilemedi: {p.error}</Text>
            {primary("Tekrar dene", p.onRetry)}
            {secondary("Başka fotoğraf seç", p.onJoin)}
          </>
        )}

        {p.status === "submitted" && (
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
  status: { marginTop: 8, fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  button: { marginTop: 8, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  pressed: { opacity: 0.7 },
  buttonText: { fontSize: 16, fontWeight: "600" },
});
