import { pool } from "./db.js";

const ISTANBUL_OFFSET_HOURS = 3; // Türkiye yaz/kış saati uygulamıyor: her zaman UTC+3

// Bir sonraki "İstanbul saatiyle 20:00" anını UTC Date olarak hesaplar.
function nextOpeningTime(now = new Date()) {
  const openHour = Number(process.env.OPEN_HOUR_ISTANBUL);
  const istanbulNow = new Date(now.getTime() + ISTANBUL_OFFSET_HOURS * 3600_000);
  const opening = new Date(
    Date.UTC(
      istanbulNow.getUTCFullYear(),
      istanbulNow.getUTCMonth(),
      istanbulNow.getUTCDate(),
      openHour - ISTANBUL_OFFSET_HOURS,
    ),
  );
  if (opening <= now) opening.setUTCDate(opening.getUTCDate() + 1);
  return opening;
}

// Katılıma açık bir kapsül yoksa yenisini oluşturur (günlük kapsül).
export async function ensureUpcomingCapsule() {
  const opensAt = nextOpeningTime();
  const seed = opensAt.toISOString().slice(0, 10);
  await pool.query(
    "INSERT IGNORE INTO capsules (prompt, image_url, opens_at) VALUES (?, ?, ?)",
    [process.env.DAILY_PROMPT, `https://picsum.photos/seed/${seed}/600/400`, opensAt],
  );
}

export function isRevealed(capsule) {
  return new Date(capsule.opens_at) <= new Date();
}

export function photoUrl(req, photoPath) {
  return `${req.protocol}://${req.get("host")}/uploads/${photoPath}`;
}

export async function countParticipants(conn, capsuleId) {
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS n FROM contributions WHERE capsule_id = ? AND deleted_at IS NULL",
    [capsuleId],
  );
  return rows[0].n;
}
