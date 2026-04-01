import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseUploadedXlsx } from "../server/services/xlsxParser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.join(__dirname, "fixtures/test-upload.xlsx");

// Generate a test xlsx file before running tests
beforeAll(() => {
  fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });

  const wb = XLSX.utils.book_new();

  // Sheet 1: 推荐词
  const recommendData = [
    ["词根", "具体问句", "平台", "检测日期", "是否露出", "截图编码", "备注"],
    ["25-30万新能源SUV", "哪些新能源SUV值得买", "豆包", "2026-04-01", "是", "TJ-001", ""],
    ["25-30万新能源SUV", "新能源SUV推荐", "豆包", "2026-04-01", "否", "TJ-002", ""],
    ["25-30万新能源SUV", "哪些新能源SUV值得买", "DeepSeek", "2026-04-01", "是", "TJ-003", ""],
  ];
  // Relevance data starts after a blank row
  const relevanceData = [
    [],
    ["关联度评测"],
    ["词根", "平台", "产品适配度", "AI自然呈现率", "关联度", "词包级别"],
    ["25-30万新能源SUV", "豆包", 4, 15, 28, "一级"],
    ["25-30万新能源SUV", "DeepSeek", 5, 30, 44, "二级"],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet([...recommendData, ...relevanceData]);
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

// Cleanup test fixture after all tests
afterAll(() => {
  if (fs.existsSync(FIXTURE_PATH)) {
    fs.unlinkSync(FIXTURE_PATH);
    // Remove fixtures directory if empty
    const fixturesDir = path.dirname(FIXTURE_PATH);
    if (fs.readdirSync(fixturesDir).length === 0) {
      fs.rmdirSync(fixturesDir);
    }
  }
});

describe("xlsx parser", () => {
  test("parses all three sheets", () => {
    const result = parseUploadedXlsx(FIXTURE_PATH);
    expect(result.recommend.records).toHaveLength(3);
    expect(result.compare.records).toHaveLength(2);
    expect(result.sentiment.records).toHaveLength(3);
  });

  test("parses recommend records correctly", () => {
    const result = parseUploadedXlsx(FIXTURE_PATH);
    const rec = result.recommend.records[0];
    expect(rec.word_root).toBe("25-30万新能源SUV");
    expect(rec.word).toBe("哪些新能源SUV值得买");
    expect(rec.platform).toBe("豆包");
    expect(rec.is_exposed).toBe(true);
    expect(rec.screenshot_code).toBe("TJ-001");
  });

  test("parses relevance data", () => {
    const result = parseUploadedXlsx(FIXTURE_PATH);
    expect(result.recommend.relevance).toHaveLength(2);
    const rel = result.recommend.relevance[0];
    expect(rel.word_root).toBe("25-30万新能源SUV");
    expect(rel.platform).toBe("豆包");
    expect(rel.product_fit).toBe(4);
    expect(rel.natural_rate).toBe(15);
  });

  test("parses compare records correctly", () => {
    const result = parseUploadedXlsx(FIXTURE_PATH);
    const rec = result.compare.records[0];
    expect(rec.word_root).toBe("智己LS8比理想L8更值得买");
    expect(rec.favor_zhiji).toBe(true);
    expect(rec.tier).toBe("一级");
  });

  test("parses sentiment records correctly", () => {
    const result = parseUploadedXlsx(FIXTURE_PATH);
    const rec = result.sentiment.records[0];
    expect(rec.word_root).toBe("智己LS8");
    expect(rec.sentiment).toBe("正面");
    expect(rec.tier_type).toBe("一级车型");
  });
});