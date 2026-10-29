import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";

type Props<T extends string> = {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
};

// Alt çizgili sekme seçici (Anlar | Rozetler gibi)
export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.card }]}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={[styles.item, active && { borderBottomColor: colors.text }]}>
            <Text style={[styles.label, { color: active ? colors.text : colors.muted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignSelf: "stretch", borderBottomWidth: 1 },
  item: { flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent", marginBottom: -1 },
  label: { fontSize: 15, fontWeight: "600" },
});
