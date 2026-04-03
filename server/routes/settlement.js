/**
 * Settlement API Route
 * GET /api/settlement?month=YYYY-MM
 * Returns settlement summary for all three keyword types
 */
import { buildSettlementSummary } from "../services/settlementSummary.js";

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

      const { overallPassRate, passSummary, recommend, compare, sentiment } =
        buildSettlementSummary(keywords, records);

      // Build response
      const settlement = {
        month,
        overallPassRate,
        passSummary,
        recommend,
        compare,
        sentiment,
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
