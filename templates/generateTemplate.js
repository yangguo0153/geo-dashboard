import XLSX from "xlsx";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate xlsx template with three sheets:
 * - 推荐词: monitoring records + relevance evaluation
 * - 对比词: compare records
 * - 舆情词: sentiment records
 */
function generateTemplate() {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: 推荐词
  const recommendSheet = createRecommendSheet();
  XLSX.utils.book_append_sheet(workbook, recommendSheet, "推荐词");

  // Sheet 2: 对比词
  const compareSheet = createCompareSheet();
  XLSX.utils.book_append_sheet(workbook, compareSheet, "对比词");

  // Sheet 3: 舆情词
  const sentimentSheet = createSentimentSheet();
  XLSX.utils.book_append_sheet(workbook, sentimentSheet, "舆情词");

  // Write to file
  const outputPath = join(__dirname, "..", "GEO监测数据模板.xlsx");
  XLSX.writeFile(workbook, outputPath);

  console.log(`Template generated: ${outputPath}`);
  return outputPath;
}

/**
 * Create 推荐词 sheet with records and relevance evaluation sections
 */
function createRecommendSheet() {
  const data = [];

  // Records section header
  data.push(["词根", "词", "平台", "检查日期", "是否露出", "截图编号", "备注"]);

  // Sample data rows for records
  data.push(["智己汽车", "智己汽车怎么样", "懂车帝", "2024-04-01", "是", "SS001", ""]);
  data.push(["智己汽车", "智己汽车价格", "汽车之家", "2024-04-01", "否", "", "未露出"]);
  data.push(["智己LS7", "智己LS7试驾", "抖音", "2024-04-01", "是", "SS002", ""]);
  data.push(["智己LS6", "智己LS6评测", "小红书", "2024-04-01", "是", "SS003", ""]);
  data.push(["", "", "", "", "", "", ""]);

  // Add blank rows for spacing
  data.push([]);

  // Relevance evaluation section marker
  data.push(["关联度评测"]);
  data.push([]);

  // Relevance section header
  data.push(["词根", "平台", "产品契合度(1-5)", "自然率(%)", "关联度(%)", "词包级别"]);

  // Sample data rows for relevance with formulas
  // Row 12 (index 11): first data row after header
  // product_fit (col C), natural_rate (col D), relevance (col E), tier (col F)
  data.push([
    "智己汽车",
    "懂车帝",
    4, // product_fit
    25, // natural_rate
    { f: "(C13/5)*100*0.2+D13*0.8" }, // relevance formula
    { f: 'IF(E13<=30,"一级",IF(E13<=50,"二级","三级"))' }, // tier formula
  ]);
  data.push([
    "智己汽车",
    "汽车之家",
    5,
    30,
    { f: "(C14/5)*100*0.2+D14*0.8" },
    { f: 'IF(E14<=30,"一级",IF(E14<=50,"二级","三级"))' },
  ]);
  data.push([
    "智己LS7",
    "抖音",
    3,
    15,
    { f: "(C15/5)*100*0.2+D15*0.8" },
    { f: 'IF(E15<=30,"一级",IF(E15<=50,"二级","三级"))' },
  ]);
  data.push([
    "智己LS6",
    "小红书",
    4,
    20,
    { f: "(C16/5)*100*0.2+D16*0.8" },
    { f: 'IF(E16<=30,"一级",IF(E16<=50,"二级","三级"))' },
  ]);

  // Add more blank rows for user input
  for (let i = 0; i < 10; i++) {
    const rowNum = 17 + i;
    data.push([
      "",
      "",
      "",
      "",
      { f: `(C${rowNum}/5)*100*0.2+D${rowNum}*0.8` },
      { f: `IF(E${rowNum}<=30,"一级",IF(E${rowNum}<=50,"二级","三级"))` },
    ]);
  }

  return XLSX.utils.aoa_to_sheet(data);
}

/**
 * Create 对比词 sheet
 */
function createCompareSheet() {
  const data = [];

  // Header
  data.push(["词根", "词", "平台", "检查日期", "智己更优", "词包级别", "截图编号", "备注"]);

  // Sample data rows
  data.push(["智己汽车", "智己汽车对比小鹏", "懂车帝", "2024-04-01", "是", "一级", "CP001", ""]);
  data.push(["智己汽车", "智己汽车对比蔚来", "汽车之家", "2024-04-01", "否", "一级", "", "竞品优势"]);
  data.push([
    "智己LS7",
    "智己LS7对比理想L7",
    "抖音",
    "2024-04-01",
    "是",
    "二级",
    "CP002",
    "",
  ]);
  data.push([
    "智己LS6",
    "智己LS6对比小鹏G6",
    "小红书",
    "2024-04-01",
    "是",
    "二级",
    "CP003",
    "",
  ]);

  // Add blank rows for user input
  for (let i = 0; i < 20; i++) {
    data.push(["", "", "", "", "", "", "", ""]);
  }

  return XLSX.utils.aoa_to_sheet(data);
}

/**
 * Create 舆情词 sheet
 */
function createSentimentSheet() {
  const data = [];

  // Header
  data.push(["词根", "词", "平台", "检查日期", "舆情", "词包类型", "截图编号", "备注"]);

  // Sample data rows
  data.push([
    "智己汽车",
    "智己汽车质量",
    "懂车帝",
    "2024-04-01",
    "正面",
    "品牌技术",
    "YQ001",
    "",
  ]);
  data.push([
    "智己汽车",
    "智己汽车续航",
    "汽车之家",
    "2024-04-01",
    "负面",
    "品牌技术",
    "",
    "需关注",
  ]);
  data.push(["智己LS7", "智己LS7评价", "抖音", "2024-04-01", "正面", "一级车型", "YQ002", ""]);
  data.push(["智己LS6", "智己LS6口碑", "小红书", "2024-04-01", "中性", "二级车型", "YQ003", ""]);
  data.push([
    "智己L7",
    "智己L7配置",
    "微博",
    "2024-04-01",
    "正面",
    "三级车型",
    "YQ004",
    "",
  ]);

  // Add blank rows for user input
  for (let i = 0; i < 20; i++) {
    data.push(["", "", "", "", "", "", "", ""]);
  }

  return XLSX.utils.aoa_to_sheet(data);
}

// Run the generator
generateTemplate();