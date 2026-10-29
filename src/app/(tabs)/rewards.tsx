import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { ShopPreview } from "@/components/shop-preview";
import { useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { Screen, Muted } from "@/components/screen";
import { ShopItem, equipItem, fetchMe, fetchShopItems, purchaseItem } from "@/api/account";
import { useAppTheme } from "@/hooks/app-theme";

type Tab = "border" | "frame" | "theme";
const TABS: { key: Tab; label: string }[] = [
  { key: "border", label: "Kenarlıklar" },
  { key: "frame", label: "Profil çerçeveleri" },
  { key: "theme", label: "Temalar" },
];

export default function Rewards() {
  const colors = useColors();
  const { setThemeStyle } = useAppTheme();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>("border");
  const [points, setPoints] = useState<number | null>(null);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [me, shop] = await Promise.all([fetchMe(), fetchShopItems()]);
      setPoints(me.points);
      setItems(shop);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function toggleEquip(item: ShopItem) {
    try {
      const { equipped } = await equipItem(item.id);
      setThemeStyle(equipped.theme); // tema değiştiyse tüm uygulama anında yeni renklere geçer
      await load();
    } catch (e) {
      Alert.alert("Değiştirilemedi", (e as Error).message);
    }
  }

  function buy(item: ShopItem) {
    Alert.alert(item.name, item.price === 0 ? "Bu eşya şu an ücretsiz." : `${item.price} puan harcanacak.`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Satın al",
        onPress: async () => {
          try {
            await purchaseItem(item.id);
            await load();
          } catch (e) {
            Alert.alert("Satın alınamadı", (e as Error).message);
          }
        },
      },
    ]);
  }

  const visible = items.filter((i) => i.type === tab);
  const tileWidth = (width - 40 - 12) / 2;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Rewards</Text>
        <View style={[styles.balance, { backgroundColor: colors.card }]}>
          <Text style={{ color: colors.muted }}>Puan bakiyen</Text>
          <Text style={[styles.balanceValue, { color: colors.text }]}>✦ {points ?? "—"}</Text>
        </View>
        {error && <Muted>Yüklenemedi: {error}</Muted>}

        {/* Mağaza sekmeleri */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tab, { backgroundColor: tab === t.key ? colors.buttonBackground : colors.card }]}
            >
              <Text style={{ color: tab === t.key ? colors.buttonText : colors.muted, fontWeight: "600" }}>{t.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.grid}>
          {visible.map((item) => {
            const affordable = points !== null && points >= item.price;
            return (
              <View key={item.id} style={[styles.tile, { width: tileWidth, backgroundColor: colors.card }]}>
                <ShopPreview item={item} size={tileWidth - 16} colors={colors} />
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                {item.owned ? (
                  <Pressable
                    onPress={() => toggleEquip(item)}
                    style={[
                      styles.action,
                      item.equipped ? { borderWidth: 1, borderColor: colors.muted } : { backgroundColor: colors.buttonBackground },
                    ]}
                  >
                    <Text style={{ color: item.equipped ? colors.text : colors.buttonText, fontWeight: "600" }}>
                      {item.equipped ? "Çıkar" : "Kullan"}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    disabled={!affordable}
                    onPress={() => buy(item)}
                    style={[styles.action, { backgroundColor: colors.buttonBackground }, !affordable && { opacity: 0.4 }]}
                  >
                    <Text style={{ color: colors.buttonText, fontWeight: "600" }}>
                      {item.price === 0 ? "Ücretsiz al" : `✦ ${item.price}`}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 10 },
  title: { marginTop: 16, fontSize: 24, fontWeight: "600" },
  balance: { padding: 20, borderRadius: 20, gap: 4 },
  balanceValue: { fontSize: 32, fontWeight: "600" },
  tabs: { gap: 8, paddingVertical: 4 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { padding: 8, borderRadius: 18, gap: 8, alignItems: "center" },
  itemName: { fontSize: 14, fontWeight: "600", alignSelf: "stretch", textAlign: "center" },
  action: { alignSelf: "stretch", paddingVertical: 9, borderRadius: 12, alignItems: "center" },
});
