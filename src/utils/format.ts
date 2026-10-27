// Kapsül saatleri her zaman Türkiye saatiyle gösterilir (cihazın saat dilimi önemli değil).
const TZ = "Europe/Istanbul";

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: TZ });

// Kalan süreyi okunur hâle getirir: "2 sa 14 dk", "14 dk 05 sn", "45 sn"
export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} sa ${m} dk`;
  if (m > 0) return `${m} dk ${String(s).padStart(2, "0")} sn`;
  return `${s} sn`;
}
