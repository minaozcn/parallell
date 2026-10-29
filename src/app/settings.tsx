import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { fetchCurrentCapsule } from "@/api/capsules";
import { NotificationPrefs, ensurePermission, getPrefs, savePrefs, syncCapsuleNotifications } from "@/utils/notifications";

export default function Settings() {
  const colors = useColors();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  useEffect(() => {
    getPrefs().then(setPrefs);
  }, []);

  async function update(change: Partial<NotificationPrefs>) {
    if (!prefs) return;
    if (Object.values(change).some(Boolean) && !(await ensurePermission())) {
      Alert.alert("Bildirim izni kapalı", "Telefonunun Ayarlar > Bildirimler bölümünden izin verebilirsin.");
      return;
    }
    const next = { ...prefs, ...change, asked: true };
    setPrefs(next);
    await savePrefs(next);
    const capsule = await fetchCurrentCapsule().catch(() => null);
    if (capsule) {
      syncCapsuleNotifications({ prompt: capsule.prompt, opensAt: capsule.opensAt, joined: Boolean(capsule.myContribution) });
    }
  }

  const row = (label: string, hint: string, value: boolean, onChange: (v: boolean) => void) => (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.rowHint, { color: colors.muted }]}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Ayarlar" }} />

      <Text style={[styles.group, { color: colors.muted }]}>BİLDİRİMLER</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {prefs && (
          <>
            {row("Kapsül açılınca", "Fotoğraflar görünür olduğunda haber ver", prefs.reveal, (v) => update({ reveal: v }))}
            <View style={[styles.divider, { backgroundColor: colors.background }]} />
            {row("Son 1 saat hatırlatması", "Sadece henüz katılmadıysan", prefs.reminder, (v) => update({ reminder: v }))}
          </>
        )}
      </View>

      <Text style={[styles.group, { color: colors.muted }]}>HESAP</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.rowHint, { color: colors.muted, padding: 16 }]}>
          Hesabın bu cihaza bağlı anonim bir kimlik. Uygulamayı silersen puanların, rozetlerin ve sohbetlerin kaybolur.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 8 },
  group: { fontSize: 12, fontWeight: "600", letterSpacing: 0.8, marginTop: 16, marginLeft: 4 },
  card: { borderRadius: 16, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontWeight: "500" },
  rowHint: { fontSize: 13, lineHeight: 18 },
  divider: { height: 1, marginLeft: 16 },
});
