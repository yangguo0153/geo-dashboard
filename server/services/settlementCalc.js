/**
 * 关联度计算
 * 公式: (product_fit / 5 * 100) * 0.2 + natural_rate * 0.8
 */
export function calcRelevance(productFit, naturalRate) {
  return (productFit / 5) * 100 * 0.2 + naturalRate * 0.8;
}

/**
 * 关联度 → 词包级别
 */
export function relevanceToTier(relevance) {
  if (relevance <= 30) return "一级";
  if (relevance <= 50) return "二级";
  if (relevance <= 60) return "三级";
  return "三级"; // >60% 仍归三级
}

/**
 * 推荐词结算: 露出率 >= 80% → 100%, 否则 0%
 */
export function calcRecommendSettlement(records) {
  if (records.length === 0) {
    return { total: 0, exposed: 0, exposureRate: 0, settlementRatio: 0 };
  }

  const total = records.length;
  const exposed = records.filter((r) => r.is_exposed === 1).length;
  const exposureRate = (exposed / total) * 100;
  const settlementRatio = exposureRate >= 80 ? 1 : 0;

  return { total, exposed, exposureRate, settlementRatio };
}

/**
 * 对比词结算: >= 70% → 100%, >= 40% → 60%, < 40% → 0%
 */
export function calcCompareSettlement(records) {
  if (records.length === 0) {
    return { total: 0, favor: 0, favorRate: 0, settlementRatio: 0 };
  }

  const total = records.length;
  const favor = records.filter((r) => r.favor_zhiji === 1).length;
  const favorRate = (favor / total) * 100;

  let settlementRatio = 0;
  if (favorRate >= 70) settlementRatio = 1;
  else if (favorRate >= 40) settlementRatio = 0.6;

  return { total, favor, favorRate, settlementRatio };
}

/**
 * 舆情词结算阈值表
 */
const SENTIMENT_THRESHOLDS = {
  品牌技术: { full: 70, partial: 50 },
  一级车型: { full: 65, partial: 50 },
  二级车型: { full: 60, partial: 50 },
  三级车型: { full: 55, partial: 50 },
};

/**
 * 舆情词结算: 按词包类型不同阈值三档
 */
export function calcSentimentSettlement(records, tierType) {
  if (records.length === 0) {
    return { total: 0, positive: 0, positiveRate: 0, settlementRatio: 0 };
  }

  const thresholds = SENTIMENT_THRESHOLDS[tierType];
  if (!thresholds) {
    throw new Error(`Unknown tier type: ${tierType}`);
  }

  const total = records.length;
  const positive = records.filter((r) => r.sentiment === "正面").length;
  const positiveRate = (positive / total) * 100;

  let settlementRatio = 0;
  if (positiveRate >= thresholds.full) settlementRatio = 1;
  else if (positiveRate >= thresholds.partial) settlementRatio = 0.6;

  return { total, positive, positiveRate, settlementRatio };
}