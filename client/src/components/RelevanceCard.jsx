import React from "react";
import { Tag, Rate } from "antd";
import { TIER_COLORS, TIER_LABELS } from "../utils/constants";

export default function RelevanceCard({ data }) {
  const { word_root, platform, relevance, product_fit, natural_rate, tier } = data;
  const tierColor = TIER_COLORS[tier] || "#94a3b8";
  const tierLabel = TIER_LABELS[tier] || tier;

  return (
    <div className="relevance-card">
      <Tag color={tierColor} style={{ marginBottom: 8, fontSize: 12 }}>
        {tierLabel}词包
      </Tag>
      <div className="relevance-value" style={{ color: tierColor }}>
        {relevance != null ? relevance.toFixed(1) : "-"}%
      </div>
      <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 600, margin: "8px 0" }}>
        {word_root}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{platform}</div>
      <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
        <div style={{ marginBottom: 4 }}>
          适配度 <Rate disabled value={product_fit || 0} count={5} style={{ fontSize: 12 }} />
        </div>
        <div>自然呈现率 {natural_rate != null ? natural_rate.toFixed(1) : "-"}%</div>
      </div>
    </div>
  );
}