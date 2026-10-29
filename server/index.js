import express from "express";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pool, withTransaction } from "./db.js";
import { ensureUpcomingCapsule, isRevealed, photoUrl, countParticipants } from "./capsules.js";
import { getBalance, awardForContribution, revokeForContribution } from "./points.js";
import { ACHIEVEMENTS, awardAchievements, revokeAchievements, findAchievement } from "./achievements.js";
import { isBlocked, areConnected, listConnections } from "./social.js";

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
    reacted: Boolean(r.reacted),
    userId: r.user_id,
    displayName: r.display_name,
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
    id: req.user.id,
    displayName: req.user.display_name,
    bio: req.user.bio,
    points: await getBalance(pool, req.user.id),
    items: items.map((i) => ({ ...i, equipped: Boolean(i.equipped) })),
    equipped: await getEquipped(pool, req.user.id),
    badge: findAchievement((await getEquipped(pool, req.user.id)).badge),
    stats: { total: Number(stats.total), thisMonth: Number(stats.thisMonth) },
  });
});

app.patch("/api/me", async (req, res) => {
  if (req.body?.bio !== undefined) {
    const bio = String(req.body.bio).trim().slice(0, 160);
    await pool.query("UPDATE users SET bio = ? WHERE id = ?", [bio || null, req.user.id]);
    if (req.body.displayName === undefined) return res.json({ bio: bio || null });
  }
  const name = String(req.body?.displayName ?? "").trim();
  // 2-24 karakter: harf (Türkçe dahil), rakam, boşluk, nokta, alt çizgi, tire
  if (!/^[\p{L}\p{N} ._-]{2,24}$/u.test(name)) {
    throw new HttpError(400, "Ad 2-24 karakter olmalı; harf, rakam, boşluk, . _ - kullanılabilir");
  }
  await pool.query("UPDATE users SET display_name = ? WHERE id = ?", [name, req.user.id]);
  res.json({ displayName: name });
});

