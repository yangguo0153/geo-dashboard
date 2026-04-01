import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import Database from "better-sqlite3";
import { initDatabase } from "../server/db/init.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = path.join(__dirname, "../data/test.db");

describe("Database initialization", () => {
  let db;

  beforeAll(() => {
    fs.mkdirSync(path.dirname(TEST_DB_PATH), { recursive: true });
    db = initDatabase(TEST_DB_PATH);
  });

  afterAll(() => {
    db.close();
    fs.unlinkSync(TEST_DB_PATH);
  });

  test("creates keywords table", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='keywords'")
      .get();
    expect(tables).toBeTruthy();
  });

  test("creates monitoring_records table", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='monitoring_records'")
      .get();
    expect(tables).toBeTruthy();
  });

  test("creates relevance_scores table", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='relevance_scores'")
      .get();
    expect(tables).toBeTruthy();
  });

  test("can insert and query a keyword", () => {
    db.prepare(`
      INSERT INTO keywords (word_type, word_root, word, platform, tier, month)
      VALUES ('推荐词', '25-30万新能源SUV', '哪些新能源SUV值得买', '豆包', '一级', '2026-04')
    `).run();

    const row = db.prepare("SELECT * FROM keywords WHERE word_root = '25-30万新能源SUV'").get();
    expect(row.word_type).toBe("推荐词");
    expect(row.platform).toBe("豆包");
  });
});