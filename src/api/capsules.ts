import { API_URL } from "./config";

export type Capsule = {
  id: number;
  prompt: string;
  participantCount: number;
  opensAt: string;
  imageUrl: string;
};

export async function fetchCurrentCapsule(): Promise<Capsule> {
  const response = await fetch(`${API_URL}/api/capsules/current`);

  if (!response.ok) {
    throw new Error(`Sunucu hatası: ${response.status}`);
  }

  return response.json();
}
