/**
 * Keywords API Routes
 * - GET /api/keywords/recommend?month=YYYY-MM
 * - GET /api/keywords/compare?month=YYYY-MM
 * - GET /api/keywords/sentiment?month=YYYY-MM
 */
import {
  calcRecommendSettlement,
  calcCompareSettlement,
  calcSentimentSettlement,
} from "../services/settlementCalc.js";

export default function createKeywordsRouter(db) {
  const router = new Map();

  /**
   * Validate month parameter
   */
  function validateMonth(month) {
    return month && /^\d{4}-\d{2}$/.test(month);
  }

  /**
   * GET /api/keywords/recommend?month=YYYY-MM
   * Returns recommend keywords with:
   * - relevanceCards: cards grouped by word_root x platform
   * - detail: flat list of all monitoring records
   * - settlementSummary: aggregated settlement by word_root x platform
   */
  function handleRecommend(req, res) {
    const { month } = req.query;

    if (!validateMonth(month)) {
      return res.status(400).json({ error: "Invalid month format. Use YYYY-MM" });
    }

    try {
      // Get recommend keywords with relevance scores
      const keywords = db
        .prepare(
          `SELECT k.id, k.word_root, k.word, k.platform, k.tier,
                  rs.product_fit, rs.natural_rate, rs.relevance
           FROM keywords k
           LEFT JOIN relevance_scores rs ON k.id = rs.keyword_id AND rs.month = ?
           WHERE k.word_type = '推荐词' AND k.month = ?
           ORDER BY k.platform, k.word_root`
        )
        .all(month, month);

      // Get monitoring records for each keyword
      const stmt = db.prepare(
        `SELECT keyword_id, check_date, is_exposed, screenshot_code, remark
         FROM monitoring_records
         WHERE keyword_id = ?
         ORDER BY check_date`
      );

      // Attach records to each keyword
      const keywordsWithRecords = keywords.map((k) => {
        const records = stmt.all(k.id);
        return { ...k, records };
      });

      // Build detail array (flat list of all question records)
      const detail = [];
      for (const k of keywordsWithRecords) {
        for (const r of k.records) {
          detail.push({
            word_root: k.word_root,
            word: k.word,
            platform: k.platform,
            tier: k.tier,
            check_date: r.check_date,
            is_exposed: r.is_exposed,
            screenshot_code: r.screenshot_code,
          });
        }
      }

      // Build relevanceCards (grouped by word_root x platform)
      const cardMap = new Map(); // key: "word_root|platform"
      for (const k of keywordsWithRecords) {
        const key = `${k.word_root}|${k.platform}`;
        if (!cardMap.has(key)) {
          cardMap.set(key, {
            word_root: k.word_root,
            platform: k.platform,
            tier: k.tier,
            relevance: k.relevance,
            product_fit: k.product_fit,
            natural_rate: k.natural_rate,
            records: [],
          });
        }
        const card = cardMap.get(key);
        card.records.push(...k.records);
      }

      // Calculate settlement for each card
      const relevanceCards = [];
      for (const card of cardMap.values()) {
        const settlement = calcRecommendSettlement(card.records);
        relevanceCards.push({
          word_root: card.word_root,
          platform: card.platform,
          tier: card.tier,
          relevance: card.relevance ? parseFloat(card.relevance.toFixed(1)) : null,
          product_fit: card.product_fit,
          natural_rate: card.natural_rate ? parseFloat(card.natural_rate.toFixed(1)) : null,
          settlement: {
            total: settlement.total,
            exposed: settlement.exposed,
            exposureRate: parseFloat(settlement.exposureRate.toFixed(1)),
            settlementRatio: settlement.settlementRatio,
          },
        });
      }

      // Build settlementSummary (aggregated by word_root x platform)
      const settlementSummary = relevanceCards.map((card) => ({
        word_root: card.word_root,
        platform: card.platform,
        tier: card.tier,
        exposureRate: card.settlement.exposureRate,
        settlementRatio: card.settlement.settlementRatio,
      }));

      res.json({
        month,
        relevanceCards,
        detail,
        settlementSummary,
      });
    } catch (error) {
      console.error("Recommend keywords error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * GET /api/keywords/compare?month=YYYY-MM
   * Returns compare keywords with detail
   *
   * Response structure:
   * {
   *   month: "2026-04",
   *   overallFavorRate: 75.0,
   *   detail: [{ word_root, word, platform, check_date, favor_zhiji, screenshot_code }],
   *   settlementSummary: [{ word_root, platform, favorRate, settlementRatio }]
   * }
   */
  function handleCompare(req, res) {
    const { month } = req.query;

    if (!validateMonth(month)) {
      return res.status(400).json({ error: "Invalid month format. Use YYYY-MM" });
    }

    try {
      // Get compare keywords
      const keywords = db
        .prepare(
          `SELECT k.id, k.word_root, k.word, k.platform
           FROM keywords k
           WHERE k.word_type = '对比词' AND k.month = ?
           ORDER BY k.platform, k.word_root`
        )
        .all(month);

      // Get monitoring records for each keyword
      const stmt = db.prepare(
        `SELECT keyword_id, check_date, favor_zhiji, screenshot_code, remark
         FROM monitoring_records
         WHERE keyword_id = ?
         ORDER BY check_date`
      );

      // Build flat detail list and aggregate by word_root + platform
      const detail = [];
      const summaryMap = new Map(); // key: "word_root|platform"

      for (const k of keywords) {
        const records = stmt.all(k.id);
        const key = `${k.word_root}|${k.platform}`;

        // Initialize summary entry if not exists
        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            word_root: k.word_root,
            platform: k.platform,
            total: 0,
            favor: 0,
          });
        }
        const summaryEntry = summaryMap.get(key);

        // Process each record
        for (const r of records) {
          // Add to flat detail list
          detail.push({
            word_root: k.word_root,
            word: k.word,
            platform: k.platform,
            check_date: r.check_date,
            favor_zhiji: r.favor_zhiji,
            screenshot_code: r.screenshot_code,
          });

          // Aggregate for summary
          summaryEntry.total += 1;
          if (r.favor_zhiji === 1) {
            summaryEntry.favor += 1;
          }
        }
      }

      // Calculate settlement summary
      const settlementSummary = [];
      let overallTotal = 0;
      let overallFavor = 0;

      for (const entry of summaryMap.values()) {
        if (entry.total > 0) {
          const favorRate = (entry.favor / entry.total) * 100;
          const { settlementRatio } = calcCompareSettlement(
            Array(entry.total).fill(0).map((_, i) => ({ favor_zhiji: i < entry.favor ? 1 : 0 }))
          );

          settlementSummary.push({
            word_root: entry.word_root,
            platform: entry.platform,
            favorRate: Math.round(favorRate * 10) / 10,
            settlementRatio,
          });

          overallTotal += entry.total;
          overallFavor += entry.favor;
        }
      }

      // Calculate overall favor rate
      const overallFavorRate = overallTotal > 0
        ? Math.round((overallFavor / overallTotal) * 100 * 10) / 10
        : 0;

      res.json({
        month,
        overallFavorRate,
        detail,
        settlementSummary,
      });
    } catch (error) {
      console.error("Compare keywords error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * GET /api/keywords/sentiment?month=YYYY-MM
   * Returns sentiment keywords with detail
   */
  function handleSentiment(req, res) {
    const { month } = req.query;

    if (!validateMonth(month)) {
      return res.status(400).json({ error: "Invalid month format. Use YYYY-MM" });
    }

    try {
      // Get sentiment keywords with tier type
      const keywords = db
        .prepare(
          `SELECT k.id, k.word_root, k.word, k.platform, k.tier
           FROM keywords k
           WHERE k.word_type = '舆情词' AND k.month = ?
           ORDER BY k.tier, k.platform, k.word_root`
        )
        .all(month);

      // Get monitoring records for each keyword
      const stmt = db.prepare(
        `SELECT keyword_id, check_date, sentiment, screenshot_code, remark
         FROM monitoring_records
         WHERE keyword_id = ?
         ORDER BY check_date`
      );

      const keywordsWithRecords = keywords.map((k) => {
        const records = stmt.all(k.id);
        // Map tier to tierType for settlement calculation
        const tierType = k.tier || "三级车型";
        const settlement = calcSentimentSettlement(records, tierType);

        return {
          id: k.id,
          wordRoot: k.word_root,
          word: k.word,
          platform: k.platform,
          tier: k.tier,
          tierType,
          records: records.map((r) => ({
            date: r.check_date,
            sentiment: r.sentiment,
            screenshotCode: r.screenshot_code,
            remark: r.remark,
          })),
          settlement: {
            total: settlement.total,
            positive: settlement.positive,
            positiveRate: Math.round(settlement.positiveRate * 10) / 10,
            settlementRatio: settlement.settlementRatio,
          },
        };
      });

      // Group by tier type
      const byTier = {};
      for (const kw of keywordsWithRecords) {
        if (!byTier[kw.tierType]) {
          byTier[kw.tierType] = [];
        }
        byTier[kw.tierType].push(kw);
      }

      // Calculate overall summary
      const allRecords = keywordsWithRecords.flatMap((k) =>
        k.records.map((r) => ({ sentiment: r.sentiment }))
      );

      res.json({
        month,
        wordType: "舆情词",
        summary: {
          total: allRecords.length,
          positive: allRecords.filter((r) => r.sentiment === "正面").length,
          neutral: allRecords.filter((r) => r.sentiment === "中性").length,
          negative: allRecords.filter((r) => r.sentiment === "负面").length,
        },
        byTier,
        keywords: keywordsWithRecords,
      });
    } catch (error) {
      console.error("Sentiment keywords error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  router.set("GET /recommend", handleRecommend);
  router.set("GET /compare", handleCompare);
  router.set("GET /sentiment", handleSentiment);

  return router;
}