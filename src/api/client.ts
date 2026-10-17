import * as SecureStore from "expo-secure-store";
import { API_URL } from "./config";

const TOKEN_KEY = "parallell-user-token";
let tokenPromise: Promise<string> | null = null;

// Telefonda kayıtlı anonim kimliği döndürür; yoksa sunucudan yeni bir tane alır.
function getToken(): Promise<string> {
  if (!tokenPromise) {
    tokenPromise = (async () => {
      const saved = await SecureStore.getItemAsync(TOKEN_KEY);
      if (saved) return saved;
      const res = await fetch(`${API_URL}/api/users`, { method: "POST" });
      if (!res.ok) throw new Error("Kullanıcı oluşturulamadı");
      const { token } = await res.json();
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      return token;
    })().catch((e) => {
      tokenPromise = null; // bir sonraki denemede tekrar dene
      throw e;
    });
  }
  return tokenPromise;
}

// Tüm API istekleri buradan geçer: kimlik başlığı ekler, hataları anlaşılır mesaja çevirir.
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...options.headers, "X-User-Token": token },
    });
  } catch {
    throw new Error("Sunucuya ulaşılamadı");
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Sunucu hatası: ${res.status}`);
  return body as T;
}
