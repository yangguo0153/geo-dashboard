import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import request from "supertest";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { initDatabase } from "../server/db/init.js";
import { parseUploadedXlsx } from "../server/services/xlsxParser.js";
import uploadRouter from "../server/routes/upload.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = path.join(__dirname, "fixtures/test-api.db");
const FIXTURE_PATH = path.join(__dirname, "fixtures/test-upload-api.xlsx");

let app;
let db;

// Generate a test xlsx file before running tests
beforeAll(() => {
  fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });

  const wb = XLSX.utils.book_new();

  // Sheet 1: 推荐词 with relevance data
  const recommendData = [
    ["词根", "具体问句", "平台", "检测日期", "是否露出", "截图编码", "备注"],
    ["25-30万新能源SUV", "哪些新能源SUV值得买", "豆包", "2026-04-01", "是", "TJ-001", ""],
    ["25-30万新能源SUV", "新能源SUV推荐", "豆包", "2026-04-01", "否", "TJ-002", ""],
    ["25-30万新能源SUV", "哪些新能源SUV值得买", "DeepSeek", "2026-04-01", "是", "TJ-003", ""],
    [], // blank row
    ["关联度评测"],
    ["词根", "平台", "产品适配度", "AI自然呈现率", "关联度", "词包级别"],
    ["25-30万新能源SUV", "豆包", 4, 15, 28, "一级"],
    ["25-30万新能源SUV", "DeepSeek", 5, 30, 44, "二级"],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(recommendData);
  XLSX.utils.book_append_sheet(wb, ws1, "推荐词");

  // Sheet 2: 对比词
  const compareData = [
    ["词根", "具体问句", "平台", "检测日期", "偏向智己", "词包级别", "截图编码", "备注"],
    ["智己LS8比理想L8更值得买", "智己LS8和理想L8哪款更值得买", "豆包", "2026-04-01", "是", "一级", "DB-001", ""],
    ["智己LS8比理想L8更值得买", "LS8和L8怎么选", "豆包", "2026-04-01", "否", "一级", "DB-002", ""],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(compareData);
  XLSX.utils.book_append_sheet(wb, ws2, "对比词");

  // Sheet 3: 舆情词
  const sentimentData = [
    ["词根", "具体问句", "平台", "检测日期", "判定结果", "词包类型", "截图编码", "备注"],
    ["智己LS8", "智己LS8这车怎么样", "千问", "2026-04-01", "正面", "一级车型", "YQ-001", ""],
    ["智己LS8", "智己LS8好不好", "千问", "2026-04-01", "中性", "一级车型", "YQ-002", ""],
    ["智己LS8", "智己LS8值得买吗", "千问", "2026-04-01", "负面", "一级车型", "YQ-003", ""],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(sentimentData);
  XLSX.utils.book_append_sheet(wb, ws3, "舆情词");

  XLSX.writeFile(wb, FIXTURE_PATH);
});

// Clean up after all tests
afterAll(() => {
  if (fs.existsSync(FIXTURE_PATH)) {
    fs.unlinkSync(FIXTURE_PATH);
  }
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  // Remove WAL files
  const walPath = TEST_DB_PATH + "-wal";
  const shmPath = TEST_DB_PATH + "-shm";
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
});

// Setup app and database before each test
beforeEach(() => {
  // Set auth tokens for tests
  process.env.ADMIN_TOKEN = "admin-change-me";
  process.env.VIEW_TOKEN = "view-change-me";

  // Clean up existing database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  const walPath = TEST_DB_PATH + "-wal";
  const shmPath = TEST_DB_PATH + "-shm";
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

  db = initDatabase(TEST_DB_PATH);

  app = express();
  app.locals.db = db;
  app.use(cors());
  app.use(express.json());

  // Register upload router
  app.use("/api/upload", uploadRouter(db));
});

describe("POST /api/upload", () => {
  const ADMIN_TOKEN = "admin-change-me";
  const VIEW_TOKEN = "view-change-me";

  test("rejects upload without token", async () => {
    const response = await request(app)
      .post("/api/upload")
      .attach("file", FIXTURE_PATH);

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/token/i);
  });

  test("rejects upload with viewer token", async () => {
    const response = await request(app)
      .post("/api/upload")
      .set("X-Auth-Token", VIEW_TOKEN)
      .attach("file", FIXTURE_PATH);

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/admin/i);
  });

  test("rejects upload without file", async () => {
    const response = await request(app)
      .post("/api/upload")
      .set("X-Auth-Token", ADMIN_TOKEN);

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/file/i);
  });

  test("accepts valid upload with admin token", async () => {
    const response = await request(app)
      .post("/api/upload")
      .set("X-Auth-Token", ADMIN_TOKEN)
      .attach("file", FIXTURE_PATH);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.month).toBe("2026-04");
    expect(response.body.counts).toBeDefined();
    expect(response.body.counts.recommend).toBe(3);
    expect(response.body.counts.compare).toBe(2);
    expect(response.body.counts.sentiment).toBe(3);
  });

  test("persists keywords to database", async () => {
    await request(app)
      .post("/api/upload")
      .set("X-Auth-Token", ADMIN_TOKEN)
      .attach("file", FIXTURE_PATH);

    const keywords = db.prepare("SELECT * FROM keywords WHERE month = ?").all("2026-04");
    expect(keywords.length).toBe(8); // 3 recommend + 2 compare + 3 sentiment

    // Check recommend keyword
    const recommendKeyword = keywords.find(
      (k) => k.word_type === "推荐词" && k.word === "哪些新能源SUV值得买" && k.platform === "豆包"
    );
    expect(recommendKeyword).toBeDefined();
    expect(recommendKeyword.word_root).toBe("25-30万新能源SUV");
  });

  test("persists monitoring records", async () => {
    await request(app)
      .post("/api/upload")
      .set("X-Auth-Token", ADMIN_TOKEN)
      .attach("file", FIXTURE_PATH);

    const records = db
      .prepare(
        `SELECT mr.*, k.word_type, k.word, k.platform
         FROM monitoring_records mr
         JOIN keywords k ON mr.keyword_id = k.id
         WHERE k.month = ?`
      )
      .all("2026-04");

    expect(records.length).toBe(8);

    // Check recommend record with is_exposed
    const exposedRecord = records.find((r) => r.word === "哪些新能源SUV值得买" && r.platform === "豆包");
    expect(exposedRecord).toBeDefined();
    expect(exposedRecord.is_exposed).toBe(1);
    expect(exposedRecord.screenshot_code).toBe("TJ-001");

    // Check compare record with favor_zhiji
    const compareRecord = records.find((r) => r.word === "智己LS8和理想L8哪款更值得买");
    expect(compareRecord).toBeDefined();
    expect(compareRecord.favor_zhiji).toBe(1);

    // Check sentiment record
    const sentimentRecord = records.find((r) => r.word === "智己LS8这车怎么样");
    expect(sentimentRecord).toBeDefined();
    expect(sentimentRecord.sentiment).toBe("正面");
  });

  test("persists relevance scores for recommend keywords", async () => {
    await request(app)
      .post("/api/upload")
      .set("X-Auth-Token", ADMIN_TOKEN)
      .attach("file", FIXTURE_PATH);

    const relevanceScores = db
      .prepare(
        `SELECT rs.*, k.word_root, k.platform
         FROM relevance_scores rs
         JOIN keywords k ON rs.keyword_id = k.id
         WHERE k.month = ?`
      )
      .all("2026-04");

    expect(relevanceScores.length).toBe(2);

    // Check relevance data
    const doubaoRelevance = relevanceScores.find((r) => r.platform === "豆包");
    expect(doubaoRelevance).toBeDefined();
    expect(doubaoRelevance.product_fit).toBe(4);
    expect(doubaoRelevance.natural_rate).toBe(15);
    // Relevance = (4/5 * 100) * 0.2 + 15 * 0.8 = 16 + 12 = 28
    expect(doubaoRelevance.relevance).toBeCloseTo(28, 1);
  });

  test("clears existing data for the same month before inserting", async () => {
    // First upload
    await request(app)
      .post("/api/upload")
      .set("X-Auth-Token", ADMIN_TOKEN)
      .attach("file", FIXTURE_PATH);

    const keywordsAfterFirst = db.prepare("SELECT * FROM keywords WHERE month = ?").all("2026-04");
    expect(keywordsAfterFirst.length).toBe(8);

    // Second upload (should replace data)
    await request(app)
      .post("/api/upload")
      .set("X-Auth-Token", ADMIN_TOKEN)
      .attach("file", FIXTURE_PATH);

    const keywordsAfterSecond = db.prepare("SELECT * FROM keywords WHERE month = ?").all("2026-04");
    expect(keywordsAfterSecond.length).toBe(8); // Should still be 8, not 16
  });

  test("extracts month from check_date field", async () => {
    const response = await request(app)
      .post("/api/upload")
      .set("X-Auth-Token", ADMIN_TOKEN)
      .attach("file", FIXTURE_PATH);

    expect(response.body.month).toBe("2026-04");
  });

  test("returns 400 for invalid file type", async () => {
    // Create a non-xlsx file
    const invalidPath = path.join(__dirname, "fixtures/invalid.txt");
    fs.writeFileSync(invalidPath, "not an xlsx file");

    const response = await request(app)
      .post("/api/upload")
      .set("X-Auth-Token", ADMIN_TOKEN)
      .attach("file", invalidPath);

    expect(response.status).toBe(400);

    fs.unlinkSync(invalidPath);
  });
});