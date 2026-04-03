import {
  calcRecommendSettlement,
  calcCompareSettlement,
  calcSentimentSettlement,
} from "./settlementCalc.js";

function buildRecordsByKeywordId(records) {
  const recordsByKeywordId = new Map();

  for (const record of records) {
    if (!recordsByKeywordId.has(record.keyword_id)) {
      recordsByKeywordId.set(record.keyword_id, []);
    }
    recordsByKeywordId.get(record.keyword_id).push(record);
  }

  return recordsByKeywordId;
}

function collectGroupRecords(keywordIds, recordsByKeywordId) {
  return keywordIds.flatMap((keywordId) => recordsByKeywordId.get(keywordId) || []);
}

export function buildSettlementSummary(keywords, records) {
  const recordsByKeywordId = buildRecordsByKeywordId(records);

  const recommendKeywords = keywords.filter((keyword) => keyword.word_type === "推荐词");
  const compareKeywords = keywords.filter((keyword) => keyword.word_type === "对比词");
  const sentimentKeywords = keywords.filter((keyword) => keyword.word_type === "舆情词");

  const recommendGroups = new Map();
  for (const keyword of recommendKeywords) {
    const key = `${keyword.word_root}|${keyword.platform}`;
    if (!recommendGroups.has(key)) {
      recommendGroups.set(key, {
        word_root: keyword.word_root,
        platform: keyword.platform,
        keywordIds: [],
      });
    }
    recommendGroups.get(key).keywordIds.push(keyword.id);
  }

  const recommend = Array.from(recommendGroups.values()).map((group) => {
    const result = calcRecommendSettlement(
      collectGroupRecords(group.keywordIds, recordsByKeywordId)
    );

    return {
      word_root: group.word_root,
      platform: group.platform,
      exposureRate: Math.round(result.exposureRate * 10) / 10,
      settlementRatio: result.settlementRatio,
    };
  });

  const compareGroups = new Map();
  for (const keyword of compareKeywords) {
    const key = `${keyword.word_root}|${keyword.platform}`;
    if (!compareGroups.has(key)) {
      compareGroups.set(key, {
        word_root: keyword.word_root,
        platform: keyword.platform,
        keywordIds: [],
      });
    }
    compareGroups.get(key).keywordIds.push(keyword.id);
  }

  const compare = Array.from(compareGroups.values()).map((group) => {
    const result = calcCompareSettlement(
      collectGroupRecords(group.keywordIds, recordsByKeywordId)
    );

    return {
      word_root: group.word_root,
      platform: group.platform,
      favorRate: Math.round(result.favorRate * 10) / 10,
      settlementRatio: result.settlementRatio,
    };
  });

  const sentimentGroups = {
    品牌技术: { tier: "品牌技术", keywordIds: [] },
    一级车型: { tier: "一级车型", keywordIds: [] },
    二级车型: { tier: "二级车型", keywordIds: [] },
    三级车型: { tier: "三级车型", keywordIds: [] },
  };

  for (const keyword of sentimentKeywords) {
    const tierType = keyword.tier || "三级车型";
    if (sentimentGroups[tierType]) {
      sentimentGroups[tierType].keywordIds.push(keyword.id);
    }
  }

  const sentiment = Object.entries(sentimentGroups)
    .filter(([, group]) => group.keywordIds.length > 0)
    .map(([tierType, group]) => {
      const result = calcSentimentSettlement(
        collectGroupRecords(group.keywordIds, recordsByKeywordId),
        tierType
      );

      return {
        tier: group.tier,
        positiveRate: Math.round(result.positiveRate * 10) / 10,
        settlementRatio: result.settlementRatio,
      };
    });

  const allGroups = [...recommend, ...compare, ...sentiment];
  const passed = allGroups.filter((group) => group.settlementRatio === 1).length;
  const total = allGroups.length;
  const overallPassRate =
    total > 0 ? Math.round((passed / total) * 100 * 10) / 10 : 0;

  return {
    overallPassRate,
    passSummary: {
      passed,
      total,
    },
    recommend,
    compare,
    sentiment,
  };
}
