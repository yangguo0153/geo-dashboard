/**
 * Overview API Route
 * GET /api/overview?month=YYYY-MM
 * Returns KPIs and platform statistics
 */
import { relevanceToTier } from "../services/settlementCalc.js";
import { buildSettlementSummary } from "../services/settlementSummary.js";

export default function createOverviewRouter(db) {
  const router = new Map();

  /**
   * GET /api/overview?month=YYYY-MM
   * Returns overview statistics for the dashboard
   */
  function handleOverview(req, res) {
    const { month } = req.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: "Invalid month format. Use YYYY-MM" });
    }

    try {
      // Get all keywords for the month
      const keywords = db
        .prepare(
          `SELECT k.id, k.word_type, k.word_root, k.word, k.platform, k.tier, k.month
           FROM keywords k
           WHERE k.month = ?`
        )
        .all(month);

      // Get monitoring records for the month's keywords
      const records = db
        .prepare(
          `SELECT mr.keyword_id, mr.is_exposed, mr.favor_zhiji, mr.sentiment
           FROM monitoring_records mr
           JOIN keywords k ON mr.keyword_id = k.id
           WHERE k.month = ?`
        )
        .all(month);

      // Get relevance scores
      const relevanceScores = db
        .prepare(
          `SELECT rs.keyword_id, rs.product_fit, rs.natural_rate, rs.relevance
           FROM relevance_scores rs
           JOIN keywords k ON rs.keyword_id = k.id
           WHERE k.month = ?`
        )
        .all(month);

      // Calculate KPIs by keyword type
      const recommendKeywords = keywords.filter((k) => k.word_type === "推荐词");
      const compareKeywords = keywords.filter((k) => k.word_type === "对比词");
      const sentimentKeywords = keywords.filter((k) => k.word_type === "舆情词");

      // Recommend stats
      const recommendRecords = records.filter((r) =>
        recommendKeywords.some((k) => k.id === r.keyword_id)
      );
      const recommendExposed = recommendRecords.filter((r) => r.is_exposed === 1).length;
      const recommendExposureRate =
        recommendRecords.length > 0
          ? Math.round((recommendExposed / recommendRecords.length) * 100 * 10) / 10
          : 0;

      // Compare stats
      const compareRecords = records.filter((r) =>
        compareKeywords.some((k) => k.id === r.keyword_id)
      );
      const compareFavor = compareRecords.filter((r) => r.favor_zhiji === 1).length;
      const compareFavorRate =
        compareRecords.length > 0
          ? Math.round((compareFavor / compareRecords.length) * 100 * 10) / 10
          : 0;

      // Sentiment stats
      const sentimentRecords = records.filter((r) =>
        sentimentKeywords.some((k) => k.id === r.keyword_id)
      );
      const sentimentPositive = sentimentRecords.filter((r) => r.sentiment === "正面").length;
      const sentimentPositiveRate =
        sentimentRecords.length > 0
          ? Math.round((sentimentPositive / sentimentRecords.length) * 100 * 10) / 10
          : 0;

      const { overallPassRate, passSummary } = buildSettlementSummary(keywords, records);

      // Platform statistics
      const platforms = ["豆包", "千问", "DeepSeek", "元宝"];
      const platformStats = platforms.map((platform) => {
        const platformKeywords = keywords.filter((k) => k.platform === platform);
        const platformRecords = records.filter((r) =>
          platformKeywords.some((k) => k.id === r.keyword_id)
        );

        const exposed = platformRecords.filter((r) => r.is_exposed === 1).length;
        const favor = platformRecords.filter((r) => r.favor_zhiji === 1).length;
        const positive = platformRecords.filter((r) => r.sentiment === "正面").length;

        return {
          platform,
          totalKeywords: platformKeywords.length,
          totalRecords: platformRecords.length,
          exposed,
          favor,
          positive,
        };
      });

      // Tier distribution
      const tierDistribution = {
        一级: { count: 0, keywords: [] },
        二级: { count: 0, keywords: [] },
        三级: { count: 0, keywords: [] },
      };

      for (const score of relevanceScores) {
        const keyword = keywords.find((k) => k.id === score.keyword_id);
        if (keyword) {
          const tier = relevanceToTier(score.relevance);
          tierDistribution[tier].count++;
          tierDistribution[tier].keywords.push({
            word: keyword.word,
            wordRoot: keyword.word_root,
            relevance: Math.round(score.relevance * 10) / 10,
          });
        }
      }

      // Response
      const overview = {
        month,
        overallPassRate,
        passSummary,
        summary: {
          totalKeywords: keywords.length,
          recommend: {
            total: recommendKeywords.length,
            exposed: recommendExposed,
            exposureRate: recommendExposureRate,
          },
          compare: {
            total: compareKeywords.length,
            favor: compareFavor,
            favorRate: compareFavorRate,
          },
          sentiment: {
            total: sentimentKeywords.length,
            positive: sentimentPositive,
            positiveRate: sentimentPositiveRate,
          },
        },
        platformStats,
        tierDistribution: {
          一级: { count: tierDistribution["一级"].count },
          二级: { count: tierDistribution["二级"].count },
          三级: { count: tierDistribution["三级"].count },
        },
      };

      res.json(overview);
    } catch (error) {
      console.error("Overview error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  router.set("GET /", handleOverview);

  return router;
}
