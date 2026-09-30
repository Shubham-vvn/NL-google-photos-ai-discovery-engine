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
  if (!fs.existsSync(tmpDbPath)) {
    if (fs.existsSync(defaultDbPath)) {
      try {
        fs.copyFileSync(defaultDbPath, tmpDbPath);
      } catch (err) {
        console.warn('[DB] Could not copy DB to /tmp, will initialize fresh in /tmp:', err.message);
      }
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
  }
  return db;
}

// Initialize on require
const dbInstance = getDb();

module.exports = dbInstance;
module.exports.getDb = getDb;
