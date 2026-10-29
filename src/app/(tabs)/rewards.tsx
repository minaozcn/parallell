import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { Screen, Muted } from "@/components/screen";
import { ShopItem, Transaction, equipItem, fetchMe, fetchShopItems, fetchTransactions, purchaseItem } from "@/api/account";
import { useAppTheme } from "@/hooks/app-theme";
import { formatDate } from "@/utils/format";

const REASONS: Record<string, string> = {
  participation: "Katılım",
  early_bonus: "Erken katılım bonusu",
  revoke_participation: "Katkı silindi",
  revoke_early_bonus: "Bonus geri alındı",
  purchase: "Satın alma",
};

const TYPES: Record<ShopItem["type"], string> = {
  frame: "Profil çerçevesi",
  border: "Fotoğraf kenarlığı",
  theme: "Tema",
  badge: "Rozet",
};

export default function Rewards() {
  const colors = useColors();
  const { setThemeStyle } = useAppTheme();
  const [points, setPoints] = useState<number | null>(null);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [me, shop, tx] = await Promise.all([fetchMe(), fetchShopItems(), fetchTransactions()]);
      setPoints(me.points);
      setItems(shop);
      setHistory(tx);
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

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Rewards</Text>
        <View style={[styles.balance, { backgroundColor: colors.card }]}>
          <Text style={{ color: colors.muted }}>Puan bakiyen</Text>
          <Text style={[styles.balanceValue, { color: colors.text }]}>✦ {points ?? "—"}</Text>
        </View>
        {error && <Muted>Yüklenemedi: {error}</Muted>}

        <Text style={[styles.section, { color: colors.text }]}>Mağaza</Text>
        {items.map((item) => {
          const affordable = points !== null && points >= item.price;
          return (
            <View key={item.id} style={[styles.item, { backgroundColor: colors.card }]}>
              <View style={styles.itemText}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                <Text style={{ color: colors.muted }}>{TYPES[item.type]}</Text>
              </View>
              {item.owned ? (
                <Pressable
                  onPress={() => toggleEquip(item)}
                  style={[
                    styles.buy,
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
                  style={[styles.buy, { backgroundColor: colors.buttonBackground }, !affordable && { opacity: 0.4 }]}
                >
                  <Text style={{ color: colors.buttonText, fontWeight: "600" }}>{item.price === 0 ? "Ücretsiz" : `✦ ${item.price}`}</Text>
                </Pressable>
              )}
            </View>
          );
        })}

        <Text style={[styles.section, { color: colors.text }]}>Geçmiş</Text>
        {history.length === 0 ? (
          <Muted>Henüz puan hareketi yok. Bir kapsüle katılarak puan kazanabilirsin.</Muted>
        ) : (
          history.map((t) => (
            <View key={t.id} style={styles.txRow}>
              <Text style={{ color: colors.text }}>
                {REASONS[t.reason] ?? t.reason} <Text style={{ color: colors.muted }}>· {formatDate(t.createdAt)}</Text>
              </Text>
              <Text style={{ color: colors.text, fontWeight: "600" }}>{t.amount > 0 ? `+${t.amount}` : t.amount}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 10 },
  title: { marginTop: 16, fontSize: 24, fontWeight: "600" },
  balance: { padding: 20, borderRadius: 20, gap: 4 },
  balanceValue: { fontSize: 32, fontWeight: "600" },
  section: { marginTop: 20, fontSize: 18, fontWeight: "600" },
  item: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16 },
  itemText: { flex: 1, gap: 2 },
  itemName: { fontSize: 16, fontWeight: "500" },
  buy: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12 },
  txRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
});
