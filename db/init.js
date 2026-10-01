const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', 'data');
const defaultDbPath = process.env.EVIDENCE_DB_PATH 
  ? path.resolve(__dirname, '..', process.env.EVIDENCE_DB_PATH)
  : path.join(DB_DIR, 'evidence.db');

// Support Vercel serverless functions where /var/task is read-only
let DB_PATH = defaultDbPath;
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const tmpDbPath = path.join('/tmp', 'evidence.db');
  let needsCopy = !fs.existsSync(tmpDbPath);
  if (!needsCopy && fs.existsSync(defaultDbPath)) {
    try {
      const srcStat = fs.statSync(defaultDbPath);
      const dstStat = fs.statSync(tmpDbPath);
      if (srcStat.size !== dstStat.size || srcStat.mtimeMs > dstStat.mtimeMs) {
        needsCopy = true;
      }
    } catch {
      needsCopy = true;
    }
  }

  if (needsCopy && fs.existsSync(defaultDbPath)) {
    try {
      fs.copyFileSync(defaultDbPath, tmpDbPath);
    } catch (err) {
      console.warn('[DB] Could not copy DB to /tmp, will initialize fresh in /tmp:', err.message);
    }
  }
  DB_PATH = tmpDbPath;
}

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Ensure database directory exists
const targetDir = path.dirname(DB_PATH);
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

let db = null;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Run schema migrations/creation
    if (fs.existsSync(SCHEMA_PATH)) {
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      db.exec(schema);
    }

    // Auto-sync with nodes.json if DB has fewer records than backup
    const nodesPath = path.join(__dirname, '..', 'data', 'processed', 'nodes.json');
    if (fs.existsSync(nodesPath)) {
      try {
        const nodes = JSON.parse(fs.readFileSync(nodesPath, 'utf-8'));
        const row = db.prepare('SELECT COUNT(*) as count FROM evidence_nodes').get();
        if (!row || row.count < nodes.length) {
          console.log(`[DB] Auto-syncing database (${row ? row.count : 0} nodes) with nodes.json (${nodes.length} nodes)...`);
          const seed = require('./seed');
          if (typeof seed === 'function') {
            seed();
          }
        }
      } catch (err) {
        console.warn('[DB] Auto-sync check warning:', err.message);
      }
    }
  }
  return db;
}

// Initialize on require
const dbInstance = getDb();

module.exports = dbInstance;
module.exports.getDb = getDb;
