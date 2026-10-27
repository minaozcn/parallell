import express from "express";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pool, withTransaction } from "./db.js";
import { ensureUpcomingCapsule, isRevealed, photoUrl, countParticipants } from "./capsules.js";
import { getBalance, awardForContribution, revokeForContribution } from "./points.js";
import { ACHIEVEMENTS, awardAchievements, revokeAchievements, findAchievement } from "./achievements.js";

const app = express();
const UPLOAD_DIR = path.resolve("uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Her isteği terminale yaz: telefondan istek gelip gelmediğini görmek için
app.use((req, res, next) => {
  res.on("finish", () => console.log(`${req.method} ${req.originalUrl} → ${res.statusCode}`));
  next();
});
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}.jpg`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

// Basit bir hata tipi: status kodu ve kullanıcıya gösterilecek mesaj
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Telefondan gelen konum alanlarını doğrular; geçersiz/eksikse konumsuz kaydedilir.
function parseLocation(body) {
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const city = typeof body?.city === "string" ? body.city.trim().slice(0, 100) || null : null;
  const country = typeof body?.country === "string" && /^[A-Za-z]{2}$/.test(body.country) ? body.country.toUpperCase() : null;
  return {
    city,
    country,
    lat: hasCoords ? Math.round(lat * 10) / 10 : null, // sunucuda da yuvarla: telefona güvenme
    lng: hasCoords ? Math.round(lng * 10) / 10 : null,
  };
}

function formatContribution(req, r) {
  return {
    id: r.id,
    photoUrl: photoUrl(req, r.photo_path),
    city: r.city,
    country: r.country,
    lat: r.lat === null ? null : Number(r.lat),
    lng: r.lng === null ? null : Number(r.lng),
    borderStyle: r.border_style ?? null,
    mine: r.user_id === req.user.id,
  };
}

// Kullanıcının taktığı eşyalar: { frame: "peach", border: null, theme: "night", badge: null }
async function getEquipped(conn, userId) {
  const [rows] = await conn.query(
    `SELECT s.type, s.style FROM user_items u JOIN shop_items s ON s.id = u.shop_item_id
     WHERE u.user_id = ? AND u.equipped = 1`,
    [userId],
  );
  const equipped = { frame: null, border: null, theme: null, badge: null };
  for (const r of rows) if (r.type !== "badge") equipped[r.type] = r.style;
  const [[user]] = await conn.query("SELECT equipped_badge FROM users WHERE id = ?", [userId]);
  equipped.badge = user.equipped_badge;
  return equipped;
}

// Bu ayın başlangıcı (İstanbul saatiyle), UTC olarak
function startOfMonthIstanbul(now = new Date()) {
  const ist = new Date(now.getTime() + 3 * 3600_000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1, -3));
}

// --- Kimlik: anonim kullanıcı + token ---

app.post("/api/users", async (req, res) => {
  const token = crypto.randomUUID();
  const name = `gezgin-${token.slice(0, 4)}`;
  await pool.query("INSERT INTO users (token, display_name) VALUES (?, ?)", [token, name]);
  res.status(201).json({ token });
});

async function auth(req, res, next) {
  const token = req.get("X-User-Token");
  const [rows] = token ? await pool.query("SELECT * FROM users WHERE token = ?", [token]) : [[]];
  if (rows.length === 0) throw new HttpError(401, "Geçersiz kullanıcı");
  req.user = rows[0];
  next();
}

app.use("/api", (req, res, next) => (req.path === "/users" ? next() : auth(req, res, next)));

// --- Kullanıcı ---

app.get("/api/me", async (req, res) => {
  const [items] = await pool.query(
    `SELECT s.id, s.name, s.type, s.style, u.equipped FROM user_items u JOIN shop_items s ON s.id = u.shop_item_id
     WHERE u.user_id = ? AND s.type <> 'badge' ORDER BY u.purchased_at`,
    [req.user.id],
  );
  const [[stats]] = await pool.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(created_at >= ?), 0) AS thisMonth
     FROM contributions WHERE user_id = ? AND deleted_at IS NULL`,
    [startOfMonthIstanbul(), req.user.id],
  );
  res.json({
    displayName: req.user.display_name,
    points: await getBalance(pool, req.user.id),
    items: items.map((i) => ({ ...i, equipped: Boolean(i.equipped) })),
    equipped: await getEquipped(pool, req.user.id),
    badge: findAchievement((await getEquipped(pool, req.user.id)).badge),
    stats: { total: Number(stats.total), thisMonth: Number(stats.thisMonth) },
  });
});

