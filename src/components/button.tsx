import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { useColors } from "@/hooks/use-colors";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Uygulama genelinde tek tip buton: dolu (primary) ve çerçeveli (secondary)
export function Button({ label, onPress, variant = "primary", disabled, style }: Props) {
  const colors = useColors();
  const primary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        primary ? { backgroundColor: colors.buttonBackground } : { backgroundColor: colors.card },
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.7 },
        style,
      ]}
    >
      <Text style={[styles.label, { color: primary ? colors.buttonText : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 15, fontWeight: "600" },
});
