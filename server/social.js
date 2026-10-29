// Paralel bağlantı, engelleme ve mesajlaşma kuralları.

// Biri diğerini engellediyse true (yön fark etmez)
export async function isBlocked(conn, a, b) {
  const [rows] = await conn.query(
    "SELECT 1 FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1",
    [a, b, b, a],
  );
  return rows.length > 0;
}

// Paralel bağlantı: aynı kapsülde A, B'nin fotoğrafına; B de A'nın fotoğrafına ✦ verdiyse.
export async function areConnected(conn, a, b) {
  if (a === b) return false;
  const [rows] = await conn.query(
    `SELECT 1
     FROM reactions ra
     JOIN contributions ca ON ca.id = ra.contribution_id AND ca.user_id = ? AND ca.deleted_at IS NULL
     JOIN contributions cb ON cb.capsule_id = ca.capsule_id AND cb.user_id = ? AND cb.deleted_at IS NULL
     JOIN reactions rb ON rb.contribution_id = cb.id AND rb.user_id = ?
     WHERE ra.user_id = ?
     LIMIT 1`,
    [b, a, b, a],
  );
  return rows.length > 0 && !(await isBlocked(conn, a, b));
}

// Kullanıcının tüm paralel bağlantıları (sohbet listesi için)
export async function listConnections(conn, userId) {
  const [rows] = await conn.query(
    `SELECT DISTINCT cb.user_id AS other_id
     FROM reactions ra
     JOIN contributions cb ON cb.id = ra.contribution_id AND cb.deleted_at IS NULL
     JOIN contributions ca ON ca.capsule_id = cb.capsule_id AND ca.user_id = ? AND ca.deleted_at IS NULL
     JOIN reactions rb ON rb.contribution_id = ca.id AND rb.user_id = cb.user_id
     WHERE ra.user_id = ? AND cb.user_id <> ?
       AND NOT EXISTS (SELECT 1 FROM blocks b
                       WHERE (b.blocker_id = ? AND b.blocked_id = cb.user_id)
                          OR (b.blocker_id = cb.user_id AND b.blocked_id = ?))`,
    [userId, userId, userId, userId, userId],
  );
  return rows.map((r) => r.other_id);
}
