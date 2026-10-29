// SADECE GELİŞTİRME İÇİN: paralel bağlantıyı tek telefonla test edebilmek için.
//   npm run db:seed:connect
// 1) Senin en son açılmış kapsülüne iki sahte kullanıcı katılır.
// 2) Senin fotoğrafına ✦ verirler ve sana birer mesaj bırakırlar.
// Sen de galeride onların fotoğrafına ✦ verince paralel bağlantı kurulur ve mesajlar görünür.
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
    `SELECT u.id, u.display_name, x.photo_path, x.city, x.country, x.lat, x.lng
     FROM users u JOIN contributions x ON x.user_id = u.id
     WHERE u.display_name IN ('mock-lea', 'mock-aiko') AND x.deleted_at IS NULL
     GROUP BY u.id`,
  );
  if (mocks.length === 0) throw new Error("Sahte kullanıcı yok. Önce: npm run db:seed");

  const greetings = {
    "mock-lea": "Selam! Aynı anda farklı gökyüzleri, ne güzel ✦",
    "mock-aiko": "Burada saat çok geçti ama paylaşmak istedim :)",
  };

  for (const m of mocks) {
    // Senin kapsülüne katıl (zaten katılmışsa atla); sahte fotoğrafı yeniden kullanır
    await conn.query(
      `INSERT IGNORE INTO contributions (capsule_id, user_id, photo_path, created_at, city, country, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [mine.capsule_id, m.id, m.photo_path, new Date(new Date(mine.opens_at).getTime() - 10 * 60_000), m.city, m.country, m.lat, m.lng],
    );
    await conn.query("INSERT IGNORE INTO reactions (contribution_id, user_id) VALUES (?, ?)", [mine.id, m.id]);
    await conn.query(
      "INSERT INTO messages (sender_id, recipient_id, body, created_at) VALUES (?, ?, ?, ?)",
      [m.id, mine.user_id, greetings[m.display_name], new Date()],
    );
    console.log(`+ ${m.display_name} kapsül ${mine.capsule_id}'e katıldı ve fotoğrafına ✦ verdi`);
  }
  console.log("Şimdi o kapsülün galerisinde onların fotoğrafına ✦ ver: paralel bağlantı kurulacak.");
} finally {
  await conn.end();
}