app.patch("/api/me", async (req, res) => {
  const name = String(req.body?.displayName ?? "").trim();
  // 2-24 karakter: harf (Türkçe dahil), rakam, boşluk, nokta, alt çizgi, tire
  if (!/^[\p{L}\p{N} ._-]{2,24}$/u.test(name)) {
    throw new HttpError(400, "Ad 2-24 karakter olmalı; harf, rakam, boşluk, . _ - kullanılabilir");
  }
  await pool.query("UPDATE users SET display_name = ? WHERE id = ?", [name, req.user.id]);
  res.json({ displayName: name });
});

app.get("/api/me/transactions", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, amount, reason, created_at AS createdAt FROM point_transactions WHERE user_id = ? ORDER BY id DESC LIMIT 50",
    [req.user.id],
  );
  res.json(rows);
});

// --- Kapsüller ---

app.get("/api/capsules/current", async (req, res) => {
  await ensureUpcomingCapsule();
  const [[capsule]] = await pool.query(
    "SELECT * FROM capsules WHERE opens_at > UTC_TIMESTAMP() ORDER BY opens_at LIMIT 1",
  );
  const [mine] = await pool.query(
    "SELECT id, photo_path FROM contributions WHERE capsule_id = ? AND user_id = ? AND deleted_at IS NULL",
    [capsule.id, req.user.id],
  );
  res.json({
    id: capsule.id,
    prompt: capsule.prompt,
    imageUrl: capsule.image_url,
    opensAt: capsule.opens_at,
    participantCount: await countParticipants(pool, capsule.id),
    myContribution: mine[0] ? { id: mine[0].id, photoUrl: photoUrl(req, mine[0].photo_path) } : null,
  });
});

app.get("/api/capsules/revealed", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.prompt, c.image_url, c.opens_at,
       (SELECT COUNT(*) FROM contributions x
        WHERE x.capsule_id = c.id AND x.deleted_at IS NULL AND x.hidden_at IS NULL) AS participantCount,
       (SELECT x.photo_path FROM contributions x
        WHERE x.capsule_id = c.id AND x.deleted_at IS NULL AND x.hidden_at IS NULL
        ORDER BY x.created_at LIMIT 1) AS coverPath
     FROM capsules c WHERE c.opens_at <= UTC_TIMESTAMP() ORDER BY c.opens_at DESC LIMIT 30`,
  );
  res.json(
    rows.map((c) => ({
      id: c.id,
      prompt: c.prompt,
      opensAt: c.opens_at,
      participantCount: c.participantCount,
      coverUrl: c.coverPath ? photoUrl(req, c.coverPath) : c.image_url,
    })),
  );
});

app.get("/api/capsules/:id/contributions", async (req, res) => {
  const [[capsule]] = await pool.query("SELECT * FROM capsules WHERE id = ?", [req.params.id]);
  if (!capsule) throw new HttpError(404, "Kapsül bulunamadı");
  // Kural: kapsül açılmadan başkalarının katkıları asla gönderilmez
  if (!isRevealed(capsule)) throw new HttpError(403, "Kapsül henüz açılmadı");

  const [rows] = await pool.query(
    `SELECT x.id, x.user_id, x.photo_path, x.city, x.country, x.lat, x.lng, s.style AS border_style
     FROM contributions x
     LEFT JOIN user_items u ON u.user_id = x.user_id AND u.equipped = 1
       AND u.shop_item_id IN (SELECT id FROM shop_items WHERE type = 'border')
     LEFT JOIN shop_items s ON s.id = u.shop_item_id
     WHERE x.capsule_id = ? AND x.deleted_at IS NULL AND x.hidden_at IS NULL
     ORDER BY x.created_at`,
    [capsule.id],
  );
  res.json({
    capsule: { id: capsule.id, prompt: capsule.prompt, opensAt: capsule.opens_at },
    contributions: rows.map((r) => formatContribution(req, r)),
  });
});

// --- Katkılar ---

app.post("/api/capsules/:id/contributions", upload.single("photo"), async (req, res) => {
  if (!req.file) throw new HttpError(400, "Fotoğraf gerekli");
  try {
    const result = await withTransaction(async (conn) => {
      // FOR UPDATE: aynı kapsüle eşzamanlı katılımları sıraya sokar (ilk 100 sırası için)
      const [[capsule]] = await conn.query("SELECT * FROM capsules WHERE id = ? FOR UPDATE", [req.params.id]);
      if (!capsule) throw new HttpError(404, "Kapsül bulunamadı");
      if (isRevealed(capsule)) throw new HttpError(409, "Katılım süresi doldu");

      const before = await countParticipants(conn, capsule.id);
      let insert;
      const createdAt = new Date();
      const loc = parseLocation(req.body);
      try {
        [insert] = await conn.query(
          `INSERT INTO contributions (capsule_id, user_id, photo_path, created_at, city, country, lat, lng)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [capsule.id, req.user.id, req.file.filename, createdAt, loc.city, loc.country, loc.lat, loc.lng],
        );
      } catch (e) {
        if (e.code === "ER_DUP_ENTRY") throw new HttpError(409, "Bu kapsüle zaten katıldın");
        throw e;
      }
      const pointsAwarded = await awardForContribution(conn, req.user.id, insert.insertId, before);
      const newAchievements = await awardAchievements(conn, {
        userId: req.user.id,
        contribution: { id: insert.insertId, created_at: createdAt, city: loc.city },
        capsule,
        rank: before + 1,
        startOfMonth: startOfMonthIstanbul(createdAt),
      });
      return { id: insert.insertId, pointsAwarded, newAchievements };
    });
    res.status(201).json({ ...result, photoUrl: photoUrl(req, req.file.filename) });
  } catch (error) {
    fs.rmSync(req.file.path, { force: true }); // başarısız katkının dosyası kalmasın
    throw error;
  }
});

