import { useEffect, useState } from "react";
import { FlatList, Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { Muted } from "@/components/screen";
import { Gallery, fetchGallery } from "@/api/capsules";
import { formatDate } from "@/utils/format";

const PADDING = 20;
const GAP = 8;

export default function CapsuleGallery() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const size = (width - PADDING * 2 - GAP) / 2;

  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGallery(Number(id)).then(setGallery).catch((e) => setError(e.message));
  }, [id]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: gallery?.capsule.prompt ?? "" }} />
      <FlatList
        contentContainerStyle={styles.content}
        columnWrapperStyle={{ gap: GAP }}
        numColumns={2}
        data={gallery?.contributions ?? []}
        keyExtractor={(c) => String(c.id)}
        ListHeaderComponent={
          gallery && (
            <Text style={{ color: colors.muted, marginBottom: 8 }}>
              {formatDate(gallery.capsule.opensAt)} · {gallery.contributions.length} farklı yerden aynı an
            </Text>
          )
        }
        ListEmptyComponent={
          <Muted>{error ? `Yüklenemedi: ${error}` : gallery ? "Bu kapsüle kimse katılmadı." : "Yükleniyor..."}</Muted>
        }
        renderItem={({ item }) => (
          <Image source={{ uri: item.photoUrl }} style={{ width: size, height: size, borderRadius: 14 }} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: PADDING, gap: GAP },
});
