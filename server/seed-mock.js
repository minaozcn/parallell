// SADECE GELİŞTİRME İÇİN: 1 numaralı kapsüle dünyanın farklı yerlerinden sahte katkılar ekler.
//   npm run db:seed     → sahte verileri ekler
//   npm run db:unseed   → sahte verileri ve fotoğraflarını tamamen siler
// Sahte kullanıcılar "mock-" ile başlayan adlarından tanınır. Yayına çıkmadan önce mutlaka temizlenmeli.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const CAPSULE_ID = 1;
const UPLOAD_DIR = path.resolve("uploads");
const MOCKS = [
  { name: "mock-aiko", city: "Tokyo", country: "JP", lat: 35.7, lng: 139.7 },
  { name: "mock-lea", city: "Paris", country: "FR", lat: 48.9, lng: 2.4 },
  { name: "mock-sam", city: "New York", country: "US", lat: 40.7, lng: -74.0 },
  { name: "mock-bia", city: "Rio de Janeiro", country: "BR", lat: -22.9, lng: -43.2 },
  { name: "mock-thabo", city: "Cape Town", country: "ZA", lat: -33.9, lng: 18.4 },
  { name: "mock-mia", city: "Sydney", country: "AU", lat: -33.9, lng: 151.2 },
  { name: "mock-einar", city: "Reykjavík", country: "IS", lat: 64.1, lng: -21.9 },
  { name: "mock-priya", city: "Mumbai", country: "IN", lat: 19.1, lng: 72.9 },
  { name: "mock-deniz", city: "İzmir", country: "TR", lat: 38.4, lng: 27.1 },
];

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: "Z",
});

async function unseed() {
  const [users] = await conn.query("SELECT id FROM users WHERE display_name LIKE 'mock-%'");
  if (users.length === 0) return console.log("Silinecek sahte veri yok.");
  const ids = users.map((u) => u.id);
  const [photos] = await conn.query("SELECT id, photo_path FROM contributions WHERE user_id IN (?)", [ids]);
  const contributionIds = photos.map((p) => p.id);
  if (contributionIds.length) {
    await conn.query("DELETE FROM reports WHERE contribution_id IN (?)", [contributionIds]);
    await conn.query("DELETE FROM point_transactions WHERE contribution_id IN (?)", [contributionIds]);
  }
  await conn.query("DELETE FROM reports WHERE reporter_id IN (?)", [ids]);
  await conn.query("DELETE FROM user_achievements WHERE user_id IN (?)", [ids]);
  await conn.query("DELETE FROM contributions WHERE user_id IN (?)", [ids]);
  await conn.query("DELETE FROM user_items WHERE user_id IN (?)", [ids]);
  await conn.query("DELETE FROM point_transactions WHERE user_id IN (?)", [ids]);
  await conn.query("DELETE FROM users WHERE id IN (?)", [ids]);
  for (const p of photos) fs.rmSync(path.join(UPLOAD_DIR, p.photo_path), { force: true });
  console.log(`${users.length} sahte kullanıcı ve ${photos.length} fotoğraf silindi.`);
}

async function seed() {
  const [[capsule]] = await conn.query("SELECT id, opens_at FROM capsules WHERE id = ?", [CAPSULE_ID]);
  if (!capsule) throw new Error(`Kapsül ${CAPSULE_ID} bulunamadı`);
  const [[{ n }]] = await conn.query("SELECT COUNT(*) AS n FROM users WHERE display_name LIKE 'mock-%'");
  if (n > 0) return console.log("Sahte veriler zaten var. Yeniden eklemek için önce: npm run db:unseed");

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const opensAt = new Date(capsule.opens_at);

  for (const [i, m] of MOCKS.entries()) {
    const res = await fetch(`https://picsum.photos/seed/parallell-${m.city}/800/600`);
    if (!res.ok) throw new Error(`Fotoğraf indirilemedi: ${m.city}`);
    const file = `mock-${crypto.randomUUID()}.jpg`;
    fs.writeFileSync(path.join(UPLOAD_DIR, file), Buffer.from(await res.arrayBuffer()));

    const [user] = await conn.query("INSERT INTO users (token, display_name) VALUES (?, ?)", [
      crypto.randomUUID(),
      m.name,
    ]);
    // Katkı zamanı: kapsül açılmadan önceki son saatlere yayılır
    const createdAt = new Date(opensAt.getTime() - (MOCKS.length - i) * 5 * 60_000);
    await conn.query(
      `INSERT INTO contributions (capsule_id, user_id, photo_path, created_at, city, country, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [CAPSULE_ID, user.insertId, file, createdAt, m.city, m.country, m.lat, m.lng],
    );
    console.log(`+ ${m.city}`);
  }
  console.log(`${MOCKS.length} sahte katkı eklendi (kapsül ${CAPSULE_ID}).`);
}

try {
  await (process.argv.includes("--clean") ? unseed() : seed());
} finally {
  await conn.end();
}
