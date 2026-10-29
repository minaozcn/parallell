import { ReactNode, useEffect, useState } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import type { FrameLook } from "@/constants/cosmetics";

type Props = {
  look?: FrameLook | null; // yoksa çerçevesiz
  width?: number; // çerçeve kalınlığı
  radius: number; // köşe yuvarlaklığı
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

// İçeriğin (fotoğraf, profil kartı) etrafına kenarlık/çerçeve çizer. Çerçeve içeriğin DIŞINA `width` kadar ekler.
export function CosmeticFrame({ look, width = 3, radius, style, children }: Props) {
  const inner = { borderRadius: Math.max(0, radius - width), overflow: "hidden" as const };

  if (!look) return <View style={style}>{children}</View>;

  if (look.kind === "solid") {
    return (
      <View style={[{ borderRadius: radius, padding: width, backgroundColor: look.color }, style]}>
        <View style={inner}>{children}</View>
      </View>
    );
  }

  if (look.kind === "gradient") {
    return (
      <LinearGradient colors={look.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: radius, padding: width }, style]}>
        <View style={inner}>{children}</View>
      </LinearGradient>
    );
  }

  return (
    <AnimatedRing look={look} width={width} radius={radius} style={style}>
      <View style={inner}>{children}</View>
    </AnimatedRing>
  );
}

// Dönen gradyan: içeriğin arkasında büyük bir gradyan kare döner, sadece kenardan görünür.
function AnimatedRing({
  look,
  width,
  radius,
  style,
  children,
}: { look: Extract<FrameLook, { kind: "animated" }>; width: number; radius: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 3200, easing: Easing.linear }), -1, false);
  }, [rotation]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const diagonal = Math.ceil(Math.hypot(box.w, box.h));

  return (
    // Dış katman: renkli parıltı (gölge). İç katman: dönen gradyanı kenara kırpar.
    <View
      style={[
        {
          borderRadius: radius,
          shadowColor: look.glow,
          shadowOpacity: 0.85,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
          elevation: 10,
          backgroundColor: look.colors[0],
        },
        style,
      ]}
    >
      <View
        onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        style={{ borderRadius: radius, padding: width + 1, overflow: "hidden" }}
      >
        {diagonal > 0 && (
          <Animated.View
            style={[
              { position: "absolute", width: diagonal, height: diagonal, left: (box.w - diagonal) / 2, top: (box.h - diagonal) / 2 },
              spin,
            ]}
          >
            <LinearGradient colors={look.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
          </Animated.View>
        )}
        {children}
      </View>
    </View>
  );
}

// Çerçevenin içeriğe eklediği kalınlık (ızgarada boyut hesaplamak için)
export const frameThickness = (look: FrameLook | null | undefined, width = 3) =>
  !look ? 0 : look.kind === "animated" ? width + 1 : width;
