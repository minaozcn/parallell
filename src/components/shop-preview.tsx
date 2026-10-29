import { Image, StyleSheet, Text, View } from "react-native";
import { CosmeticFrame, frameThickness } from "@/components/cosmetic-frame";
import { BORDERS, FRAMES, THEMES } from "@/constants/cosmetics";
import type { ShopItem } from "@/api/account";
import type { Palette } from "@/constants/theme";

const SAMPLE_PHOTO = "https://picsum.photos/seed/parallell-shop-preview/400/400";

// Mağaza kartının üst kısmı: ürünü satın almadan önce nasıl görüneceğini gösterir.
export function ShopPreview({ item, size, colors }: { item: ShopItem; size: number; colors: Palette }) {
  if (item.type === "border") {
    const look = item.style ? BORDERS[item.style] : null;
    const inner = size - 2 * frameThickness(look);
    return (
      <View style={[styles.stage, { width: size, height: size }]}>
        <CosmeticFrame look={look} radius={14}>
          <Image source={{ uri: SAMPLE_PHOTO }} style={{ width: inner, height: inner, borderRadius: 11 }} />
        </CosmeticFrame>
      </View>
    );
  }

  if (item.type === "frame") {
    // Profil çerçevesi: profildeki gibi avatarın etrafında halka
    const look = item.style ? FRAMES[item.style] : null;
    const avatar = Math.round(size * 0.42);
    return (
      <View style={[styles.stage, { width: size, height: size, backgroundColor: colors.background, borderRadius: 14, gap: 8 }]}>
        <CosmeticFrame look={look} radius={avatar} width={3}>
          <View
            style={{
              width: avatar,
              height: avatar,
              borderRadius: avatar / 2,
              backgroundColor: colors.buttonBackground,
              borderWidth: 3,
              borderColor: colors.background,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.buttonText, fontSize: avatar * 0.38, fontWeight: "600" }}>G</Text>
          </View>
        </CosmeticFrame>
        <Text style={[styles.miniName, { color: colors.text }]}>gezgin</Text>
      </View>
    );
  }

  // Tema: o temanın renkleriyle küçük bir ekran
  const theme = item.style ? THEMES[item.style] : null;
  const p = theme?.palette ?? colors;
  return (
    <View style={[styles.stage, styles.themeScreen, { width: size, height: size, backgroundColor: p.background }]}>
      <Text style={[styles.themeTitle, { color: p.text }]}>parallell</Text>
      <View style={[styles.themeCard, { backgroundColor: p.card }]}>
        <View style={[styles.line, { backgroundColor: p.muted, width: "80%" }]} />
        <View style={[styles.line, { backgroundColor: p.muted, width: "50%" }]} />
      </View>
      <View style={[styles.themeButton, { backgroundColor: p.buttonBackground }]}>
        <Text style={{ color: p.buttonText, fontSize: 11, fontWeight: "700" }}>Katıl</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: "center", justifyContent: "center" },
  miniName: { fontSize: 14, fontWeight: "700" },
  line: { height: 5, borderRadius: 3, opacity: 0.5 },
  themeScreen: { borderRadius: 14, padding: 12, justifyContent: "space-between", alignItems: "stretch" },
  themeTitle: { fontSize: 15, fontWeight: "700" },
  themeCard: { borderRadius: 10, padding: 10, gap: 6 },
  themeButton: { borderRadius: 8, paddingVertical: 6, alignItems: "center" },
});
