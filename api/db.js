import { join } from 'path';
import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';

const dbPath = join(process.cwd(), 'db', 'northwind.db');

// Enable verbose mode for better error logging (optional)
sqlite3.verbose();

export default async function handler(req, res) {
  // CORS headers
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

  // Open database (read‑only)
  const db = new Database(dbPath, sqlite3.OPEN_READONLY);

  // Wrap the query in a Promise because sqlite3 uses callbacks
  const result = await new Promise((resolve, reject) => {
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      db.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve({ type: 'select', rows });
      });
    } else {
      db.run(sql, function(err) {
        if (err) reject(err);
        else resolve({ type: 'exec', changes: this.changes });
      });
    }
  });

  db.close();

  if (result.type === 'select') {
    // Get column names from the first row (if any)
    const columns = result.rows.length > 0 ? Object.keys(result.rows[0]) : [];
    return res.status(200).json({ success: true, columns, rows: result.rows });
  } else {
    return res.status(200).json({ success: true, message: 'SQL executed', changes: result.changes });
  }
}
