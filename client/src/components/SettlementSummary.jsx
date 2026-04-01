import React from "react";
import { Table, Tag } from "antd";
import { TIER_COLORS, TIER_LABELS } from "../utils/constants";

function getSettlementColor(ratio, rateValue, rateField) {
  // 推荐词：露出率 < 80% 标红，>= 80% 绿
  if (rateField === 'exposureRate') {
    return rateValue >= 80 ? 'settlement-full' : 'settlement-fail';
  }

  // 对比词和舆情词：三档颜色
  if (ratio >= 1) return 'settlement-full';   // 绿色
  if (ratio > 0) return 'settlement-partial'; // 黄色
  return 'settlement-fail';                   // 红色
}

function getSettlementLabel(ratio, rateValue, rateField) {
  // 推荐词：露出率直接显示
  if (rateField === 'exposureRate') {
    return rateValue >= 80 ? '100%' : '0%';
  }

  // 对比词和舆情词
  if (ratio >= 1) return "100%";
  if (ratio > 0) return "60%";
  return "0%";
}

export default function SettlementSummary({ data, rateField, rateLabel, showTier = true }) {
  // Filter columns based on showTier
  const columns = [
    { title: "词根", dataIndex: "word_root", key: "word_root" },
    { title: "平台", dataIndex: "platform", key: "platform", width: 100 },
    ...(showTier ? [{
      title: "词包级别",
      dataIndex: "tier",
      key: "tier",
      width: 100,
      render: (tier) => (
        <Tag color={TIER_COLORS[tier] || "default"}>
          {TIER_LABELS[tier] || tier}
        </Tag>
      ),
    }] : []),
    {
      title: rateLabel,
      key: "rate",
      width: 120,
      render: (_, record) => {
        const rate = record[rateField];
        const isPass = record.settlementRatio > 0;
        return (
          <span style={{ color: isPass ? "var(--accent-success)" : "var(--accent-danger)" }}>
            {rate != null ? `${Number(rate).toFixed(1)}%` : "-"}
          </span>
        );
      },
    },
    {
      title: "结算比例",
      key: "settlementRatio",
      width: 100,
      render: (_, record) => (
        <span className={getSettlementColor(record.settlementRatio, record[rateField], rateField)}>
          {getSettlementLabel(record.settlementRatio, record[rateField], rateField)}
        </span>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data.map((d, i) => ({ ...d, key: i }))}
      pagination={false}
      size="middle"
    />
  );
}