app.delete("/api/contributions/:id", async (req, res) => {
  const photoPath = await withTransaction(async (conn) => {
    const [[row]] = await conn.query(
      `SELECT x.*, c.opens_at FROM contributions x JOIN capsules c ON c.id = x.capsule_id
       WHERE x.id = ? AND x.user_id = ? AND x.deleted_at IS NULL FOR UPDATE`,
      [req.params.id, req.user.id],
    );
    if (!row) throw new HttpError(404, "Katkı bulunamadı");
    if (isRevealed(row)) throw new HttpError(409, "Kapsül açıldıktan sonra katkı silinemez");

    await conn.query("UPDATE contributions SET deleted_at = ? WHERE id = ?", [new Date(), row.id]);
    await revokeForContribution(conn, req.user.id, row.id);
    await revokeAchievements(conn, req.user.id, row.id);
    return row.photo_path;
  });
  fs.rmSync(path.join(UPLOAD_DIR, photoPath), { force: true });
  res.status(204).end();
});

// --- Rozetler ---

app.get("/api/achievements", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT achievement_key, earned_at FROM user_achievements WHERE user_id = ?",
    [req.user.id],
  );
  const earned = new Map(rows.map((r) => [r.achievement_key, r.earned_at]));
  const { badge } = await getEquipped(pool, req.user.id);
  res.json(
    ACHIEVEMENTS.map((a) => ({
      ...a,
      earnedAt: earned.get(a.key) ?? null,
      equipped: badge === a.key,
    })),
  );
});

// Profilde göster/kaldır: sadece kazanılmış rozetler takılabilir
app.post("/api/achievements/:key/equip", async (req, res) => {
  const [[row]] = await pool.query(
    "SELECT 1 FROM user_achievements WHERE user_id = ? AND achievement_key = ?",
    [req.user.id, req.params.key],
  );
  if (!row) throw new HttpError(404, "Bu rozeti henüz kazanmadın");
  const { badge } = await getEquipped(pool, req.user.id);
  const next = badge === req.params.key ? null : req.params.key;
  await pool.query("UPDATE users SET equipped_badge = ? WHERE id = ?", [next, req.user.id]);
  res.json({ badge: next });
});

// --- Moderasyon ---

app.post("/api/contributions/:id/report", async (req, res) => {
  const reason = req.body?.reason;
  if (!["inappropriate", "spam", "other"].includes(reason)) throw new HttpError(400, "Geçersiz bildirim sebebi");

  const hidden = await withTransaction(async (conn) => {
    const [[row]] = await conn.query(
      `SELECT x.*, c.opens_at FROM contributions x JOIN capsules c ON c.id = x.capsule_id
       WHERE x.id = ? AND x.deleted_at IS NULL FOR UPDATE`,
      [req.params.id],
    );
    // Açılmamış kapsülün fotoğrafını kimse göremez, dolayısıyla bildiremez
    if (!row || !isRevealed(row)) throw new HttpError(404, "Fotoğraf bulunamadı");
    if (row.user_id === req.user.id) throw new HttpError(400, "Kendi fotoğrafını bildiremezsin");

    try {
      await conn.query("INSERT INTO reports (contribution_id, reporter_id, reason) VALUES (?, ?, ?)", [
        row.id,
        req.user.id,
        reason,
      ]);
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") throw new HttpError(409, "Bu fotoğrafı zaten bildirdin");
      throw e;
    }

    const [[{ n }]] = await conn.query("SELECT COUNT(*) AS n FROM reports WHERE contribution_id = ?", [row.id]);
    if (n >= Number(process.env.REPORT_HIDE_THRESHOLD ?? 3) && !row.hidden_at) {
      await conn.query("UPDATE contributions SET hidden_at = ? WHERE id = ?", [new Date(), row.id]);
      return true;
    }
    return false;
  });
  res.status(201).json({ hidden });
});

