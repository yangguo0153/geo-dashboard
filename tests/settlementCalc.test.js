import { describe, test, expect } from "@jest/globals";
import {
  calcRecommendSettlement,
  calcCompareSettlement,
  calcSentimentSettlement,
  calcRelevance,
} from "../server/services/settlementCalc.js";

describe("Relevance calculation", () => {
  test("product_fit=4, natural_rate=5 → 20%", () => {
    expect(calcRelevance(4, 5)).toBeCloseTo(20, 1);
  });

  test("product_fit=4, natural_rate=15 → 28%", () => {
    expect(calcRelevance(4, 15)).toBeCloseTo(28, 1);
  });

  test("product_fit=5, natural_rate=30 → 44%", () => {
    expect(calcRelevance(5, 30)).toBeCloseTo(44, 1);
  });

  test("product_fit=5, natural_rate=50 → 60%", () => {
    expect(calcRelevance(5, 50)).toBeCloseTo(60, 1);
  });
});

describe("Recommend settlement", () => {
  test("exposure >= 80% → 100% settlement", () => {
    const records = Array(10).fill(null).map((_, i) => ({
      is_exposed: i < 8 ? 1 : 0,
    }));
    const result = calcRecommendSettlement(records);
    expect(result.exposureRate).toBeCloseTo(80, 0);
    expect(result.settlementRatio).toBe(1);
  });

  test("exposure < 80% → 0% settlement", () => {
    const records = Array(10).fill(null).map((_, i) => ({
      is_exposed: i < 7 ? 1 : 0,
    }));
    const result = calcRecommendSettlement(records);
    expect(result.exposureRate).toBeCloseTo(70, 0);
    expect(result.settlementRatio).toBe(0);
  });

  test("empty records → 0 rate, 0 settlement", () => {
    const result = calcRecommendSettlement([]);
    expect(result.exposureRate).toBe(0);
    expect(result.settlementRatio).toBe(0);
  });
});

describe("Compare settlement", () => {
  test("favor >= 70% → 100%", () => {
    const records = Array(10).fill(null).map((_, i) => ({
      favor_zhiji: i < 7 ? 1 : 0,
    }));
    const result = calcCompareSettlement(records);
    expect(result.favorRate).toBeCloseTo(70, 0);
    expect(result.settlementRatio).toBe(1);
  });

  test("favor >= 40% and < 70% → 60%", () => {
    const records = Array(10).fill(null).map((_, i) => ({
      favor_zhiji: i < 5 ? 1 : 0,
    }));
    const result = calcCompareSettlement(records);
    expect(result.favorRate).toBeCloseTo(50, 0);
    expect(result.settlementRatio).toBe(0.6);
  });

  test("favor < 40% → 0%", () => {
    const records = Array(10).fill(null).map((_, i) => ({
      favor_zhiji: i < 3 ? 1 : 0,
    }));
    const result = calcCompareSettlement(records);
    expect(result.favorRate).toBeCloseTo(30, 0);
    expect(result.settlementRatio).toBe(0);
  });
});

describe("Sentiment settlement", () => {
  test("品牌技术 positive >= 70% → 100%", () => {
    const records = Array(10).fill(null).map((_, i) => ({
      sentiment: i < 7 ? "正面" : "中性",
    }));
    const result = calcSentimentSettlement(records, "品牌技术");
    expect(result.positiveRate).toBeCloseTo(70, 0);
    expect(result.settlementRatio).toBe(1);
  });

  test("品牌技术 positive >= 50% < 70% → 60%", () => {
    const records = Array(10).fill(null).map((_, i) => ({
      sentiment: i < 6 ? "正面" : "负面",
    }));
    const result = calcSentimentSettlement(records, "品牌技术");
    expect(result.positiveRate).toBeCloseTo(60, 0);
    expect(result.settlementRatio).toBe(0.6);
  });

  test("品牌技术 positive < 50% → 0%", () => {
    const records = Array(10).fill(null).map((_, i) => ({
      sentiment: i < 4 ? "正面" : "负面",
    }));
    const result = calcSentimentSettlement(records, "品牌技术");
    expect(result.positiveRate).toBeCloseTo(40, 0);
    expect(result.settlementRatio).toBe(0);
  });

  test("一级车型 positive >= 65% → 100%", () => {
    const records = Array(20).fill(null).map((_, i) => ({
      sentiment: i < 13 ? "正面" : "中性",
    }));
    const result = calcSentimentSettlement(records, "一级车型");
    expect(result.positiveRate).toBeCloseTo(65, 0);
    expect(result.settlementRatio).toBe(1);
  });

  test("二级车型 positive >= 60% → 100%", () => {
    const records = Array(10).fill(null).map((_, i) => ({
      sentiment: i < 6 ? "正面" : "中性",
    }));
    const result = calcSentimentSettlement(records, "二级车型");
    expect(result.positiveRate).toBeCloseTo(60, 0);
    expect(result.settlementRatio).toBe(1);
  });

  test("三级车型 positive >= 55% → 100%", () => {
    const records = Array(20).fill(null).map((_, i) => ({
      sentiment: i < 11 ? "正面" : "中性",
    }));
    const result = calcSentimentSettlement(records, "三级车型");
    expect(result.positiveRate).toBeCloseTo(55, 0);
    expect(result.settlementRatio).toBe(1);
  });

  test("三级车型 positive >= 50% < 55% → 60%", () => {
    const records = Array(20).fill(null).map((_, i) => ({
      sentiment: i < 10 ? "正面" : "中性",
    }));
    const result = calcSentimentSettlement(records, "三级车型");
    expect(result.positiveRate).toBeCloseTo(50, 0);
    expect(result.settlementRatio).toBe(0.6);
  });
});