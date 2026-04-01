import React, { useState, useEffect, useRef } from "react";
import { Spin, Empty, Table, Tag, Select } from "antd";
import { SwapOutlined } from "@ant-design/icons";
import MonthPicker from "../components/MonthPicker";
import ScreenshotButton from "../components/ScreenshotButton";
import SettlementSummary from "../components/SettlementSummary";
import KpiCard from "../components/KpiCard";
import { useApi } from "../hooks/useApi";
import { PLATFORM_LIST } from "../utils/constants";

export default function CompareDetail() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [data, setData] = useState(null);
  const [platformFilter, setPlatformFilter] = useState(null);
  const { fetchApi, loading } = useApi();
  const contentRef = useRef(null);

  useEffect(() => {
    if (month) {
      fetchApi(`/api/keywords/compare?month=${month}`)
        .then(setData)
        .catch(() => setData(null));
    }
  }, [month]);

  const filteredDetail = data
    ? data.detail.filter((d) => (!platformFilter || d.platform === platformFilter))
    : [];

  const filteredSettlement = data
    ? data.settlementSummary.filter((s) => (!platformFilter || s.platform === platformFilter))
    : [];

  const detailColumns = [
    { title: "词根", dataIndex: "word_root", key: "word_root", width: 250 },
    { title: "问句", dataIndex: "word", key: "word", ellipsis: true },
    { title: "平台", dataIndex: "platform", key: "platform", width: 90 },
    { title: "检测日期", dataIndex: "check_date", key: "check_date", width: 110 },
    {
      title: "偏向智己",
      dataIndex: "favor_zhiji",
      key: "favor_zhiji",
      width: 90,
      render: (v) =>
        v === 1 ? <Tag color="success">是</Tag> : v === 0 ? <Tag color="error">否</Tag> : "-",
    },
    { title: "截图编码", dataIndex: "screenshot_code", key: "screenshot_code", width: 120 },
  ];

  return (
    <div ref={contentRef}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 className="dashboard-title">
          <SwapOutlined /> 对比词详情
        </h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Select
            placeholder="平台"
            allowClear
            onChange={setPlatformFilter}
            style={{ width: 120 }}
            options={PLATFORM_LIST.map((p) => ({ value: p.id, label: p.name }))}
          />
          <MonthPicker value={month} onChange={setMonth} />
          <ScreenshotButton targetRef={contentRef} filename="对比词详情" />
        </div>
      </div>

      <Spin spinning={loading}>
        {data ? (
          <>
            <div className="kpi-row" style={{ gridTemplateColumns: "1fr", maxWidth: 300, marginBottom: 24 }}>
              <KpiCard
                icon={<SwapOutlined />}
                label="整体偏向智己占比"
                value={data.overallFavorRate}
              />
            </div>

            <div className="table-section" style={{ marginBottom: 32 }}>
              <h3 className="chart-title">检测明细</h3>
              <Table
                columns={detailColumns}
                dataSource={filteredDetail.map((d, i) => ({ ...d, key: i }))}
                pagination={{ pageSize: 20 }}
                size="middle"
              />
            </div>

            <div className="table-section">
              <h3 className="chart-title">结算摘要</h3>
              <SettlementSummary
                data={filteredSettlement}
                rateField="favorRate"
                rateLabel="偏向智己占比"
                showTier={false}
              />
            </div>
          </>
        ) : (
          <Empty description="暂无数据" />
        )}
      </Spin>
    </div>
  );
}