import React from "react";
import { Table, Tag } from "antd";
import { TIER_COLORS, TIER_LABELS } from "../utils/constants";

function getSettlementColor(ratio) {
  if (ratio >= 1) return "settlement-full";
  if (ratio > 0) return "settlement-partial";
  return "settlement-fail";
}

function getSettlementLabel(ratio) {
  if (ratio >= 1) return "100%";
  if (ratio > 0) return "60%";
  return "0%";
}

export default function SettlementSummary({ data, rateField, rateLabel }) {
  const columns = [
    { title: "词根", dataIndex: "word_root", key: "word_root" },
    { title: "平台", dataIndex: "platform", key: "platform", width: 100 },
    {
      title: "词包级别",
      dataIndex: "tier",
      key: "tier",
      width: 100,
      render: (tier) => (
        <Tag color={TIER_COLORS[tier] || "default"}>
          {TIER_LABELS[tier] || tier}
        </Tag>
      ),
    },
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
        <span className={getSettlementColor(record.settlementRatio)}>
          {getSettlementLabel(record.settlementRatio)}
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
