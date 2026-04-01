import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export function initDatabase(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_type TEXT NOT NULL CHECK(word_type IN ('推荐词', '对比词', '舆情词')),
      word_root TEXT NOT NULL,
      word TEXT NOT NULL,
      platform TEXT NOT NULL CHECK(platform IN ('豆包', '千问', 'DeepSeek', '元宝')),
      tier TEXT,
      month TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS monitoring_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword_id INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
      check_date TEXT NOT NULL,
      is_exposed INTEGER,
      favor_zhiji INTEGER,
      sentiment TEXT CHECK(sentiment IN ('正面', '中性', '负面') OR sentiment IS NULL),
      screenshot_code TEXT,
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS relevance_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword_id INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      product_fit INTEGER NOT NULL CHECK(product_fit BETWEEN 1 AND 5),
      natural_rate REAL NOT NULL CHECK(natural_rate BETWEEN 0 AND 100),
      relevance REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_keywords_month ON keywords(month);
    CREATE INDEX IF NOT EXISTS idx_keywords_type_month ON keywords(word_type, month);
    CREATE INDEX IF NOT EXISTS idx_records_keyword ON monitoring_records(keyword_id);
    CREATE INDEX IF NOT EXISTS idx_relevance_month ON relevance_scores(month);
  `);

  return db;
}