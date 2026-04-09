import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db = null;

function getDb() {
  if (db) return db;
  const dbPath = path.join(process.cwd(), 'db', 'northwind.db');
  // Ensure the file exists
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found at ${dbPath}`);
  }
  db = new Database(dbPath, { readonly: true });
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
    const database = getDb();
    // For SELECT queries, return rows with column names
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const stmt = database.prepare(sql);
      const rows = stmt.all();
      const columns = stmt.columns().map(col => col.name);
      return res.status(200).json({ success: true, columns, rows });
    } else {
      // For non-SELECT (INSERT, UPDATE, DELETE, CREATE)
      const result = database.exec(sql);
      return res.status(200).json({ success: true, message: 'SQL executed', changes: result.changes });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
