import { api } from "./client";
import type { Achievement } from "./account";

export type ProfileMoment = {
  id: number;
  photoUrl: string;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  capsuleId: number;
  prompt: string;
  opensAt: string;
};

export type Profile = {
  id: number;
  displayName: string;
  bio: string | null;
  badge: Achievement | null;
  frame: string | null;
  isMe: boolean;
  connected: boolean; // paralel bağlantı var mı (mesajlaşabilir mi)
  stats: { moments: number; cities: number; countries: number; achievements: number };
  moments: ProfileMoment[];
};

export type Conversation = {
  userId: number;
  displayName: string;
  lastMessage: string | null;
  lastAt: string | null;
  unread: number;
};

export type Message = { id: number; mine: boolean; body: string; createdAt: string };

export type UserReportReason = "harassment" | "spam" | "inappropriate" | "other";

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const fetchProfile = (userId: number) => api<Profile>(`/api/users/${userId}/profile`);
export const blockUser = (userId: number) => api<{ blocked: true }>(`/api/users/${userId}/block`, { method: "POST" });
export const reportUser = (userId: number, reason: UserReportReason) =>
  api<{ ok: true }>(`/api/users/${userId}/report`, json({ reason }));

export const fetchConversations = () => api<Conversation[]>("/api/conversations");
export const fetchMessages = (userId: number) => api<Message[]>(`/api/messages/${userId}`);
export const sendMessage = (userId: number, body: string) => api<Message>(`/api/messages/${userId}`, json({ body }));
