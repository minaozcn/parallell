import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { Muted } from "@/components/screen";
import { PhotoViewer, ViewerPhoto } from "@/components/photo-viewer";
import { CapsuleMap } from "@/components/capsule-map";
import { Gallery, ReportReason, fetchGallery, reactToContribution, reportContribution } from "@/api/capsules";
import { BORDER_COLORS } from "@/constants/cosmetics";
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

  const load = useCallback(() => {
    fetchGallery(Number(id)).then(setGallery).catch((e) => setError(e.message));
  }, [id]);

  useEffect(load, [load]);

  // Tepki: ekranı hemen güncelle (iyimser), sunucu hata verirse geri al
  async function react(photo: ViewerPhoto) {
    const flip = (reacted: boolean) =>
      setGallery((g) =>
        g ? { ...g, contributions: g.contributions.map((c) => (c.id === photo.id ? { ...c, reacted } : c)) } : g,
      );
    flip(!photo.reacted);
    try {
      const { reacted, newConnection } = await reactToContribution(photo.id);
      flip(reacted);
      if (newConnection) {
        Alert.alert(
          "Paralel bağlantı ✦",
          `${newConnection.displayName} ile aynı anda birbirinizin anını gördünüz. Artık mesajlaşabilirsiniz.`,
          [
            { text: "Sonra", style: "cancel" },
            {
              text: "Mesaj gönder",
              onPress: () => {
                setViewerIndex(null);
                router.push({ pathname: "/chat/[id]", params: { id: String(newConnection.userId), name: newConnection.displayName } });
              },
            },
          ],
        );
      }
    } catch (e) {
      flip(Boolean(photo.reacted));
      Alert.alert("Olmadı", (e as Error).message);
    }
  }

  function report(photo: ViewerPhoto) {
    const send = async (reason: ReportReason) => {
      try {
        const { hidden } = await reportContribution(photo.id, reason);
        Alert.alert("Teşekkürler", "Bildirimin alındı. Topluluğu güvenli tuttuğun için teşekkürler.");
        if (hidden) {
          setViewerIndex(null);
          load(); // fotoğraf gizlendi: galeriyi tazele
        }
      } catch (e) {
        Alert.alert("Bildirilemedi", (e as Error).message);
      }
    };
    Alert.alert("Fotoğrafı bildir", "Neden bildiriyorsun?", [
      { text: "Uygunsuz içerik", onPress: () => send("inappropriate") },
      { text: "Spam / alakasız", onPress: () => send("spam") },
      { text: "Diğer", onPress: () => send("other") },
      { text: "Vazgeç", style: "cancel" },
    ]);
  }

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
            // Açılış animasyonu: fotoğraflar sırayla, aşağıdan yumuşakça belirir
            <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * 80).duration(450)}>
              <Pressable onPress={() => setViewerIndex(index)} style={{ width: size, gap: 4 }}>
                <Image
                  source={{ uri: item.photoUrl }}
                  style={[
                    { width: size, height: size, borderRadius: 14 },
                    item.borderStyle && BORDER_COLORS[item.borderStyle]
                      ? { borderWidth: 3, borderColor: BORDER_COLORS[item.borderStyle] }
                      : null,
                  ]}
                />
                {item.city || item.country ? (
                  <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>
                    {formatPlace(item.city, item.country)}
                  </Text>
                ) : null}
              </Pressable>
            </Animated.View>
          )}
        />
      )}

      <PhotoViewer
        photos={contributions.map((c) => ({ ...c, ownerName: c.displayName }))}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onReport={report}
        onReact={react}
        onOpenOwner={(photo) => {
          const owner = contributions.find((c) => c.id === photo.id);
          if (!owner) return;
          setViewerIndex(null);
          router.push({ pathname: "/user/[id]", params: { id: String(owner.userId) } });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: PADDING, paddingTop: 12, gap: 10 },
  toggles: { flexDirection: "row", borderRadius: 12, padding: 3, alignSelf: "flex-start" },
  toggle: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 10 },
  content: { padding: PADDING, gap: GAP },
});
