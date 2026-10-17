import express from "express";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pool, withTransaction } from "./db.js";
import { ensureUpcomingCapsule, isRevealed, photoUrl, countParticipants } from "./capsules.js";
import { getBalance, awardForContribution, revokeForContribution } from "./points.js";

const app = express();
const UPLOAD_DIR = path.resolve("uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

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
    `SELECT s.id, s.name, s.type FROM user_items u JOIN shop_items s ON s.id = u.shop_item_id
     WHERE u.user_id = ? ORDER BY u.purchased_at`,
    [req.user.id],
  );
  res.json({
    displayName: req.user.display_name,
    points: await getBalance(pool, req.user.id),
    items,
  });
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
       (SELECT COUNT(*) FROM contributions x WHERE x.capsule_id = c.id AND x.deleted_at IS NULL) AS participantCount,
       (SELECT x.photo_path FROM contributions x WHERE x.capsule_id = c.id AND x.deleted_at IS NULL
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
    "SELECT id, photo_path FROM contributions WHERE capsule_id = ? AND deleted_at IS NULL ORDER BY created_at",
    [capsule.id],
  );
  res.json({
    capsule: { id: capsule.id, prompt: capsule.prompt, opensAt: capsule.opens_at },
    contributions: rows.map((r) => ({ id: r.id, photoUrl: photoUrl(req, r.photo_path) })),
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
      try {
        [insert] = await conn.query(
          "INSERT INTO contributions (capsule_id, user_id, photo_path, created_at) VALUES (?, ?, ?, ?)",
          [capsule.id, req.user.id, req.file.filename, new Date()],
        );
      } catch (e) {
        if (e.code === "ER_DUP_ENTRY") throw new HttpError(409, "Bu kapsüle zaten katıldın");
        throw e;
      }
      const pointsAwarded = await awardForContribution(conn, req.user.id, insert.insertId, before);
      return { id: insert.insertId, pointsAwarded };
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
    return row.photo_path;
  });
  fs.rmSync(path.join(UPLOAD_DIR, photoPath), { force: true });
  res.status(204).end();
});

// --- Mağaza ---

app.get("/api/shop/items", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.id, s.name, s.type, s.price, (u.user_id IS NOT NULL) AS owned
     FROM shop_items s LEFT JOIN user_items u ON u.shop_item_id = s.id AND u.user_id = ?
     ORDER BY s.price`,
    [req.user.id],
  );
  res.json(rows.map((r) => ({ ...r, owned: Boolean(r.owned) })));
});

app.post("/api/shop/items/:id/purchase", async (req, res) => {
  await withTransaction(async (conn) => {
    // Kullanıcı satırını kilitle: aynı anda iki satın alma bakiyeyi eksiye düşüremesin
    await conn.query("SELECT id FROM users WHERE id = ? FOR UPDATE", [req.user.id]);
    const [[item]] = await conn.query("SELECT * FROM shop_items WHERE id = ?", [req.params.id]);
    if (!item) throw new HttpError(404, "Ürün bulunamadı");
    if ((await getBalance(conn, req.user.id)) < item.price) throw new HttpError(409, "Yetersiz puan");
    try {
      await conn.query("INSERT INTO user_items (user_id, shop_item_id) VALUES (?, ?)", [req.user.id, item.id]);
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") throw new HttpError(409, "Bu ürüne zaten sahipsin");
      throw e;
    }
    await conn.query(
      "INSERT INTO point_transactions (user_id, amount, reason, shop_item_id) VALUES (?, ?, 'purchase', ?)",
      [req.user.id, -item.price, item.id],
    );
  });
  res.status(201).json({ ok: true });
});

// --- Hata yakalayıcı: tüm hatalar JSON olarak döner ---

app.use((error, req, res, next) => {
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
  if (error instanceof multer.MulterError) return res.status(400).json({ error: error.message });
  console.error(error);
  res.status(500).json({ error: "Sunucu hatası" });
});

const PORT = Number(process.env.PORT);
app.listen(PORT, "0.0.0.0", () => console.log(`Sunucu çalışıyor: http://localhost:${PORT}`));
