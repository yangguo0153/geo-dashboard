import XLSX from "xlsx";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate test data xlsx with realistic GEO monitoring data
 */
function generateTestData() {
  const workbook = XLSX.utils.book_new();
  const month = "2026-04";

  // Platforms
  const platforms = ["豆包", "千问", "DeepSeek", "元宝"];

  // 推荐词数据
  const recommendWords = [
    { root: "25-30万新能源SUV", questions: ["25-30万新能源SUV推荐", "25-30万买什么新能源SUV", "25-30万新能源SUV哪款好", "25-30万纯电SUV推荐"] },
    { root: "智能驾驶最好的车", questions: ["智能驾驶最好的车是哪款", "自动驾驶能力最强的车", "高阶智驾车型推荐", "NOA智驾最好的车"] },
    { root: "续航600km以上电车", questions: ["续航600km以上电车推荐", "长续航纯电车哪款好", "续航最长的电动车", "CLTC 600km以上车型"] },
    { root: "中大型纯电SUV", questions: ["中大型纯电SUV推荐", "中大型电动SUV对比", "5米以上纯电SUV", "大空间纯电SUV"] },
  ];

  // 对比词数据
  const compareWords = [
    { root: "智己LS6对比特斯拉ModelY", questions: ["智己LS6和特斯拉ModelY怎么选", "智己LS6对比ModelY优缺点", "买智己LS6还是ModelY"] },
    { root: "智己LS7对比理想L7", questions: ["智己LS7和理想L7对比", "智己LS7与理想L7谁更强", "LS7还是L7怎么选"] },
    { root: "智己L7对比蔚来ET7", questions: ["智己L7对比蔚来ET7", "智己L7和ET7哪个好", "智己L7还是ET7"] },
    { root: "智己汽车对比小鹏", questions: ["智己和小鹏哪个好", "智己汽车对比小鹏汽车", "买智己还是小鹏"] },
  ];

  // 舆情词数据
  const sentimentWords = [
    { root: "智己汽车质量", tier: "品牌技术", questions: ["智己汽车质量怎么样", "智己车质量可靠吗", "智己汽车故障率高吗"] },
    { root: "智己LS6口碑", tier: "一级车型", questions: ["智己LS6口碑如何", "智己LS6车主评价", "智己LS6真实口碑"] },
    { root: "智己LS7评价", tier: "二级车型", questions: ["智己LS7评价怎么样", "智己LS7用户评价", "智己LS7真实评价"] },
    { root: "智己L7配置", tier: "三级车型", questions: ["智己L7配置如何", "智己L7配置怎么样", "智己L7有什么配置"] },
    { root: "智己智能驾驶", tier: "品牌技术", questions: ["智己智能驾驶水平", "智己智驾怎么样", "智己NOA好用吗"] },
  ];

  // Sheet 1: 推荐词
  const recommendData = [["词根", "具体问句", "平台", "检测日期", "是否露出", "截图编码", "备注"]];

  // Add records for each word x platform
  let recIndex = 1;
  recommendWords.forEach(word => {
    platforms.forEach(platform => {
      word.questions.forEach((q, qi) => {
        const exposed = Math.random() > 0.2; // 80% exposed rate
        recommendData.push([
          word.root,
          q,
          platform,
          `2026-04-0${(qi % 9) + 1}`,
          exposed ? "是" : "否",
          `TJ-${month}-${String(recIndex++).padStart(3, "0")}`,
          ""
        ]);
      });
    });
  });

  // Add spacing and relevance section
  recommendData.push([]);
  recommendData.push([]);
  recommendData.push(["关联度评测"]);
  recommendData.push([]);
  recommendData.push(["词根", "平台", "产品适配度(1-5)", "AI自然呈现率(%)", "关联度(%)", "词包级别"]);

  // Relevance data for each word_root x platform
  recommendWords.forEach(word => {
    platforms.forEach(platform => {
      const productFit = Math.floor(Math.random() * 3) + 3; // 3-5
      const naturalRate = Math.floor(Math.random() * 40) + 10; // 10-50%
      const relevance = (productFit / 5 * 100 * 0.2 + naturalRate * 0.8).toFixed(1);
      const tier = relevance <= 30 ? "一级" : relevance <= 50 ? "二级" : "三级";
      recommendData.push([
        word.root,
        platform,
        productFit,
        naturalRate,
        parseFloat(relevance),
        tier
      ]);
    });
  });

  const recommendSheet = XLSX.utils.aoa_to_sheet(recommendData);
  XLSX.utils.book_append_sheet(workbook, recommendSheet, "推荐词");

  // Sheet 2: 对比词
  const compareData = [["词根", "具体问句", "平台", "检测日期", "偏向智己", "词包级别", "截图编码", "备注"]];

  let compIndex = 1;
  compareWords.forEach(word => {
    platforms.forEach(platform => {
      word.questions.forEach((q, qi) => {
        const favor = Math.random() > 0.3; // 70% favor rate
        compareData.push([
          word.root,
          q,
          platform,
          `2026-04-0${(qi % 9) + 1}`,
          favor ? "是" : "否",
          "二级",
          `DB-${month}-${String(compIndex++).padStart(3, "0")}`,
          ""
        ]);
      });
    });
  });

  const compareSheet = XLSX.utils.aoa_to_sheet(compareData);
  XLSX.utils.book_append_sheet(workbook, compareSheet, "对比词");

  // Sheet 3: 舆情词
  const sentimentData = [["词根", "具体问句", "平台", "检测日期", "判定结果", "词包类型", "截图编码", "备注"]];

  let sentIndex = 1;
  const sentiments = ["正面", "正面", "正面", "中性", "中性", "负面"]; // Weighted towards positive

  sentimentWords.forEach(word => {
    platforms.forEach(platform => {
      word.questions.forEach((q, qi) => {
        const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
        sentimentData.push([
          word.root,
          q,
          platform,
          `2026-04-0${(qi % 9) + 1}`,
          sentiment,
          word.tier,
          `YQ-${month}-${String(sentIndex++).padStart(3, "0")}`,
          ""
        ]);
      });
    });
  });

  const sentimentSheet = XLSX.utils.aoa_to_sheet(sentimentData);
  XLSX.utils.book_append_sheet(workbook, sentimentSheet, "舆情词");

  // Write to file
  const outputPath = join(__dirname, "..", "GEO测试数据.xlsx");
  XLSX.writeFile(workbook, outputPath);

  console.log(`Test data generated: ${outputPath}`);
  console.log(`推荐词记录: ${recommendData.length - 7} 条`);
  console.log(`对比词记录: ${compareData.length - 1} 条`);
  console.log(`舆情词记录: ${sentimentData.length - 1} 条`);

  return outputPath;
}

generateTestData();