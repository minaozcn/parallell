// Rozet tanımları ve kazanma kuralları. Yeni rozet eklemek = bu listeye bir satır eklemek.
// icon: uygulamadaki Ionicons ikon adı.
export const ACHIEVEMENTS = [
  { key: "first-light", name: "İlk ışık", icon: "sparkles-outline", description: "İlk kapsülüne katıl." },
  { key: "early-bird", name: "Erken kuş", icon: "sunny-outline", description: "Bir kapsüle ilk katılan sen ol." },
  { key: "top-ten", name: "İlk ondakiler", icon: "ribbon-outline", description: "Bir kapsüle ilk 10 kişi arasında katıl." },
  { key: "close-call", name: "Kıl payı", icon: "hourglass-outline", description: "Kapsül açılmadan önceki son 5 dakikada katıl." },
  { key: "night-owl", name: "Gece kuşu", icon: "moon-outline", description: "Gece yarısı ile sabah 5 arasında katıl." },
  { key: "sunrise", name: "Gün doğumu", icon: "partly-sunny-outline", description: "Sabah 5 ile 8 arasında katıl." },
  { key: "neighbors", name: "Komşular", icon: "people-outline", description: "Aynı kapsüle seninle aynı şehirden biri daha katılsın." },
  { key: "second-thought", name: "İkinci düşünce", icon: "refresh-outline", description: "Katkını silip yeniden gönder." },
  { key: "wanderer", name: "Gezgin", icon: "map-outline", description: "3 farklı şehirden katıl." },
  { key: "world-citizen", name: "Dünya vatandaşı", icon: "earth-outline", description: "3 farklı ülkeden katıl." },
  { key: "seven-days", name: "Haftanın her günü", icon: "calendar-outline", description: "Haftanın 7 farklı gününde en az birer kez katıl." },
  { key: "full-month", name: "Dolu bir ay", icon: "albums-outline", description: "Bir ay içinde 10 kapsüle katıl." },
  { key: "welcome-back", name: "Yeniden merhaba", icon: "hand-left-outline", description: "30 günlük bir aradan sonra geri dön." },
  { key: "ten-moments", name: "On an", icon: "medal-outline", description: "Toplam 10 kapsüle katıl." },
  { key: "fifty-moments", name: "Elli an", icon: "trophy-outline", description: "Toplam 50 kapsüle katıl." },
];

const ACTIVE = "user_id = ? AND deleted_at IS NULL";
const istanbulHour = (date) => (date.getUTCHours() + 3) % 24;

// Yeni bir katkıdan sonra kazanılan rozetleri hesaplar ve kaydeder. Yeni kazanılanları döndürür.
export async function awardAchievements(conn, { userId, contribution, capsule, rank, startOfMonth }) {
  const now = new Date(contribution.created_at);
  const one = async (sql, params) => Number(Object.values((await conn.query(sql, params))[0][0])[0]);

  const total = await one(`SELECT COUNT(*) FROM contributions WHERE ${ACTIVE}`, [userId]);
  const checks = {
    "first-light": total >= 1,
    "early-bird": rank === 1,
    "top-ten": rank <= 10,
    "close-call": new Date(capsule.opens_at) - now <= 5 * 60_000,
    "night-owl": istanbulHour(now) < 5,
    sunrise: istanbulHour(now) >= 5 && istanbulHour(now) < 8,
    neighbors:
      contribution.city !== null &&
      (await one(
        "SELECT COUNT(*) FROM contributions WHERE capsule_id = ? AND city = ? AND user_id <> ? AND deleted_at IS NULL",
        [capsule.id, contribution.city, userId],
      )) > 0,
    "second-thought":
      (await one("SELECT COUNT(*) FROM contributions WHERE capsule_id = ? AND user_id = ? AND deleted_at IS NOT NULL", [
        capsule.id,
        userId,
      ])) > 0,
    wanderer: (await one(`SELECT COUNT(DISTINCT city) FROM contributions WHERE ${ACTIVE}`, [userId])) >= 3,
    "world-citizen": (await one(`SELECT COUNT(DISTINCT country) FROM contributions WHERE ${ACTIVE}`, [userId])) >= 3,
    "seven-days":
      (await one(
        `SELECT COUNT(DISTINCT DAYOFWEEK(created_at + INTERVAL 3 HOUR)) FROM contributions WHERE ${ACTIVE}`,
        [userId],
      )) === 7,
    "full-month": (await one(`SELECT COUNT(*) FROM contributions WHERE ${ACTIVE} AND created_at >= ?`, [userId, startOfMonth])) >= 10,
    "welcome-back":
      (await one(
        `SELECT COUNT(*) FROM contributions WHERE ${ACTIVE} AND id <> ? AND created_at > ? - INTERVAL 30 DAY`,
        [userId, contribution.id, now],
      )) === 0 && total > 1,
    "ten-moments": total >= 10,
    "fifty-moments": total >= 50,
  };

  const earned = [];
  for (const a of ACHIEVEMENTS) {
    if (!checks[a.key]) continue;
    const [result] = await conn.query(
      "INSERT IGNORE INTO user_achievements (user_id, achievement_key, contribution_id) VALUES (?, ?, ?)",
      [userId, a.key, contribution.id],
    );
    if (result.affectedRows === 1) earned.push(a); // daha önce kazanılmamışsa "yeni"
  }
  return earned;
}

// Silinen katkının kazandırdığı rozetleri geri alır (puanlarda olduğu gibi).
export async function revokeAchievements(conn, userId, contributionId) {
  await conn.query("DELETE FROM user_achievements WHERE contribution_id = ?", [contributionId]);
  await conn.query(
    `UPDATE users SET equipped_badge = NULL WHERE id = ? AND equipped_badge IS NOT NULL
     AND equipped_badge NOT IN (SELECT achievement_key FROM user_achievements WHERE user_id = ?)`,
    [userId, userId],
  );
}

export const findAchievement = (key) => ACHIEVEMENTS.find((a) => a.key === key) ?? null;
