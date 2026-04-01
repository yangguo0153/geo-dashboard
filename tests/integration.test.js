import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import request from "supertest";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { initDatabase } from "../server/db/init.js";
import { requireAuth } from "../server/middleware/auth.js";
import uploadRouter from "../server/routes/upload.js";
import createOverviewRouter from "../server/routes/overview.js";
import createKeywordsRouter from "../server/routes/keywords.js";
import createSettlementRouter from "../server/routes/settlement.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = path.join(__dirname, "fixtures/test-integration.db");
const FIXTURE_PATH = path.join(__dirname, "fixtures/test-upload.xlsx");

let app;
let db;

const ADMIN_TOKEN = "admin-change-me";
const VIEW_TOKEN = "view-change-me";

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
    ["智己LS8比理想L8更值得买", "智己LS8对比理想L8", "千问", "2026-04-01", "是", "一级", "DB-003", ""],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(compareData);
  XLSX.utils.book_append_sheet(wb, ws2, "对比词");

  // Sheet 3: 舆情词
  const sentimentData = [
    ["词根", "具体问句", "平台", "检测日期", "判定结果", "词包类型", "截图编码", "备注"],
    ["智己LS8", "智己LS8这车怎么样", "千问", "2026-04-01", "正面", "一级车型", "YQ-001", ""],
    ["智己LS8", "智己LS8好不好", "千问", "2026-04-01", "中性", "一级车型", "YQ-002", ""],
    ["智己LS8", "智己LS8值得买吗", "千问", "2026-04-01", "负面", "一级车型", "YQ-003", ""],
    ["智己汽车", "智己汽车品牌怎么样", "豆包", "2026-04-01", "正面", "品牌技术", "YQ-004", ""],
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
  process.env.ADMIN_TOKEN = ADMIN_TOKEN;
  process.env.VIEW_TOKEN = VIEW_TOKEN;

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

  // Upload route
  app.use("/api/upload", uploadRouter(db));

  // API routes with auth
  const apiRouter = express.Router();
  apiRouter.use(requireAuth);

  // Overview route
  const overviewRouter = createOverviewRouter(db);
  apiRouter.get("/overview", (req, res) => {
    const handler = overviewRouter.get("GET /");
    return handler(req, res);
  });

  // Keywords routes
  const keywordsRouter = createKeywordsRouter(db);
  apiRouter.get("/keywords/recommend", (req, res) => {
    const handler = keywordsRouter.get("GET /recommend");
    return handler(req, res);
  });
  apiRouter.get("/keywords/compare", (req, res) => {
    const handler = keywordsRouter.get("GET /compare");
    return handler(req, res);
  });
  apiRouter.get("/keywords/sentiment", (req, res) => {
    const handler = keywordsRouter.get("GET /sentiment");
    return handler(req, res);
  });

  // Settlement route
  const settlementRouter = createSettlementRouter(db);
  apiRouter.get("/settlement", (req, res) => {
    const handler = settlementRouter.get("GET /");
    return handler(req, res);
  });

  app.use("/api", apiRouter);
});

