import { useRef } from "react";
import { Image, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import type { Contribution } from "@/api/capsules";
import { formatPlace } from "@/utils/location";

type Props = {
  contributions: Contribution[];
  onSelect: (index: number) => void;
};

// Açılmış kapsülün fotoğraflarını dünya haritasında küçük yuvarlak resimler olarak gösterir.
export function CapsuleMap({ contributions, onSelect }: Props) {
  const map = useRef<MapView>(null);
  const located = contributions
    .map((c, index) => ({ c, index }))
    .filter(({ c }) => c.lat !== null && c.lng !== null);

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      initialRegion={{ latitude: 30, longitude: 20, latitudeDelta: 120, longitudeDelta: 160 }}
      onMapReady={() => {
        // Tüm fotoğraflar ekrana sığacak şekilde yakınlaş
        if (located.length > 0) {
          map.current?.fitToCoordinates(
            located.map(({ c }) => ({ latitude: c.lat!, longitude: c.lng! })),
            { edgePadding: { top: 80, right: 80, bottom: 80, left: 80 }, animated: false },
          );
        }
      }}
    >
      {located.map(({ c, index }) => (
        <Marker
          key={c.id}
          coordinate={{ latitude: c.lat!, longitude: c.lng! }}
          title={formatPlace(c.city, c.country) || undefined}
          onCalloutPress={() => onSelect(index)}
          onPress={() => onSelect(index)}
        >
          <Image source={{ uri: c.photoUrl }} style={styles.pin} />
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  pin: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: "#fff" },
});
