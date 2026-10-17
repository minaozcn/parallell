// Kapsül saatleri her zaman Türkiye saatiyle gösterilir (cihazın saat dilimi önemli değil).
const TZ = "Europe/Istanbul";

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: TZ });
