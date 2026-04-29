import React from "react";
import { Progress } from "antd";

export default function KpiCard({ icon, label, value, suffix = "%", sub, threshold }) {
  const numValue = value !== null && value !== undefined ? Number(value) : null;
  const isPass = threshold != null && numValue != null ? numValue >= threshold : null;

  // 进度条颜色
  const strokeColor = isPass === true ? "#16a34a" : isPass === false ? "#dc2626" : "#2563eb";

  return (
    <div className="kpi-card animate-fade-in">
      <div className="kpi-label">
        {icon} {label}
      </div>
      <div className="kpi-value accent">
        {numValue !== null ? `${numValue.toFixed(1)}${suffix}` : "-"}
      </div>
      {threshold != null && numValue !== null && (
        <Progress
          percent={Math.min(numValue, 100)}
          size="small"
          strokeColor={strokeColor}
          trailColor="#e5e7eb"
          showInfo={false}
          style={{ marginBottom: 4 }}
        />
      )}
      {threshold != null && (
        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>
          目标: {threshold}%
          {isPass !== null && (
            <span style={{ marginLeft: 6, color: isPass ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
              {isPass ? "✓ 达标" : "✗ 未达标"}
            </span>
          )}
        </div>
      )}
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
