import React from "react";

export default function KpiCard({ icon, label, value, suffix = "%", sub }) {
  return (
    <div className="kpi-card animate-fade-in">
      <div className="kpi-label">
        {icon} {label}
      </div>
      <div className="kpi-value accent">
        {value !== null && value !== undefined ? `${Number(value).toFixed(1)}${suffix}` : "-"}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}