import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { CosmeticFrame } from "@/components/cosmetic-frame";
import { FRAMES } from "@/constants/cosmetics";
import type { Achievement } from "@/api/account";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type Props = {
  displayName: string;
  bio: string | null;
  badge: Achievement | null;
  frame: string | null; // profil çerçevesi: avatarın etrafında halka olarak çizilir
  stats: { value: number | string; label: string }[];
  children?: ReactNode; // butonlar
};

export const AVATAR_SIZE = 88;

// Kendi profilin ve başkalarının profilleri aynı başlığı kullanır: tutarlı görünüm.
export function ProfileHeader({ displayName, bio, badge, frame, stats, children }: Props) {
  const colors = useColors();
  const look = frame ? FRAMES[frame] : null;

  return (
    <View style={styles.container}>
      <CosmeticFrame look={look} radius={AVATAR_SIZE} width={3}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: colors.buttonBackground, borderColor: colors.background, borderWidth: look ? 3 : 0 },
          ]}
        >
          <Text style={[styles.initial, { color: colors.buttonText }]}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
      </CosmeticFrame>

      <View style={styles.nameBlock}>
        <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
        {badge && (
          <View style={[styles.badge, { backgroundColor: colors.card }]}>
            <Ionicons name={badge.icon as IconName} size={13} color={colors.text} />
            <Text style={[styles.badgeText, { color: colors.text }]}>{badge.name}</Text>
          </View>
        )}
        {bio ? <Text style={[styles.bio, { color: colors.muted }]}>{bio}</Text> : null}
      </View>

      <View style={[styles.stats, { backgroundColor: colors.card }]}>
        {stats.map((s, i) => (
          <View key={s.label} style={[styles.stat, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.background }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 14 },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, alignItems: "center", justifyContent: "center" },
  initial: { fontSize: 34, fontWeight: "600" },
  nameBlock: { alignItems: "center", gap: 6 },
  name: { fontSize: 22, fontWeight: "700" },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  bio: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 16 },
  stats: { flexDirection: "row", alignSelf: "stretch", borderRadius: 16, paddingVertical: 12 },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 12 },
});
