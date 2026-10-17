import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { Screen, Muted } from "@/components/screen";
import { Me, fetchMe } from "@/api/account";

export default function Profile() {
  const colors = useColors();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchMe()
        .then((m) => { setMe(m); setError(null); })
        .catch((e) => setError(e.message));
    }, []),
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        {error && <Muted>Yüklenemedi: {error}</Muted>}
        {me && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.name, { color: colors.text }]}>{me.displayName}</Text>
              <Text style={{ color: colors.muted }}>✦ {me.points} puan</Text>
            </View>

            <Text style={[styles.section, { color: colors.text }]}>Eşyaların</Text>
            {me.items.length === 0 ? (
              <Muted>Henüz bir eşyan yok. Rewards sekmesinden puanlarınla alabilirsin.</Muted>
            ) : (
              me.items.map((i) => (
                <Text key={i.id} style={{ color: colors.text }}>• {i.name}</Text>
              ))
            )}

            <Muted>Hesabın bu cihaza bağlı anonim bir kimlik. Uygulamayı silersen puanların kaybolur.</Muted>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 10 },
  title: { marginTop: 16, fontSize: 24, fontWeight: "600" },
  card: { padding: 20, borderRadius: 20, gap: 4 },
  name: { fontSize: 20, fontWeight: "600" },
  section: { marginTop: 20, fontSize: 18, fontWeight: "600" },
});
