// SADECE GELİŞTİRME İÇİN: paralel bağlantıyı tek telefonla test edebilmek için.
//   npm run db:seed:connect
// Senin en son açılmış kapsülüne iki sahte kullanıcı katılır ve senin fotoğrafına ✦ verir:
//   mock-lea  → bağlantı HAZIR: senin adına da ✦ verilir, aranızda örnek bir sohbet oluşur (Messages'ta hemen görünür)
//   mock-aiko → bağlantı YARIM: sen onun fotoğrafına ✦ verince bağlantı kurulur ("Paralel bağlantı ✦" akışını test etmek için)
// Önce "npm run db:seed" çalışmış olmalı (sahte kullanıcılar oradan gelir). Temizlik: npm run db:unseed
import mysql from "mysql2/promise";

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: "Z",
});

try {
  // Gerçek kullanıcı: sahte olmayan, en son katkı yapan kişi
  const [[mine]] = await conn.query(
    `SELECT x.id, x.user_id, x.capsule_id, c.opens_at FROM contributions x
     JOIN capsules c ON c.id = x.capsule_id JOIN users u ON u.id = x.user_id
     WHERE u.display_name NOT LIKE 'mock-%' AND x.deleted_at IS NULL AND c.opens_at <= UTC_TIMESTAMP()
     ORDER BY c.opens_at DESC LIMIT 1`,
  );
  if (!mine) throw new Error("Açılmış bir kapsülde katkın yok. Önce katıl ve kapsülü aç.");

  const [mocks] = await conn.query(
    // Her sahte kullanıcının ilk katkısı (fotoğrafını ve şehrini yeniden kullanmak için)
    `SELECT u.id, u.display_name, x.photo_path, x.city, x.country, x.lat, x.lng
     FROM users u JOIN contributions x ON x.id = (
       SELECT MIN(y.id) FROM contributions y WHERE y.user_id = u.id AND y.deleted_at IS NULL
     )
     WHERE u.display_name IN ('mock-lea', 'mock-aiko')`,
  );
  if (mocks.length === 0) throw new Error("Sahte kullanıcı yok. Önce: npm run db:seed");

  // Örnek sohbetler: [gönderen sahte kullanıcı mı?, mesaj]
  const conversations = {
    "mock-lea": [
      [true, "Selam! Aynı anda farklı gökyüzleri, ne güzel ✦"],
      [false, "Merhaba! Paris'te hava nasıldı?"],
      [true, "Gün batımı pembe pembeydi, fotoğraf hakkını vermedi bile :)"],
      [true, "Yarınki kapsüle de katılacak mısın?"],
    ],
    "mock-aiko": [[true, "Burada saat çok geçti ama paylaşmak istedim :)"]],
  };

  for (const m of mocks) {
    // Senin kapsülüne katıl (zaten katılmışsa atla); sahte fotoğrafı yeniden kullanır
    await conn.query(
      `INSERT IGNORE INTO contributions (capsule_id, user_id, photo_path, created_at, city, country, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [mine.capsule_id, m.id, m.photo_path, new Date(new Date(mine.opens_at).getTime() - 10 * 60_000), m.city, m.country, m.lat, m.lng],
    );
    await conn.query("INSERT IGNORE INTO reactions (contribution_id, user_id) VALUES (?, ?)", [mine.id, m.id]);

    // mock-lea için senin adına da ✦ ver: bağlantı hemen kurulsun
    if (m.display_name === "mock-lea") {
      const [[theirs]] = await conn.query(
        "SELECT id FROM contributions WHERE capsule_id = ? AND user_id = ? AND deleted_at IS NULL",
        [mine.capsule_id, m.id],
      );
      await conn.query("INSERT IGNORE INTO reactions (contribution_id, user_id) VALUES (?, ?)", [theirs.id, mine.user_id]);
    }

    // Sohbet zaten varsa tekrar ekleme
    const [[{ n }]] = await conn.query(
      "SELECT COUNT(*) AS n FROM messages WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)",
      [m.id, mine.user_id, mine.user_id, m.id],
    );
    if (n === 0) {
      const lines = conversations[m.display_name];
      for (const [i, [fromMock, body]] of lines.entries()) {
        const at = new Date(Date.now() - (lines.length - i) * 3 * 60_000); // birkaç dakika arayla
        await conn.query("INSERT INTO messages (sender_id, recipient_id, body, created_at) VALUES (?, ?, ?, ?)", [
          fromMock ? m.id : mine.user_id,
          fromMock ? mine.user_id : m.id,
          body,
          at,
        ]);
      }
    }
    console.log(
      m.display_name === "mock-lea"
        ? "+ mock-lea: paralel bağlantı hazır, Messages sekmesinde sohbet var"
        : `+ ${m.display_name}: fotoğrafına ✦ verdi; sen de onunkine verince bağlantı kurulacak`,
    );
  }
  console.log("Hazır. Sahte kullanıcılar mesajlarına otomatik cevap verir (.env: MOCK_REPLIES=true).");
} finally {
  await conn.end();
}
