-- D1 schema：知识库后台
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,            -- KB-MD-001（溯源标签）
  title TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '',  -- 逗号分隔
  type TEXT NOT NULL DEFAULT 'text',  -- text | spec-sheet | image | video
  media TEXT,                     -- R2 路径（可空）
  body_en TEXT NOT NULL,
  body_zh TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  verified_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS golden (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  q TEXT NOT NULL,
  expected_kb_id TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS rebuild_log (
  ts TEXT NOT NULL DEFAULT (datetime('now')),
  entry_count INTEGER NOT NULL,
  ok INTEGER NOT NULL,
  detail TEXT
);
