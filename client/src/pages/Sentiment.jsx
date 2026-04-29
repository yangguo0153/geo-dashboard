import React, { useState, useEffect, useRef } from 'react'
import { Card, Typography, Empty, Table, Tag, Tabs, Spin, message } from 'antd'
import { AlertOutlined, CheckCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

import KpiCard from '../components/KpiCard'
import MonthPicker from '../components/MonthPicker'
import ScreenshotButton from '../components/ScreenshotButton'
import SettlementSummary from '../components/SettlementSummary'
import { useApi } from '../hooks/useApi'

const { Title } = Typography

// 平台 Tab 配置
const platformTabs = [
  { key: 'all', label: '全部' },
  { key: '豆包', label: '豆包' },
  { key: '千问', label: '千问' },
  { key: 'DeepSeek', label: 'DeepSeek' },
  { key: '元宝', label: '元宝' },
]

// Sentiment color mapping
const SENTIMENT_COLORS = {
  '正面': 'success',
  '中性': 'default',
  '负面': 'error',
}

// Sentiment thresholds by tier type (for display)
const SENTIMENT_THRESHOLDS = {
  '品牌技术': { full: 70, partial: 50 },
  '一级车型': { full: 65, partial: 50 },
  '二级车型': { full: 60, partial: 50 },
  '三级车型': { full: 55, partial: 50 },
}

/**
 * Sentiment Detail Page
 * Displays sentiment keyword performance data with:
 * - KPI card for overall positive rate
 * - Platform filter
 * - Detail table with sentiment tags
 * - Settlement summary by tier type
 */
function Sentiment() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [platformFilter, setPlatformFilter] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const pageRef = useRef(null)
  const { get } = useApi()

  // Fetch data when month changes
  useEffect(() => {
    fetchData()
  }, [month])

  const fetchData = async () => {
    if (!month) return

    setLoading(true)
    try {
      const result = await get('/api/keywords/sentiment', { month })
      setData(result)
    } catch (err) {
      message.error('加载舆情词数据失败')
      console.error('Sentiment fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate overall positive rate for KPI
  const calculatePositiveRate = () => {
    if (!data?.summary) return null
    const { total, positive } = data.summary
    if (total === 0) return 0
    return (positive / total) * 100
  }

  // Get unique platforms from data
  const getPlatforms = () => {
    if (!data?.keywords) return []
    const platforms = new Set(data.keywords.map(k => k.platform))
    return Array.from(platforms)
  }

  // Filter keywords by platform
  const getFilteredKeywords = () => {
    if (!data?.keywords) return []
    if (!platformFilter) return data.keywords
    return data.keywords.filter(k => k.platform === platformFilter)
  }

  // Prepare settlement summary data
  const getSettlementData = () => {
    if (!data?.byTier) return []

    return Object.entries(data.byTier).map(([tierType, keywords]) => {
      // Aggregate settlement info for each tier type
      const summary = keywords.reduce((acc, k) => ({
        total: acc.total + (k.settlement?.total || 0),
        positive: acc.positive + (k.settlement?.positive || 0),
      }), { total: 0, positive: 0 })

      const positiveRate = summary.total > 0 ? (summary.positive / summary.total * 100).toFixed(1) : 0
      const thresholds = SENTIMENT_THRESHOLDS[tierType] || { full: 55, partial: 50 }

      let settlementRatio = 0
      if (positiveRate >= thresholds.full) settlementRatio = 1
      else if (positiveRate >= thresholds.partial) settlementRatio = 0.6

      return {
        tier: tierType,
        word_root: tierType,
        platform: '汇总',
        settlementRatio,
        positiveRate,
        [ Symbol.for('total') ]: summary.total,
        [ Symbol.for('positive') ]: summary.positive,
      }
    })
  }

  // Flatten records for detail table
  const getDetailTableData = () => {
    const keywords = getFilteredKeywords()
    const rows = []

    keywords.forEach(keyword => {
      (keyword.records || []).forEach((record, idx) => {
        rows.push({
          key: `${keyword.id}-${idx}`,
          word_root: keyword.wordRoot,
          word: keyword.word,
          platform: keyword.platform,
          check_date: record.date,
          sentiment: record.sentiment,
          tier_type: keyword.tierType,
          screenshot_code: record.screenshotCode || '-',
        })
      })
    })

    return rows
  }

  // Detail table columns
  const detailColumns = [
    {
      title: '词根',
      dataIndex: 'word_root',
      key: 'word_root',
      width: 120,
      fixed: 'left',
    },
    {
      title: '关键词',
      dataIndex: 'word',
      key: 'word',
      width: 150,
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      filters: getPlatforms().map(p => ({ text: p, value: p })),
      onFilter: (value, record) => record.platform === value,
    },
    {
      title: '检查日期',
      dataIndex: 'check_date',
      key: 'check_date',
      width: 120,
    },
    {
      title: '情感',
      dataIndex: 'sentiment',
      key: 'sentiment',
      width: 80,
      render: (sentiment) => {
        if (!sentiment) return <Tag>未知</Tag>
        return (
          <Tag color={SENTIMENT_COLORS[sentiment] || 'default'}>
            {sentiment}
          </Tag>
        )
      },
      filters: [
        { text: '正面', value: '正面' },
        { text: '中性', value: '中性' },
        { text: '负面', value: '负面' },
      ],
      onFilter: (value, record) => record.sentiment === value,
    },
    {
      title: '词包类型',
      dataIndex: 'tier_type',
      key: 'tier_type',
      width: 100,
    },
    {
      title: '截图编码',
      dataIndex: 'screenshot_code',
      key: 'screenshot_code',
      width: 120,
    },
  ]

  // Settlement summary columns (tier-specific)
  const summaryColumns = [
    {
      title: '词包类型',
      dataIndex: 'tier',
      key: 'tier',
      width: 120,
    },
    {
      title: '全额阈值',
      key: 'fullThreshold',
      width: 100,
      render: (_, record) => {
        const thresholds = SENTIMENT_THRESHOLDS[record.tier] || { full: 55 }
        return `${thresholds.full}%`
      },
    },
    {
      title: '部分阈值',
      key: 'partialThreshold',
      width: 100,
      render: (_, record) => {
        const thresholds = SENTIMENT_THRESHOLDS[record.tier] || { partial: 50 }
        return `${thresholds.partial}%`
      },
    },
    {
      title: '正面率',
      dataIndex: 'positiveRate',
      key: 'positiveRate',
      width: 100,
      render: (val) => (
        <span style={{ color: val >= 70 ? '#10b981' : val >= 50 ? '#f59e0b' : '#ef4444' }}>
          {val}%
        </span>
      ),
    },
    {
      title: '结算比例',
      dataIndex: 'settlementRatio',
      key: 'settlementRatio',
      width: 100,
      render: (ratio) => {
        if (ratio >= 1) return <Tag color="success">100%</Tag>
        if (ratio > 0) return <Tag color="warning">60%</Tag>
        return <Tag color="error">0%</Tag>
      },
    },
  ]

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    )
  }

  const positiveRate = calculatePositiveRate()

  return (
    <div ref={pageRef}>
      {/* Header with controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <AlertOutlined style={{ marginRight: 8 }} />
          舆情词详情
        </Title>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <MonthPicker value={month} onChange={setMonth} />
          <ScreenshotButton targetRef={pageRef} filename={`sentiment-${month}`} />
        </div>
      </div>

      {/* KPI Card */}
      <div className="kpi-row" style={{ marginBottom: 24 }}>
        <KpiCard
          icon={<CheckCircleOutlined style={{ color: '#10b981' }} />}
          label="整体正面回答占比"
          value={positiveRate}
          sub={data?.summary ? `正面: ${data.summary.positive} / 总计: ${data.summary.total}` : null}
        />
      </div>

      {/* 平台筛选 Tabs */}
      <Tabs
        activeKey={platformFilter || 'all'}
        onChange={(key) => setPlatformFilter(key === 'all' ? null : key)}
        items={platformTabs.map(t => ({ key: t.key, label: t.label }))}
        style={{ marginBottom: 16 }}
      />

      {/* Settlement Summary */}
      {data?.byTier && Object.keys(data.byTier).length > 0 && (
        <Card className="chart-card" style={{ marginBottom: 24 }}>
          <Title level={5} className="chart-title">
            舆情词结算汇总（按词包类型）
          </Title>
          <Table
            columns={summaryColumns}
            dataSource={getSettlementData().map((d, i) => ({ ...d, key: i }))}
            pagination={false}
            size="small"
            bordered
          />
        </Card>
      )}

      {/* Detail Table */}
      <Card className="table-section">
        <div className="table-header">
          <span className="table-title">舆情词详细记录</span>
        </div>
        {data?.keywords && data.keywords.length > 0 ? (
          <Table
            columns={detailColumns}
            dataSource={getDetailTableData()}
            pagination={{ pageSize: 20 }}
            size="middle"
            scroll={{ x: 1000 }}
          />
        ) : (
          <Empty description="暂无舆情词数据" />
        )}
      </Card>
    </div>
  )
}

export default Sentiment