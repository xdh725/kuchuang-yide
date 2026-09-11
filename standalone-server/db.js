// SQLite 替代 D1。schema 与 workers/schema.sql 一致。
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const db = new Database(join(__dirname, '..', 'kcyd.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'text', media TEXT,
  body_en TEXT NOT NULL, body_zh TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0, verified_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS golden (
  id INTEGER PRIMARY KEY AUTOINCREMENT, q TEXT NOT NULL,
  expected_kb_id TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en'
);
CREATE TABLE IF NOT EXISTS rebuild_log (
  ts TEXT NOT NULL DEFAULT (datetime('now')),
  entry_count INTEGER NOT NULL, ok INTEGER NOT NULL, detail TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, ts INTEGER NOT NULL
);
`);