describe("End-to-End Integration Tests", () => {
  describe("Upload flow", () => {
    test("upload xlsx with admin token -> data persisted", async () => {
      const response = await request(app)
        .post("/api/upload")
        .set("X-Auth-Token", ADMIN_TOKEN)
        .attach("file", FIXTURE_PATH);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.month).toBe("2026-04");
      expect(response.body.counts.recommend).toBe(3);
      expect(response.body.counts.compare).toBe(3);
      expect(response.body.counts.sentiment).toBe(4);

      // Verify data persisted
      const keywords = db.prepare("SELECT * FROM keywords WHERE month = '2026-04'").all();
      expect(keywords.length).toBe(10); // 3 recommend + 3 compare + 4 sentiment
    });

    test("viewer token cannot upload", async () => {
      const response = await request(app)
        .post("/api/upload")
        .set("X-Auth-Token", VIEW_TOKEN)
        .attach("file", FIXTURE_PATH);

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/admin/i);
    });
  });

  describe("Query flow - after upload", () => {
    beforeEach(async () => {
      // Upload data first for each query test
      await request(app)
        .post("/api/upload")
        .set("X-Auth-Token", ADMIN_TOKEN)
        .attach("file", FIXTURE_PATH);
    });

    describe("GET /api/overview", () => {
      test("returns KPIs with admin token", async () => {
        const response = await request(app)
          .get("/api/overview?month=2026-04")
          .set("X-Auth-Token", ADMIN_TOKEN);

        expect(response.status).toBe(200);
        expect(response.body.month).toBe("2026-04");
        expect(response.body.summary).toBeDefined();
        expect(response.body.summary.totalKeywords).toBe(10);
        expect(response.body.summary.recommend).toBeDefined();
        expect(response.body.summary.recommend.total).toBe(3);
        expect(response.body.summary.compare).toBeDefined();
        expect(response.body.summary.sentiment).toBeDefined();
        expect(response.body.platformStats).toBeDefined();
        expect(response.body.platformStats.length).toBeGreaterThan(0);
      });

      test("viewer token can query overview", async () => {
        const response = await request(app)
          .get("/api/overview?month=2026-04")
          .set("X-Auth-Token", VIEW_TOKEN);

        expect(response.status).toBe(200);
        expect(response.body.summary).toBeDefined();
      });

      test("rejects invalid month format", async () => {
        const response = await request(app)
          .get("/api/overview?month=invalid")
          .set("X-Auth-Token", ADMIN_TOKEN);

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/month/i);
      });

      test("requires auth token", async () => {
        const response = await request(app)
          .get("/api/overview?month=2026-04");

        expect(response.status).toBe(401);
      });
    });

    describe("GET /api/keywords/recommend", () => {
      test("returns detail + relevance with admin token", async () => {
        const response = await request(app)
          .get("/api/keywords/recommend?month=2026-04")
          .set("X-Auth-Token", ADMIN_TOKEN);

        expect(response.status).toBe(200);
        expect(response.body.month).toBe("2026-04");
        expect(response.body.detail).toBeDefined();
        expect(response.body.detail.length).toBe(3);
        expect(response.body.relevanceCards).toBeDefined();
        expect(response.body.settlementSummary).toBeDefined();

        // Check first detail item structure (flat list)
        const detailItem = response.body.detail[0];
        expect(detailItem.word_root).toBe("25-30万新能源SUV");
        expect(detailItem.platform).toBeDefined();
        expect(detailItem.check_date).toBeDefined();
        expect(detailItem.is_exposed).toBeDefined();
        expect(detailItem.screenshot_code).toBeDefined();

        // Check relevanceCards structure (grouped by word_root x platform)
        const card = response.body.relevanceCards[0];
        expect(card.word_root).toBeDefined();
        expect(card.platform).toBeDefined();
        expect(card.tier).toBeDefined();
        expect(card.relevance).toBeDefined();
        expect(card.product_fit).toBeDefined();
        expect(card.natural_rate).toBeDefined();
        expect(card.settlement).toBeDefined();
        expect(card.settlement.exposureRate).toBeDefined();
        expect(card.settlement.settlementRatio).toBeDefined();
      });

      test("viewer token can query recommend", async () => {
        const response = await request(app)
          .get("/api/keywords/recommend?month=2026-04")
          .set("X-Auth-Token", VIEW_TOKEN);

        expect(response.status).toBe(200);
        expect(response.body.detail.length).toBe(3);
      });

      test("relevanceCards grouped by platform", async () => {
        const response = await request(app)
          .get("/api/keywords/recommend?month=2026-04")
          .set("X-Auth-Token", ADMIN_TOKEN);

        expect(response.body.relevanceCards).toBeDefined();
        // Should have cards for 豆包 and DeepSeek
        const platforms = response.body.relevanceCards.map(c => c.platform);
        expect(platforms).toContain("豆包");
        expect(platforms).toContain("DeepSeek");
      });
    });

    describe("GET /api/keywords/compare", () => {
      test("returns detail with admin token", async () => {
        const response = await request(app)
          .get("/api/keywords/compare?month=2026-04")
          .set("X-Auth-Token", ADMIN_TOKEN);

        expect(response.status).toBe(200);
        expect(response.body.month).toBe("2026-04");
        expect(response.body.detail).toBeDefined();
        expect(response.body.detail.length).toBe(3);
        expect(response.body.overallFavorRate).toBeDefined();
        expect(response.body.settlementSummary).toBeDefined();

        // Check detail item structure (flat list)
        const detailItem = response.body.detail[0];
        expect(detailItem.word_root).toBeDefined();
        expect(detailItem.word).toBeDefined();
        expect(detailItem.platform).toBeDefined();
        expect(detailItem.check_date).toBeDefined();
        expect(detailItem.favor_zhiji).toBeDefined();
        expect(detailItem.screenshot_code).toBeDefined();

        // Check settlementSummary structure
        const summaryItem = response.body.settlementSummary[0];
        expect(summaryItem.word_root).toBeDefined();
        expect(summaryItem.platform).toBeDefined();
        expect(summaryItem.favorRate).toBeDefined();
        expect(summaryItem.settlementRatio).toBeDefined();
      });

      test("viewer token can query compare", async () => {
        const response = await request(app)
          .get("/api/keywords/compare?month=2026-04")
          .set("X-Auth-Token", VIEW_TOKEN);

        expect(response.status).toBe(200);
        expect(response.body.detail.length).toBe(3);
      });
    });

    describe("GET /api/keywords/sentiment", () => {
      test("returns detail with admin token", async () => {
        const response = await request(app)
          .get("/api/keywords/sentiment?month=2026-04")
          .set("X-Auth-Token", ADMIN_TOKEN);

        expect(response.status).toBe(200);
        expect(response.body.month).toBe("2026-04");
        expect(response.body.wordType).toBe("舆情词");
        expect(response.body.keywords).toBeDefined();
        expect(response.body.keywords.length).toBe(4);
        expect(response.body.summary).toBeDefined();

        // Check summary has sentiment counts
        expect(response.body.summary.total).toBe(4);
        expect(response.body.summary.positive).toBeDefined();
        expect(response.body.summary.neutral).toBeDefined();
        expect(response.body.summary.negative).toBeDefined();

        // Check keyword structure
        const keyword = response.body.keywords[0];
        expect(keyword.wordRoot).toBeDefined();
        expect(keyword.tier).toBeDefined();
        expect(keyword.tierType).toBeDefined();
        expect(keyword.records).toBeDefined();

        // Check record has sentiment field
        const record = keyword.records[0];
        expect(record.sentiment).toBeDefined();
        expect(["正面", "中性", "负面"]).toContain(record.sentiment);

        // Check settlement
        expect(keyword.settlement).toBeDefined();
      });

      test("groups keywords by tier type", async () => {
        const response = await request(app)
          .get("/api/keywords/sentiment?month=2026-04")
          .set("X-Auth-Token", ADMIN_TOKEN);

        expect(response.body.byTier).toBeDefined();
        expect(response.body.byTier["一级车型"]).toBeDefined();
        expect(response.body.byTier["品牌技术"]).toBeDefined();
      });

      test("viewer token can query sentiment", async () => {
        const response = await request(app)
          .get("/api/keywords/sentiment?month=2026-04")
          .set("X-Auth-Token", VIEW_TOKEN);

        expect(response.status).toBe(200);
        expect(response.body.keywords.length).toBe(4);
      });
    });

    describe("GET /api/settlement", () => {
      test("returns summary with admin token", async () => {
        const response = await request(app)
          .get("/api/settlement?month=2026-04")
          .set("X-Auth-Token", ADMIN_TOKEN);

        expect(response.status).toBe(200);
        expect(response.body.month).toBe("2026-04");

        // Check recommend settlement
        expect(response.body.recommend).toBeDefined();
        expect(response.body.recommend.totalKeywords).toBe(3);
        expect(response.body.recommend.exposureRate).toBeDefined();
        expect(response.body.recommend.settlementRatio).toBeDefined();
        expect(response.body.recommend.settlementStatus).toBeDefined();

        // Check compare settlement
        expect(response.body.compare).toBeDefined();
        expect(response.body.compare.totalKeywords).toBe(3);
        expect(response.body.compare.favorRate).toBeDefined();
        expect(response.body.compare.settlementRatio).toBeDefined();
        expect(response.body.compare.settlementStatus).toBeDefined();

        // Check sentiment settlement
        expect(response.body.sentiment).toBeDefined();
        expect(response.body.sentiment.totalKeywords).toBe(4);
        expect(response.body.sentiment.positive).toBeDefined();
        expect(response.body.sentiment.neutral).toBeDefined();
        expect(response.body.sentiment.negative).toBeDefined();
        expect(response.body.sentiment.byTier).toBeDefined();

        // Check summary
        expect(response.body.summary).toBeDefined();
        expect(response.body.summary.allPassed).toBeDefined();
        expect(response.body.summary.passedCount).toBeDefined();
        expect(response.body.summary.totalCount).toBeDefined();
      });

      test("viewer token can query settlement", async () => {
        const response = await request(app)
          .get("/api/settlement?month=2026-04")
          .set("X-Auth-Token", VIEW_TOKEN);

        expect(response.status).toBe(200);
        expect(response.body.recommend).toBeDefined();
        expect(response.body.compare).toBeDefined();
        expect(response.body.sentiment).toBeDefined();
      });
    });

    describe("Query endpoints - empty data", () => {
      test("overview returns empty summary for month without data", async () => {
        const response = await request(app)
          .get("/api/overview?month=2025-01")
          .set("X-Auth-Token", ADMIN_TOKEN);

        expect(response.status).toBe(200);
        expect(response.body.month).toBe("2025-01");
        expect(response.body.summary.totalKeywords).toBe(0);
      });

      test("keywords/recommend returns empty array for month without data", async () => {
        const response = await request(app)
          .get("/api/keywords/recommend?month=2025-01")
          .set("X-Auth-Token", ADMIN_TOKEN);

        expect(response.status).toBe(200);
        expect(response.body.detail.length).toBe(0);
      });

      test("settlement returns zero counts for month without data", async () => {
        const response = await request(app)
          .get("/api/settlement?month=2025-01")
          .set("X-Auth-Token", ADMIN_TOKEN);

        expect(response.status).toBe(200);
        expect(response.body.recommend.totalKeywords).toBe(0);
        expect(response.body.compare.totalKeywords).toBe(0);
        expect(response.body.sentiment.totalKeywords).toBe(0);
      });
    });
  });

  describe("Viewer token permissions", () => {
    test("viewer can query all endpoints", async () => {
      // First upload with admin
      await request(app)
        .post("/api/upload")
        .set("X-Auth-Token", ADMIN_TOKEN)
        .attach("file", FIXTURE_PATH);

      // Test all query endpoints with viewer token
      const endpoints = [
        "/api/overview?month=2026-04",
        "/api/keywords/recommend?month=2026-04",
        "/api/keywords/compare?month=2026-04",
        "/api/keywords/sentiment?month=2026-04",
        "/api/settlement?month=2026-04",
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set("X-Auth-Token", VIEW_TOKEN);

        expect(response.status).toBe(200);
      }
    });

    test("viewer cannot upload", async () => {
      const response = await request(app)
        .post("/api/upload")
        .set("X-Auth-Token", VIEW_TOKEN)
        .attach("file", FIXTURE_PATH);

      expect(response.status).toBe(403);
    });
  });
});