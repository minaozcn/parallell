// Şemayı kurar ve bekleyen migration'ları sırayla uygular: npm run db:setup
// Tekrar tekrar çalıştırmak güvenlidir: uygulanmış migration'lar atlanır.
import fs from "node:fs";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true,
});

await conn.query(fs.readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));

await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
  name VARCHAR(255) PRIMARY KEY,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
const [done] = await conn.query("SELECT name FROM schema_migrations");
const applied = new Set(done.map((r) => r.name));

const dir = new URL("./migrations/", import.meta.url);
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  if (applied.has(file)) continue;
  await conn.query(fs.readFileSync(new URL(file, dir), "utf8"));
  await conn.query("INSERT INTO schema_migrations (name) VALUES (?)", [file]);
  console.log(`Migration uygulandı: ${file}`);
}

await conn.end();
console.log("Veritabanı hazır.");
