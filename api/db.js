// Use the self‑contained version (WASM embedded as base64)
import initSqlJs from 'sql.js/dist/sql-wasm.js';
import fs from 'fs';
import path from 'path';

let db = null;

async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  const dbPath = path.join(process.cwd(), 'db', 'northwind.db');
  const fileBuffer = fs.readFileSync(dbPath);
  db = new SQL.Database(new Uint8Array(fileBuffer));
  return db;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-API-Key, Authorization, Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth
  const authHeader = req.headers['x-api-key'] || req.headers['authorization'];
  if (authHeader !== process.env.API_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { sql } = req.query;
  if (!sql) {
    return res.status(400).json({ error: 'Missing ?sql parameter' });
  }

  try {
    const database = await getDb();
    const result = database.exec(sql);
    if (result.length === 0) {
      return res.status(200).json({ success: true, columns: [], rows: [] });
    }
    const { columns, values } = result[0];
    const rows = values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => { obj[col] = row[idx]; });
      return obj;
    });
    res.status(200).json({ success: true, columns, rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
