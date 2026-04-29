import React, { useState, useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import { Spin, Empty, Table, Tag, Tabs, Select } from 'antd'
import { StarOutlined } from '@ant-design/icons'
import MonthPicker from '../components/MonthPicker'
import ScreenshotButton from '../components/ScreenshotButton'
import RelevanceCard from '../components/RelevanceCard'
import SettlementSummary from '../components/SettlementSummary'
import { useApi } from '../hooks/useApi'
import { TIER_COLORS, TIER_LABELS, TIER_LIST } from '../utils/constants'

// 平台 Tab 配置
const platformTabs = [
  { key: 'all', label: '全部' },
  { key: '豆包', label: '豆包' },
  { key: '千问', label: '千问' },
  { key: 'DeepSeek', label: 'DeepSeek' },
  { key: '元宝', label: '元宝' },
]

/**
 * Recommend Detail Page
 * Displays recommended keyword performance data with:
 * - Relevance cards overview (sorted by lowest relevance first)
 * - Detail table with word_root, word, platform, check_date, is_exposed, screenshot_code
 * - Settlement summary grouped by word_root x platform
 */
function Recommend() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [data, setData] = useState(null)
  const [platformFilter, setPlatformFilter] = useState(null)
  const [tierFilter, setTierFilter] = useState(null)
  const [wordRootFilter, setWordRootFilter] = useState(null)
  const { fetchApi, loading } = useApi()
  const contentRef = useRef(null)

  // 获取词根列表
  const getWordRoots = () => {
    if (!data?.relevanceCards) return []
    const roots = new Set(data.relevanceCards.map((c) => c.word_root).filter(Boolean))
    return Array.from(roots).sort()
  }

  useEffect(() => {
    if (month) {
      fetchApi(`/api/keywords/recommend?month=${month}`)
        .then(setData)
        .catch(() => setData(null))
    }
  }, [month])

  const filteredCards = data
    ? data.relevanceCards
        ?.filter((c) => (!platformFilter || c.platform === platformFilter))
        ?.filter((c) => (!tierFilter || c.tier === tierFilter))
        ?.filter((c) => (!wordRootFilter || c.word_root === wordRootFilter))
        ?.sort((a, b) => (a.relevance || 0) - (b.relevance || 0)) || []
    : []

  const filteredDetail = data
    ? data.detail?.filter((d) => (!platformFilter || d.platform === platformFilter))
        ?.filter((d) => (!tierFilter || d.tier === tierFilter))
        ?.filter((d) => (!wordRootFilter || d.word_root === wordRootFilter)) || []
    : []

  const filteredSettlement = data
    ? data.settlementSummary?.filter((s) => (!platformFilter || s.platform === platformFilter))
        ?.filter((s) => (!tierFilter || s.tier === tierFilter))
        ?.filter((s) => (!wordRootFilter || s.word_root === wordRootFilter)) || []
    : []

  const detailColumns = [
    {
      title: '词根',
      dataIndex: 'word_root',
      key: 'word_root',
      width: 200,
      render: (text, record) => (
        <span>
          {text}
          {record.tier && (
            <Tag color={TIER_COLORS[record.tier]} style={{ marginLeft: 8, fontSize: 11 }}>
              {TIER_LABELS[record.tier] || record.tier}
            </Tag>
          )}
        </span>
      ),
    },
    { title: '问句', dataIndex: 'word', key: 'word', ellipsis: true },
    { title: '平台', dataIndex: 'platform', key: 'platform', width: 90 },
    { title: '检测日期', dataIndex: 'check_date', key: 'check_date', width: 110 },
    {
      title: '露出',
      dataIndex: 'is_exposed',
      key: 'is_exposed',
      width: 70,
      render: (v) =>
        v === 1 ? <Tag color="success">是</Tag> : v === 0 ? <Tag color="default">否</Tag> : '-',
    },
    { title: '截图编码', dataIndex: 'screenshot_code', key: 'screenshot_code', width: 120 },
  ]

  return (
    <div ref={contentRef}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <h1 className="dashboard-title">
          <StarOutlined /> 推荐词详情
        </h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Select
            placeholder="词根"
            allowClear
            onChange={setWordRootFilter}
            style={{ width: 150 }}
            options={getWordRoots().map((r) => ({ value: r, label: r }))}
          />
          <Select
            placeholder="词包级别"
            allowClear
            onChange={setTierFilter}
            style={{ width: 120 }}
            options={TIER_LIST.map((t) => ({ value: t, label: TIER_LABELS[t] || t }))}
          />
          <MonthPicker value={month} onChange={setMonth} />
          <ScreenshotButton targetRef={contentRef} filename="推荐词详情" />
        </div>
      </div>

      {/* 平台筛选 Tabs */}
      <Tabs
        activeKey={platformFilter || 'all'}
        onChange={(key) => setPlatformFilter(key === 'all' ? null : key)}
        items={platformTabs.map(t => ({ key: t.key, label: t.label }))}
        style={{ marginBottom: 16 }}
      />

      <Spin spinning={loading}>
        {data ? (
          <>
            {/* Relevance Cards — prominently displayed */}
            {filteredCards.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 className="chart-title">关联度总览</h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 12,
                  }}
                >
                  {filteredCards.map((card, i) => (
                    <RelevanceCard key={i} data={card} />
                  ))}
                </div>
              </div>
            )}

            {/* Detail Table */}
            <div className="table-section" style={{ marginBottom: 32 }}>
              <h3 className="chart-title">检测明细</h3>
              <Table
                columns={detailColumns}
                dataSource={filteredDetail.map((d, i) => ({ ...d, key: i }))}
                pagination={{ pageSize: 20 }}
                size="middle"
              />
            </div>

            {/* Settlement Summary */}
            <div className="table-section">
              <h3 className="chart-title">结算摘要</h3>
              <SettlementSummary data={filteredSettlement} rateField="exposureRate" rateLabel="露出率" />
            </div>
          </>
        ) : (
          <Empty description="暂无数据" />
        )}
      </Spin>
    </div>
  )
}

export default Recommend