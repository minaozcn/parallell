import { useEffect, useState } from "react";

// Şu anki zamanı döndürür ve her `intervalMs`'de bir günceller (geri sayım için).
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id); // ekran kapanınca zamanlayıcıyı durdur
  }, [intervalMs]);
  return now;
}