// --- Mağaza ---

// Test için: .env'de SHOP_FREE=true ise her şey ücretsiz
const shopPrice = (price) => (process.env.SHOP_FREE === "true" ? 0 : price);

app.get("/api/shop/items", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.id, s.name, s.type, s.style, s.price, (u.user_id IS NOT NULL) AS owned, COALESCE(u.equipped, 0) AS equipped
     FROM shop_items s LEFT JOIN user_items u ON u.shop_item_id = s.id AND u.user_id = ?
     WHERE s.active = 1
     ORDER BY s.price`,
    [req.user.id],
  );
  res.json(rows.map((r) => ({ ...r, price: shopPrice(r.price), owned: Boolean(r.owned), equipped: Boolean(r.equipped) })));
});

app.post("/api/shop/items/:id/purchase", async (req, res) => {
  await withTransaction(async (conn) => {
    // Kullanıcı satırını kilitle: aynı anda iki satın alma bakiyeyi eksiye düşüremesin
    await conn.query("SELECT id FROM users WHERE id = ? FOR UPDATE", [req.user.id]);
    const [[item]] = await conn.query("SELECT * FROM shop_items WHERE id = ? AND active = 1", [req.params.id]);
    if (!item) throw new HttpError(404, "Ürün bulunamadı");
    const price = shopPrice(item.price);
    if ((await getBalance(conn, req.user.id)) < price) throw new HttpError(409, "Yetersiz puan");
    try {
      await conn.query("INSERT INTO user_items (user_id, shop_item_id) VALUES (?, ?)", [req.user.id, item.id]);
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") throw new HttpError(409, "Bu ürüne zaten sahipsin");
      throw e;
    }
    if (price > 0) {
      await conn.query(
        "INSERT INTO point_transactions (user_id, amount, reason, shop_item_id) VALUES (?, ?, 'purchase', ?)",
        [req.user.id, -price, item.id],
      );
    }
  });
  res.status(201).json({ ok: true });
});

// Tak/çıkar: aynı türden en fazla bir eşya takılı olabilir
app.post("/api/shop/items/:id/equip", async (req, res) => {
  const equipped = await withTransaction(async (conn) => {
    const [[owned]] = await conn.query(
      `SELECT u.equipped, s.type FROM user_items u JOIN shop_items s ON s.id = u.shop_item_id
       WHERE u.user_id = ? AND u.shop_item_id = ? FOR UPDATE`,
      [req.user.id, req.params.id],
    );
    if (!owned) throw new HttpError(404, "Bu eşyaya sahip değilsin");

    if (owned.equipped) {
      await conn.query("UPDATE user_items SET equipped = 0 WHERE user_id = ? AND shop_item_id = ?", [
        req.user.id,
        req.params.id,
      ]);
    } else {
      await conn.query(
        `UPDATE user_items SET equipped = 0 WHERE user_id = ?
         AND shop_item_id IN (SELECT id FROM (SELECT id FROM shop_items WHERE type = ?) t)`,
        [req.user.id, owned.type],
      );
      await conn.query("UPDATE user_items SET equipped = 1 WHERE user_id = ? AND shop_item_id = ?", [
        req.user.id,
        req.params.id,
      ]);
    }
    return getEquipped(conn, req.user.id);
  });
  res.json({ equipped });
});

// --- Hata yakalayıcı: tüm hatalar JSON olarak döner ---

app.use((error, req, res, next) => {
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
  if (error instanceof multer.MulterError) return res.status(400).json({ error: error.message });
  console.error(error);
  res.status(500).json({ error: "Sunucu hatası" });
});

const PORT = Number(process.env.PORT);
app.listen(PORT, "0.0.0.0", (error) => {
  if (error) {
    console.error(`Sunucu başlatılamadı: ${error.message}`);
    process.exit(1);
  }
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});
