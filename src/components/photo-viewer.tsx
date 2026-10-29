import { FlatList, Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Contribution } from "@/api/capsules";
import { formatPlace } from "@/utils/location";

export type ViewerPhoto = Pick<Contribution, "id" | "photoUrl" | "city" | "country"> & {
  mine?: boolean;
  reacted?: boolean;
  caption?: string; // ek açıklama (ör. kişisel arşivde "3 kişi bu anını gördü")
  ownerName?: string;
};

type Props = {
  photos: ViewerPhoto[];
  index: number | null; // null = kapalı
  onClose: () => void;
  onReport?: (photo: ViewerPhoto) => void;
  onReact?: (photo: ViewerPhoto) => void;
  onOpenOwner?: (photo: ViewerPhoto) => void;
};

// Tam ekran fotoğraf görüntüleyici: yana kaydırarak fotoğraflar arasında gezilir.
export function PhotoViewer({ photos, index, onClose, onReport, onReact, onOpenOwner }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={index !== null} animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        {index !== null && (
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(p) => String(p.id)}
            renderItem={({ item }) => (
              <View style={{ width, height }}>
                <Image source={{ uri: item.photoUrl }} style={{ width, height }} resizeMode="contain" />

                {!item.mine && onReport && (
                  <Pressable onPress={() => onReport(item)} hitSlop={12} style={[styles.report, { top: insets.top + 12 }]}>
                    <Text style={styles.reportText}>Bildir</Text>
                  </Pressable>
                )}

                <View style={[styles.bottom, { bottom: insets.bottom + 20 }]}>
                  <View style={styles.texts}>
                    {item.ownerName && !item.mine ? (
                      <Pressable onPress={() => onOpenOwner?.(item)} disabled={!onOpenOwner} hitSlop={8}>
                        <Text style={styles.owner}>{item.ownerName} ›</Text>
                      </Pressable>
                    ) : null}
                    {item.city || item.country ? (
                      <Text style={styles.place}>{formatPlace(item.city, item.country)}</Text>
                    ) : null}
                    {item.caption ? <Text style={styles.caption}>{item.caption}</Text> : null}
                  </View>
                  {!item.mine && onReact && (
                    <Pressable
                      onPress={() => onReact(item)}
                      hitSlop={12}
                      style={[styles.react, item.reacted && styles.reacted]}
                      accessibilityLabel={item.reacted ? "Tepkiyi geri al" : "Bu anı gördüm"}
                    >
                      <Text style={[styles.reactText, item.reacted && { color: "#3D3530" }]}>✦</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          />
        )}
        <Pressable onPress={onClose} hitSlop={16} style={[styles.close, { top: insets.top + 8 }]}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  close: { position: "absolute", right: 20 },
  closeText: { color: "#fff", fontSize: 24 },
  report: { position: "absolute", left: 20 },
  reportText: { color: "#fff", fontSize: 15, opacity: 0.8 },
  bottom: { position: "absolute", left: 20, right: 20, flexDirection: "row", alignItems: "center" },
  texts: { flex: 1, gap: 2 },
  owner: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 2 },
  place: { color: "#fff", fontSize: 16, fontWeight: "500" },
  caption: { color: "#fff", fontSize: 14, opacity: 0.8 },
  react: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  reacted: { backgroundColor: "#F8E8D8", borderColor: "#F8E8D8" },
  reactText: { color: "#fff", fontSize: 20 },
});
