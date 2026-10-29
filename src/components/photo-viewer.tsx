import { FlatList, Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Contribution } from "@/api/capsules";
import { formatPlace } from "@/utils/location";

type Props = {
  photos: Contribution[];
  index: number | null; // null = kapalı
  onClose: () => void;
  onReport: (photo: Contribution) => void;
};

// Tam ekran fotoğraf görüntüleyici: yana kaydırarak fotoğraflar arasında gezilir.
export function PhotoViewer({ photos, index, onClose, onReport }: Props) {
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
                {!item.mine && (
                  <Pressable onPress={() => onReport(item)} hitSlop={12} style={[styles.report, { top: insets.top + 12 }]}>
                    <Text style={styles.reportText}>Bildir</Text>
                  </Pressable>
                )}
                {item.city || item.country ? (
                  <Text style={[styles.place, { bottom: insets.bottom + 24 }]}>{formatPlace(item.city, item.country)}</Text>
                ) : null}
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
  place: { position: "absolute", alignSelf: "center", color: "#fff", fontSize: 16, fontWeight: "500" },
});
