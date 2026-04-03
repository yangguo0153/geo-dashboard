import React, { useState, useEffect, useRef } from "react";
import dayjs from 'dayjs';
import { Spin, Empty } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import MonthPicker from "../components/MonthPicker";
import ScreenshotButton from "../components/ScreenshotButton";
import SettlementSummary from "../components/SettlementSummary";
import KpiCard from "../components/KpiCard";
import { useApi } from "../hooks/useApi";

export default function Settlement() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [data, setData] = useState(null);
  const { fetchApi, loading } = useApi();
  const contentRef = useRef(null);

  const sentimentSummaryData = (data?.sentiment || []).map((item) => ({
    ...item,
    word_root: item.tier,
    platform: "汇总",
  }));

  useEffect(() => {
    if (month) {
      fetchApi(`/api/settlement?month=${month}`)
        .then(setData)
        .catch(() => setData(null));
    }
  }, [month]);

  return (
    <div ref={contentRef}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 className="dashboard-title">
          <CheckCircleOutlined /> 结算汇总
        </h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <MonthPicker value={month} onChange={setMonth} />
          <ScreenshotButton targetRef={contentRef} filename="结算汇总" />
        </div>
      </div>

      <Spin spinning={loading}>
        {data ? (
          <>
            <div className="kpi-row" style={{ gridTemplateColumns: "1fr", maxWidth: 300, marginBottom: 32 }}>
              <KpiCard
                icon={<CheckCircleOutlined />}
                label="整体考核通过率"
                value={data.overallPassRate}
                sub={data?.passSummary ? `达标 ${data.passSummary.passed} / 总计 ${data.passSummary.total}` : null}
              />
            </div>

            {data.recommend?.length > 0 && (
              <div className="table-section" style={{ marginBottom: 32 }}>
                <h3 className="chart-title">推荐词结算</h3>
                <SettlementSummary
                  data={data.recommend}
                  rateField="exposureRate"
                  rateLabel="露出率"
                />
              </div>
            )}

            {data.compare?.length > 0 && (
              <div className="table-section" style={{ marginBottom: 32 }}>
                <h3 className="chart-title">对比词结算</h3>
                <SettlementSummary
                  data={data.compare}
                  rateField="favorRate"
                  rateLabel="偏向智己占比"
                />
              </div>
            )}

            {sentimentSummaryData.length > 0 && (
              <div className="table-section" style={{ marginBottom: 32 }}>
                <h3 className="chart-title">舆情词结算</h3>
                <SettlementSummary
                  data={sentimentSummaryData}
                  rateField="positiveRate"
                  rateLabel="正面回答占比"
                  showTier={false}
                />
              </div>
            )}
          </>
        ) : (
          <Empty description="暂无数据" />
        )}
      </Spin>
    </div>
  );
}
