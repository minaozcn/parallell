// Şemayı kurar: npm run db:setup
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
await conn.end();
console.log("Veritabanı hazır.");
