import { Text, View, StyleSheet, Image, Pressable } from "react-native";
import { useColors } from "@/hooks/use-colors";

type Props = {
  prompt: string;
  participantCount: number;
  opensAt: string;
  imageUrl: string;
  myPhotoUri: string | null;
  onJoin: () => void;
  onDelete: () => void;
};

export function CapsuleCard({ prompt, participantCount, opensAt, imageUrl, myPhotoUri, onJoin, onDelete }: Props) {
  const colors = useColors();
  const submitted = myPhotoUri !== null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Image source={{ uri: myPhotoUri ?? imageUrl }} style={styles.image} />
      <View style={styles.body}>
        <Text style={[styles.prompt, { color: colors.text }]}>{prompt}</Text>
        <Text style={[styles.meta, { color: colors.muted }]}>
          {participantCount} katılımcı · {opensAt}'de açılır
        </Text>
        {submitted ? (
          <>
            <Text style={[styles.status, { color: colors.text }]}>
              ✓ Katkın gönderildi. {opensAt}'de diğerleriyle birlikte açılacak.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.button, { borderColor: colors.muted, borderWidth: 1 }, pressed && styles.buttonPressed]}
              onPress={onDelete}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Katkımı sil</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.button, { backgroundColor: colors.buttonBackground }, pressed && styles.buttonPressed]}
            onPress={onJoin}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>Katıl</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    borderRadius: 20,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 220,
  },
  body: {
    padding: 16,
    gap: 8,
  },
  prompt: {
    fontSize: 22,
    fontWeight: "600",
  },
  meta: {
    fontSize: 14,
  },
  status: {
    marginTop: 8,
    fontSize: 14,
  },
  button: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
