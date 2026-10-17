export async function getBalance(conn, userId) {
  const [rows] = await conn.query(
    "SELECT COALESCE(SUM(amount), 0) AS balance FROM point_transactions WHERE user_id = ?",
    [userId],
  );
  return Number(rows[0].balance);
}

// Katkı için puan verir. activeCountBefore: bu katkıdan önceki geçerli katkı sayısı.
export async function awardForContribution(conn, userId, contributionId, activeCountBefore) {
  const awards = [{ amount: Number(process.env.PARTICIPATION_POINTS), reason: "participation" }];
  if (activeCountBefore < Number(process.env.EARLY_BONUS_LIMIT)) {
    awards.push({ amount: Number(process.env.EARLY_BONUS_POINTS), reason: "early_bonus" });
  }
  for (const a of awards) {
    await conn.query(
      "INSERT INTO point_transactions (user_id, amount, reason, contribution_id) VALUES (?, ?, ?, ?)",
      [userId, a.amount, a.reason, contributionId],
    );
  }
  return awards.reduce((sum, a) => sum + a.amount, 0);
}

// Silinen katkının verdiği tüm puanları ters kayıtla geri alır.
export async function revokeForContribution(conn, userId, contributionId) {
  const [rows] = await conn.query(
    "SELECT amount, reason FROM point_transactions WHERE contribution_id = ? AND reason IN ('participation', 'early_bonus')",
    [contributionId],
  );
  for (const r of rows) {
    await conn.query(
      "INSERT INTO point_transactions (user_id, amount, reason, contribution_id) VALUES (?, ?, ?, ?)",
      [userId, -r.amount, `revoke_${r.reason}`, contributionId],
    );
  }
}
