import { api } from "./client";

export type ShopItem = { id: number; name: string; type: "frame" | "border" | "theme" | "badge"; price: number; owned: boolean };
export type Me = { displayName: string; points: number; items: Omit<ShopItem, "price" | "owned">[] };
export type Transaction = { id: number; amount: number; reason: string; createdAt: string };

export const fetchMe = () => api<Me>("/api/me");
export const fetchTransactions = () => api<Transaction[]>("/api/me/transactions");
export const fetchShopItems = () => api<ShopItem[]>("/api/shop/items");
export const purchaseItem = (id: number) => api<{ ok: true }>(`/api/shop/items/${id}/purchase`, { method: "POST" });
