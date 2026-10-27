import { useEffect, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { Muted } from "@/components/screen";
import { PhotoViewer } from "@/components/photo-viewer";
import { CapsuleMap } from "@/components/capsule-map";
import { Gallery, fetchGallery } from "@/api/capsules";
import { formatDate } from "@/utils/format";
import { formatPlace } from "@/utils/location";

const PADDING = 20;
const GAP = 8;

export default function CapsuleGallery() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const size = (width - PADDING * 2 - GAP) / 2;

  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [mode, setMode] = useState<"grid" | "map">("grid");

  useEffect(() => {
    fetchGallery(Number(id)).then(setGallery).catch((e) => setError(e.message));
  }, [id]);

  const contributions = gallery?.contributions ?? [];
  const places = new Set(contributions.map((c) => formatPlace(c.city, c.country)).filter(Boolean)).size;

  const toggle = (value: "grid" | "map", label: string) => (
    <Pressable
      onPress={() => setMode(value)}
      style={[styles.toggle, mode === value && { backgroundColor: colors.buttonBackground }]}
    >
      <Text style={{ color: mode === value ? colors.buttonText : colors.muted, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: gallery?.capsule.prompt ?? "" }} />

      <View style={styles.top}>
        {gallery && (
          <Text style={{ color: colors.muted }}>
            {formatDate(gallery.capsule.opensAt)} · {contributions.length} fotoğraf
            {places > 0 ? ` · ${places} farklı yer` : ""}
          </Text>
        )}
        <View style={[styles.toggles, { backgroundColor: colors.card }]}>
          {toggle("grid", "Izgara")}
          {toggle("map", "Harita")}
        </View>
      </View>

      {mode === "map" && contributions.length > 0 ? (
        <View style={{ flex: 1 }}>
          <CapsuleMap contributions={contributions} onSelect={setViewerIndex} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.content}
          columnWrapperStyle={{ gap: GAP }}
          numColumns={2}
          data={contributions}
          keyExtractor={(c) => String(c.id)}
          ListEmptyComponent={
            <Muted>{error ? `Yüklenemedi: ${error}` : gallery ? "Bu kapsüle kimse katılmadı." : "Yükleniyor..."}</Muted>
          }
          renderItem={({ item, index }) => (
            <Pressable onPress={() => setViewerIndex(index)} style={{ width: size, gap: 4 }}>
              <Image source={{ uri: item.photoUrl }} style={{ width: size, height: size, borderRadius: 14 }} />
              {item.city || item.country ? (
                <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>
                  {formatPlace(item.city, item.country)}
                </Text>
              ) : null}
            </Pressable>
          )}
        />
      )}

      <PhotoViewer photos={contributions} index={viewerIndex} onClose={() => setViewerIndex(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: PADDING, paddingTop: 12, gap: 10 },
  toggles: { flexDirection: "row", borderRadius: 12, padding: 3, alignSelf: "flex-start" },
  toggle: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 10 },
  content: { padding: PADDING, gap: GAP },
});
