import React from "react";
import { Tag, Progress } from "antd";
import { TIER_COLORS, TIER_LABELS } from "../utils/constants";

// 根据关联度阈值返回达标状态颜色
function getProgressColor(relevance) {
  if (relevance == null) return "#9ca3af";
  if (relevance >= 60) return "#16a34a";  // 绿
  if (relevance >= 30) return "#d97706";  // 橙
  return "#dc2626";                        // 红
}

export default function RelevanceCard({ data }) {
  const { word_root, platform, relevance, product_fit, natural_rate, tier } = data;
  const tierColor = TIER_COLORS[tier] || "#9ca3af";
  const tierLabel = TIER_LABELS[tier] || tier;
  const progressColor = getProgressColor(relevance);

  return (
    <div className="relevance-card" style={{ minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Tag color={tierColor} style={{ fontSize: 11, margin: 0 }}>
          {tierLabel}
        </Tag>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{platform}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {word_root}
      </div>
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
          <span>关联度</span>
          <span style={{ fontWeight: 600, color: progressColor }}>
            {relevance != null ? relevance.toFixed(1) : "-"}%
          </span>
        </div>
        <Progress
          percent={relevance != null ? Math.min(relevance, 100) : 0}
          size="small"
          strokeColor={progressColor}
          showInfo={false}
        />
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
        <span>适配度 {product_fit != null ? `${product_fit}/5` : "-"}</span>
        <span>自然率 {natural_rate != null ? `${natural_rate.toFixed(1)}%` : "-"}</span>
      </div>
    </div>
  );
}
