import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db = null;

function getDb() {
  if (db) return db;
  const dbPath = path.join(process.cwd(), 'db', 'northwind.db');
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database not found at ${dbPath}`);
  }
  db = new Database(dbPath, { readonly: true });
  return db;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-API-Key, Authorization, Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers['x-api-key'] || req.headers['authorization'];
  if (authHeader !== process.env.API_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { sql } = req.query;
  if (!sql) return res.status(400).json({ error: 'Missing ?sql' });

  try {
    const db = getDb();
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const stmt = db.prepare(sql);
      const rows = stmt.all();
      const columns = stmt.columns().map(c => c.name);
      return res.status(200).json({ success: true, columns, rows });
    } else {
      const info = db.exec(sql);
      return res.status(200).json({ success: true, message: 'Executed', changes: info.changes });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
