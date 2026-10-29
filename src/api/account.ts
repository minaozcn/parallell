import { api } from "./client";

export type ItemType = "frame" | "border" | "theme" | "badge";
export type ShopItem = { id: number; name: string; type: ItemType; style: string | null; price: number; owned: boolean; equipped: boolean };
export type Equipped = Record<ItemType, string | null>;
export type Achievement = {
  key: string;
  name: string;
  icon: string; // Ionicons adı
  description: string;
  earnedAt?: string | null;
  equipped?: boolean;
};

export type Me = {
  displayName: string;
  points: number;
  items: Omit<ShopItem, "price" | "owned">[];
  equipped: Equipped;
  badge: Achievement | null;
  stats: { total: number; thisMonth: number };
};
export type Transaction = { id: number; amount: number; reason: string; createdAt: string };

export const fetchMe = () => api<Me>("/api/me");
export const fetchTransactions = () => api<Transaction[]>("/api/me/transactions");
export const fetchShopItems = () => api<ShopItem[]>("/api/shop/items");
export const purchaseItem = (id: number) => api<{ ok: true }>(`/api/shop/items/${id}/purchase`, { method: "POST" });

export const updateDisplayName = (displayName: string) =>
  api<{ displayName: string }>("/api/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName }),
  });

export const equipItem = (id: number) =>
  api<{ equipped: Equipped }>(`/api/shop/items/${id}/equip`, { method: "POST" });

export const fetchAchievements = () => api<Achievement[]>("/api/achievements");
export const toggleBadge = (key: string) =>
  api<{ badge: string | null }>(`/api/achievements/${key}/equip`, { method: "POST" });