app.get("/api/me/contributions", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT x.id, x.photo_path, x.city, x.country, x.hidden_at, c.id AS capsule_id, c.prompt, c.opens_at,
       (SELECT COUNT(*) FROM reactions r WHERE r.contribution_id = x.id) AS reaction_count
     FROM contributions x JOIN capsules c ON c.id = x.capsule_id
     WHERE x.user_id = ? AND x.deleted_at IS NULL
     ORDER BY c.opens_at DESC LIMIT 200`,
    [req.user.id],
  );
  res.json(
    rows.map((r) => ({
      id: r.id,
      photoUrl: photoUrl(req, r.photo_path),
      city: r.city,
      country: r.country,
      capsuleId: r.capsule_id,
      prompt: r.prompt,
      opensAt: r.opens_at,
      revealed: isRevealed(r),
      hidden: r.hidden_at !== null,
      reactionCount: Number(r.reaction_count),
    })),
  );
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
    `SELECT x.id, x.user_id, owner.display_name, x.photo_path, x.city, x.country, x.lat, x.lng, s.style AS border_style,
       EXISTS (SELECT 1 FROM reactions r WHERE r.contribution_id = x.id AND r.user_id = ?) AS reacted
     FROM contributions x
     JOIN users owner ON owner.id = x.user_id
     LEFT JOIN user_items u ON u.user_id = x.user_id AND u.equipped = 1
       AND u.shop_item_id IN (SELECT id FROM shop_items WHERE type = 'border')
     LEFT JOIN shop_items s ON s.id = u.shop_item_id
     WHERE x.capsule_id = ? AND x.deleted_at IS NULL AND x.hidden_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = ? AND b.blocked_id = x.user_id)
                                              OR (b.blocker_id = x.user_id AND b.blocked_id = ?))
     ORDER BY x.created_at`,
    [req.user.id, capsule.id, req.user.id, req.user.id],
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

// --- Tepkiler ---

app.post("/api/contributions/:id/react", async (req, res) => {
  const [[row]] = await pool.query(
    `SELECT x.user_id, c.opens_at FROM contributions x JOIN capsules c ON c.id = x.capsule_id
     WHERE x.id = ? AND x.deleted_at IS NULL AND x.hidden_at IS NULL`,
    [req.params.id],
  );
  if (!row || !isRevealed(row)) throw new HttpError(404, "Fotoğraf bulunamadı");
  if (row.user_id === req.user.id) throw new HttpError(400, "Kendi fotoğrafına tepki veremezsin");
  if (await isBlocked(pool, req.user.id, row.user_id)) throw new HttpError(404, "Fotoğraf bulunamadı");

  // Varsa kaldır, yoksa ekle (aç/kapa)
  const [del] = await pool.query("DELETE FROM reactions WHERE contribution_id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  const reacted = del.affectedRows === 0;
  let newConnection = null;
  if (reacted) {
    const wasConnected = await areConnected(pool, req.user.id, row.user_id);
    await pool.query("INSERT INTO reactions (contribution_id, user_id) VALUES (?, ?)", [req.params.id, req.user.id]);
    if (!wasConnected && (await areConnected(pool, req.user.id, row.user_id))) {
      const [[other]] = await pool.query("SELECT id, display_name FROM users WHERE id = ?", [row.user_id]);
      newConnection = { userId: other.id, displayName: other.display_name };
    }
  }
  res.json({ reacted, newConnection });
});

// --- Profiller (an pasaportu) ---

app.get("/api/users/:id/profile", async (req, res) => {
  const userId = Number(req.params.id);
  const [[user]] = await pool.query("SELECT id, display_name, bio FROM users WHERE id = ?", [userId]);
  if (!user || (await isBlocked(pool, req.user.id, userId))) throw new HttpError(404, "Profil bulunamadı");

  // Sadece açılmış ve gizlenmemiş anlar: kapsül kuralı profilde de geçerli
  const [moments] = await pool.query(
    `SELECT x.id, x.photo_path, x.city, x.country, x.lat, x.lng, c.id AS capsule_id, c.prompt, c.opens_at
     FROM contributions x JOIN capsules c ON c.id = x.capsule_id
     WHERE x.user_id = ? AND x.deleted_at IS NULL AND x.hidden_at IS NULL AND c.opens_at <= UTC_TIMESTAMP()
     ORDER BY c.opens_at DESC LIMIT 60`,
    [userId],
  );
  const equipped = await getEquipped(pool, userId);
  const [[{ achievements }]] = await pool.query(
    "SELECT COUNT(*) AS achievements FROM user_achievements WHERE user_id = ?",
    [userId],
  );
  res.json({
    id: user.id,
    displayName: user.display_name,
    bio: user.bio,
    badge: findAchievement(equipped.badge),
    frame: equipped.frame,
    isMe: userId === req.user.id,
    connected: await areConnected(pool, req.user.id, userId),
    stats: {
      moments: moments.length,
      cities: new Set(moments.map((m) => m.city).filter(Boolean)).size,
      countries: new Set(moments.map((m) => m.country).filter(Boolean)).size,
      achievements: Number(achievements),
    },
    moments: moments.map((m) => ({
      id: m.id,
      photoUrl: photoUrl(req, m.photo_path),
      city: m.city,
      country: m.country,
      lat: m.lat === null ? null : Number(m.lat),
      lng: m.lng === null ? null : Number(m.lng),
      capsuleId: m.capsule_id,
      prompt: m.prompt,
      opensAt: m.opens_at,
    })),
  });
});

app.post("/api/users/:id/block", async (req, res) => {
  const userId = Number(req.params.id);
  if (userId === req.user.id) throw new HttpError(400, "Kendini engelleyemezsin");
  await pool.query("INSERT IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)", [req.user.id, userId]);
  res.status(201).json({ blocked: true });
});

app.post("/api/users/:id/report", async (req, res) => {
  const reason = req.body?.reason;
  if (!["harassment", "spam", "inappropriate", "other"].includes(reason)) throw new HttpError(400, "Geçersiz sebep");
  await pool.query("INSERT INTO user_reports (reporter_id, reported_id, reason) VALUES (?, ?, ?)", [
    req.user.id,
    Number(req.params.id),
    reason,
  ]);
  res.status(201).json({ ok: true });
});

// --- Mesajlar (sadece paralel bağlantılar arasında) ---

app.get("/api/conversations", async (req, res) => {
  const ids = await listConnections(pool, req.user.id);
  if (ids.length === 0) return res.json([]);
  const [rows] = await pool.query(
    `SELECT u.id, u.display_name,
       (SELECT m.body FROM messages m
        WHERE (m.sender_id = u.id AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = u.id)
        ORDER BY m.id DESC LIMIT 1) AS last_body,
       (SELECT m.created_at FROM messages m
        WHERE (m.sender_id = u.id AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = u.id)
        ORDER BY m.id DESC LIMIT 1) AS last_at,
       (SELECT COUNT(*) FROM messages m WHERE m.sender_id = u.id AND m.recipient_id = ? AND m.read_at IS NULL) AS unread
     FROM users u WHERE u.id IN (?)
     ORDER BY last_at IS NULL, last_at DESC`,
    [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, ids],
  );
  res.json(
    rows.map((r) => ({
      userId: r.id,
      displayName: r.display_name,
      lastMessage: r.last_body,
      lastAt: r.last_at,
      unread: Number(r.unread),
    })),
  );
});

app.get("/api/messages/:userId", async (req, res) => {
  const other = Number(req.params.userId);
  if (!(await areConnected(pool, req.user.id, other))) throw new HttpError(403, "Bu kişiyle henüz paralel bağlantın yok");
  const [rows] = await pool.query(
    `SELECT id, sender_id, body, created_at FROM messages
     WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
     ORDER BY id DESC LIMIT 100`,
    [req.user.id, other, other, req.user.id],
  );
  await pool.query("UPDATE messages SET read_at = ? WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL", [
    new Date(),
    other,
    req.user.id,
  ]);
  res.json(rows.map((m) => ({ id: m.id, mine: m.sender_id === req.user.id, body: m.body, createdAt: m.created_at })));
});

app.post("/api/messages/:userId", async (req, res) => {
  const other = Number(req.params.userId);
  const body = String(req.body?.body ?? "").trim();
  if (body.length === 0 || body.length > 1000) throw new HttpError(400, "Mesaj 1-1000 karakter olmalı");
  if (!(await areConnected(pool, req.user.id, other))) throw new HttpError(403, "Bu kişiyle henüz paralel bağlantın yok");

  // Basit spam koruması: dakikada en fazla 20 mesaj
  const [[{ recent }]] = await pool.query(
    "SELECT COUNT(*) AS recent FROM messages WHERE sender_id = ? AND created_at > ?",
    [req.user.id, new Date(Date.now() - 60_000)],
  );
  if (recent >= 20) throw new HttpError(429, "Biraz yavaşla: dakikada en fazla 20 mesaj");

  const createdAt = new Date();
  const [result] = await pool.query(
    "INSERT INTO messages (sender_id, recipient_id, body, created_at) VALUES (?, ?, ?, ?)",
    [req.user.id, other, body, createdAt],
  );
  res.status(201).json({ id: result.insertId, mine: true, body, createdAt });
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
