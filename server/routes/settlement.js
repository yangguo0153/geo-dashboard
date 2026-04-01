/**
 * Settlement API Route
 * GET /api/settlement?month=YYYY-MM
 * Returns settlement summary for all three keyword types
 */
import {
  calcRecommendSettlement,
  calcCompareSettlement,
  calcSentimentSettlement,
} from "../services/settlementCalc.js";

export default function createSettlementRouter(db) {
  const router = new Map();

  /**
   * Validate month parameter
   */
  function validateMonth(month) {
    return month && /^\d{4}-\d{2}$/.test(month);
  }

  /**
   * GET /api/settlement?month=YYYY-MM
   * Returns settlement summary for all three types
   */
  function handleSettlement(req, res) {
    const { month } = req.query;

    if (!validateMonth(month)) {
      return res.status(400).json({ error: "Invalid month format. Use YYYY-MM" });
    }

    try {
      // Get all keywords for the month
      const keywords = db
        .prepare(
          `SELECT id, word_type, word_root, word, platform, tier
           FROM keywords
           WHERE month = ?`
        )
        .all(month);

      // Get all monitoring records for the month
      const records = db
        .prepare(
          `SELECT mr.keyword_id, mr.is_exposed, mr.favor_zhiji, mr.sentiment
           FROM monitoring_records mr
           JOIN keywords k ON mr.keyword_id = k.id
           WHERE k.month = ?`
        )
        .all(month);

      // Separate keywords by type
      const recommendKeywordIds = new Set(
        keywords.filter((k) => k.word_type === "推荐词").map((k) => k.id)
      );
      const compareKeywordIds = new Set(
        keywords.filter((k) => k.word_type === "对比词").map((k) => k.id)
      );
      const sentimentKeywords = keywords.filter((k) => k.word_type === "舆情词");

      // Calculate recommend settlement
      const recommendRecords = records.filter((r) => recommendKeywordIds.has(r.keyword_id));
      const recommendSettlement = calcRecommendSettlement(recommendRecords);

      // Calculate compare settlement
      const compareRecords = records.filter((r) => compareKeywordIds.has(r.keyword_id));
      const compareSettlement = calcCompareSettlement(compareRecords);

      // Calculate sentiment settlement by tier
      const sentimentByTier = {
        品牌技术: [],
        一级车型: [],
        二级车型: [],
        三级车型: [],
      };

      for (const kw of sentimentKeywords) {
        const tierType = kw.tier || "三级车型";
        if (sentimentByTier[tierType]) {
          const kwRecords = records.filter((r) => r.keyword_id === kw.id);
          sentimentByTier[tierType].push(...kwRecords);
        }
      }

      const sentimentSettlementByTier = {};
      for (const [tier, tierRecords] of Object.entries(sentimentByTier)) {
        sentimentSettlementByTier[tier] = {
          ...calcSentimentSettlement(tierRecords, tier),
          keywordCount: sentimentKeywords.filter((k) => (k.tier || "三级车型") === tier).length,
        };
      }

      // Overall sentiment summary
      const allSentimentRecords = records.filter((r) =>
        sentimentKeywords.some((k) => k.id === r.keyword_id)
      );
      const totalSentimentSettlement = {
        total: allSentimentRecords.length,
        positive: allSentimentRecords.filter((r) => r.sentiment === "正面").length,
        neutral: allSentimentRecords.filter((r) => r.sentiment === "中性").length,
        negative: allSentimentRecords.filter((r) => r.sentiment === "负面").length,
      };

      // Build response
      const settlement = {
        month,
        recommend: {
          totalKeywords: recommendKeywordIds.size,
          totalRecords: recommendSettlement.total,
          exposed: recommendSettlement.exposed,
          exposureRate: recommendSettlement.exposureRate.toFixed(1),
          settlementRatio: recommendSettlement.settlementRatio,
          settlementStatus:
            recommendSettlement.settlementRatio === 1
              ? "达标"
              : recommendSettlement.settlementRatio === 0.6
                ? "部分达标"
                : "未达标",
        },
        compare: {
          totalKeywords: compareKeywordIds.size,
          totalRecords: compareSettlement.total,
          favor: compareSettlement.favor,
          favorRate: compareSettlement.favorRate.toFixed(1),
          settlementRatio: compareSettlement.settlementRatio,
          settlementStatus:
            compareSettlement.settlementRatio === 1
              ? "达标"
              : compareSettlement.settlementRatio === 0.6
                ? "部分达标"
                : "未达标",
        },
        sentiment: {
          totalKeywords: sentimentKeywords.length,
          totalRecords: totalSentimentSettlement.total,
          positive: totalSentimentSettlement.positive,
          neutral: totalSentimentSettlement.neutral,
          negative: totalSentimentSettlement.negative,
          positiveRate:
            totalSentimentSettlement.total > 0
              ? ((totalSentimentSettlement.positive / totalSentimentSettlement.total) * 100).toFixed(1)
              : "0.0",
          byTier: sentimentSettlementByTier,
        },
        summary: {
          allPassed:
            recommendSettlement.settlementRatio === 1 &&
            compareSettlement.settlementRatio === 1 &&
            Object.values(sentimentSettlementByTier).every((s) => s.settlementRatio === 1),
          passedCount: [
            recommendSettlement.settlementRatio === 1 ? 1 : 0,
            compareSettlement.settlementRatio === 1 ? 1 : 0,
            ...Object.values(sentimentSettlementByTier).map((s) => (s.settlementRatio === 1 ? 1 : 0)),
          ].reduce((a, b) => a + b, 0),
          totalCount: 2 + Object.keys(sentimentSettlementByTier).length,
        },
      };

      res.json(settlement);
    } catch (error) {
      console.error("Settlement error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  router.set("GET /", handleSettlement);

  return router;
}