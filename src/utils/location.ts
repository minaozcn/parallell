import * as Location from "expo-location";

export type ApproxLocation = { city: string | null; country: string | null; lat: number; lng: number };

// Konumu en fazla `ms` kadar bekler; gecikirse konumsuz devam ederiz (katılım asla konuma takılmamalı).
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

// Şehir düzeyinde yaklaşık konum. İzin yoksa veya hata olursa null döner.
export async function getApproxLocation(): Promise<ApproxLocation | null> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return null;

    const position =
      (await Location.getLastKnownPositionAsync()) ??
      (await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }), 5000));
    if (!position) return null;

    const lat = Math.round(position.coords.latitude * 10) / 10; // ~10 km hassasiyet
    const lng = Math.round(position.coords.longitude * 10) / 10;
    const [place] = (await withTimeout(Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }), 5000)) ?? [];

    return {
      city: place?.city ?? place?.subregion ?? place?.region ?? null,
      country: place?.isoCountryCode ?? null,
      lat,
      lng,
    };
  } catch {
    return null;
  }
}

export const formatPlace = (city: string | null, country: string | null) =>
  [city, country].filter(Boolean).join(", ");
