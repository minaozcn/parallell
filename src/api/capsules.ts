import { File as DeviceFile } from "expo-file-system";
import { api } from "./client";
import type { ApproxLocation } from "@/utils/location";
import type { Achievement } from "./account";

export type CurrentCapsule = {
  id: number;
  prompt: string;
  imageUrl: string;
  opensAt: string; // ISO, UTC
  participantCount: number;
  myContribution: { id: number; photoUrl: string } | null;
};

export type RevealedCapsule = {
  id: number;
  prompt: string;
  opensAt: string;
  participantCount: number;
  coverUrl: string;
};

export type Contribution = {
  id: number;
  photoUrl: string;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  borderStyle: string | null;
  mine: boolean;
};

export type Gallery = {
  capsule: { id: number; prompt: string; opensAt: string };
  contributions: Contribution[];
};

export const fetchCurrentCapsule = () => api<CurrentCapsule>("/api/capsules/current");
export const fetchRevealedCapsules = () => api<RevealedCapsule[]>("/api/capsules/revealed");
export const fetchGallery = (capsuleId: number) => api<Gallery>(`/api/capsules/${capsuleId}/contributions`);

export function submitContribution(capsuleId: number, photoUri: string, location: ApproxLocation | null) {
  const form = new FormData();
  if (location) {
    form.append("lat", String(location.lat));
    form.append("lng", String(location.lng));
    if (location.city) form.append("city", location.city);
    if (location.country) form.append("country", location.country);
  }
  // SDK 58'in fetch'i eski { uri, name, type } nesnesini desteklemiyor;
  // dosyayı expo-file-system'in File nesnesiyle ekliyoruz (adı ve MIME türünü kendisi bilir).
  form.append("photo", new DeviceFile(photoUri) as unknown as Blob);
  return api<{ id: number; pointsAwarded: number; photoUrl: string; newAchievements: Achievement[] }>(
    `/api/capsules/${capsuleId}/contributions`,
    { method: "POST", body: form },
  );
}

export const deleteContribution = (id: number) => api<void>(`/api/contributions/${id}`, { method: "DELETE" });

export type ReportReason = "inappropriate" | "spam" | "other";

export const reportContribution = (id: number, reason: ReportReason) =>
  api<{ hidden: boolean }>(`/api/contributions/${id}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
