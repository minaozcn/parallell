import { api } from "./client";

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

export type Gallery = {
  capsule: { id: number; prompt: string; opensAt: string };
  contributions: { id: number; photoUrl: string }[];
};

export const fetchCurrentCapsule = () => api<CurrentCapsule>("/api/capsules/current");
export const fetchRevealedCapsules = () => api<RevealedCapsule[]>("/api/capsules/revealed");
export const fetchGallery = (capsuleId: number) => api<Gallery>(`/api/capsules/${capsuleId}/contributions`);

export function submitContribution(capsuleId: number, photoUri: string) {
  const form = new FormData();
  // React Native'de dosya, uri/name/type içeren bir nesne olarak eklenir
  form.append("photo", { uri: photoUri, name: "photo.jpg", type: "image/jpeg" } as unknown as Blob);
  return api<{ id: number; pointsAwarded: number; photoUrl: string }>(`/api/capsules/${capsuleId}/contributions`, {
    method: "POST",
    body: form,
  });
}

export const deleteContribution = (id: number) => api<void>(`/api/contributions/${id}`, { method: "DELETE" });
