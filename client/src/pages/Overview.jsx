import React, { useState, useEffect, useRef } from 'react'
import { Typography, Empty, Spin, Progress } from 'antd'
import { StarOutlined, SwapOutlined, AlertOutlined, CheckCircleOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import KpiCard from '../components/KpiCard'
import MonthPicker from '../components/MonthPicker'
import FileUpload from '../components/FileUpload'
import ScreenshotButton from '../components/ScreenshotButton'
import ExportButton from '../components/ExportButton'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { EMPTY_MESSAGES } from '../utils/constants'

const { Title } = Typography

/**
 * Overview page - displays KPIs and summary charts
 */
function Overview() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const containerRef = useRef(null)

  const { get } = useApi()
  const { isAdmin } = useAuth()

  // Fetch overview data when month changes
  useEffect(() => {
    const fetchData = async () => {
      if (!month) return

      setLoading(true)
      setError(null)

      try {
        const result = await get(`/api/overview?month=${month}`)
        setData(result)
      } catch (err) {
        setError(err.message)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [month, get])

  // Handle upload success - refresh data
  const handleUploadSuccess = (result) => {
    const nextMonth = result?.month || month
    if (nextMonth && nextMonth !== month) {
      setMonth(nextMonth)
      return
    }

    if (nextMonth) {
      // Refetch data after successful upload
      get(`/api/overview?month=${nextMonth}`)
        .then(setData)
        .catch(console.error)
    }
  }

  // KPI cards data
  const kpiData = data?.summary ? [
    {
      key: 'recommend',
      icon: <StarOutlined style={{ color: '#2563eb' }} />,
      label: '推荐词露出率',
      value: data.summary.recommend?.exposureRate,
      sub: `${data.summary.recommend?.exposed || 0}/${data.summary.recommend?.total || 0} 条露出`,
      threshold: 80,
    },
    {
      key: 'compare',
      icon: <SwapOutlined style={{ color: '#16a34a' }} />,
      label: '对比词偏向智己占比',
      value: data.summary.compare?.favorRate,
      sub: `${data.summary.compare?.favor || 0}/${data.summary.compare?.total || 0} 条偏向`,
      threshold: 70,
    },
    {
      key: 'sentiment',
      icon: <AlertOutlined style={{ color: '#d97706' }} />,
      label: '舆情词正面占比',
      value: data.summary.sentiment?.positiveRate,
      sub: `${data.summary.sentiment?.positive || 0}/${data.summary.sentiment?.total || 0} 条正面`,
      threshold: 60,
    },
    {
      key: 'pass',
      icon: <CheckCircleOutlined style={{ color: '#2563eb' }} />,
      label: '整体考核通过率',
      value: data.overallPassRate,
      sub: data?.passSummary
        ? `达标 ${data.passSummary.passed || 0} / 总计 ${data.passSummary.total || 0}`
        : null,
      threshold: null,
    },
  ] : []

  // 页面头部（所有状态共用）
  const pageHeader = (
    <div className="dashboard-header" style={{ marginBottom: 24 }}>
      <div>
        <Title level={4} style={{ margin: 0 }}>
          数据总览
        </Title>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          {data ? `考核月份: ${month} | 关键词总数: ${data?.summary?.totalKeywords || 0}` : (month ? `考核月份: ${month}` : '')}
        </div>
      </div>
      <div className="upload-section">
        <MonthPicker value={month} onChange={setMonth} />
        {isAdmin && <FileUpload month={month} onSuccess={handleUploadSuccess} />}
        {data && <ExportButton targetRef={containerRef} month={month} />}
        <ScreenshotButton targetRef={containerRef} filename={`overview-${month}`} />
      </div>
    </div>
  )

  // Platform bar chart options
  const getPlatformBarOption = () => {
    if (!data?.platformStats) return null

    const platforms = data.platformStats.map(p => p.platform)
    const exposureRates = data.platformStats.map(p => {
      const rate = p.totalRecords > 0 ? (p.exposed / p.totalRecords * 100).toFixed(1) : 0
      return parseFloat(rate)
    })
    const favorRates = data.platformStats.map(p => {
      const rate = p.totalRecords > 0 ? (p.favor / p.totalRecords * 100).toFixed(1) : 0
      return parseFloat(rate)
    })
    const positiveRates = data.platformStats.map(p => {
      const rate = p.totalRecords > 0 ? (p.positive / p.totalRecords * 100).toFixed(1) : 0
      return parseFloat(rate)
    })

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#ffffff',
        borderColor: '#e5e7eb',
        textStyle: { color: '#1f2937' },
      },
      legend: {
        data: ['露出率', '偏向率', '正面率'],
        textStyle: { color: '#6b7280' },
        top: 10,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: platforms,
        axisLabel: { color: '#6b7280' },
        axisLine: { lineStyle: { color: '#e5e7eb' } },
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { color: '#6b7280', formatter: '{value}%' },
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
      },
      series: [
        {
          name: '露出率',
          type: 'bar',
          data: exposureRates,
          itemStyle: { color: '#2563eb' },
          barWidth: '20%',
        },
        {
          name: '偏向率',
          type: 'bar',
          data: favorRates,
          itemStyle: { color: '#16a34a' },
          barWidth: '20%',
        },
        {
          name: '正面率',
          type: 'bar',
          data: positiveRates,
          itemStyle: { color: '#d97706' },
          barWidth: '20%',
        },
      ],
    }
  }

  // Radar chart for three-tier keyword compliance rates
  const getRadarOption = () => {
    if (!data?.summary) return null

    // Get actual compliance rates from summary data
    const recommendRate = data.summary.recommend?.exposureRate || 0
    const compareRate = data.summary.compare?.favorRate || 0
    const sentimentRate = data.summary.sentiment?.positiveRate || 0

    return {
      tooltip: {
        backgroundColor: '#ffffff',
        borderColor: '#e5e7eb',
        textStyle: { color: '#1f2937' },
      },
      legend: {
        data: ['三类词达标率'],
        textStyle: { color: '#6b7280' },
        top: 10,
      },
      radar: {
        indicator: [
          { name: '推荐词达标率', max: 100 },
          { name: '对比词达标率', max: 100 },
          { name: '舆情词达标率', max: 100 },
        ],
        axisName: { color: '#6b7280' },
        splitLine: { lineStyle: { color: '#e5e7eb' } },
        splitArea: { areaStyle: { color: ['#f8faff', '#f0f2ff'] } },
        axisLine: { lineStyle: { color: '#e5e7eb' } },
      },
      series: [
        {
          name: '三类词达标率',
          type: 'radar',
          data: [
            {
              value: [recommendRate, compareRate, sentimentRate],
              name: '三类词达标率',
              areaStyle: { color: 'rgba(37, 99, 235, 0.2)' },
              lineStyle: { color: '#2563eb' },
              itemStyle: { color: '#2563eb' },
            },
          ],
        },
      ],
    }
  }

  // Empty state when no data
  if (!loading && !error && !data) {
    return (
      <div ref={containerRef}>
        {pageHeader}

        <Empty
          description={EMPTY_MESSAGES.NO_DATA}
          style={{
            padding: '80px 40px',
            background: 'var(--bg-card)',
            borderRadius: 16,
            border: '1px solid var(--border-color)',
          }}
        />
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div ref={containerRef}>
        {pageHeader}

        <Empty
          description={EMPTY_MESSAGES.ERROR}
          style={{
            padding: '80px 40px',
            background: 'var(--bg-card)',
            borderRadius: 16,
            border: '1px solid var(--border-color)',
          }}
        />
      </div>
    )
  }

  return (
    <div ref={containerRef}>
      {/* Header with controls */}
      {pageHeader}

      {/* KPI Cards */}
      <div className="kpi-row">
        {kpiData.map((kpi) => (
          <KpiCard
            key={kpi.key}
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            sub={kpi.sub}
            threshold={kpi.threshold}
          />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Platform Bar Chart */}
        <div className="chart-card">
          <div className="chart-title">平台指标对比</div>
          {getPlatformBarOption() ? (
            <ReactECharts
              option={getPlatformBarOption()}
              style={{ height: 300 }}
              notMerge={true}
            />
          ) : (
            <Empty description={EMPTY_MESSAGES.NO_DATA} />
          )}
        </div>

        {/* Radar Chart */}
        <div className="chart-card">
          <div className="chart-title">三类词达标率</div>
          {getRadarOption() ? (
            <ReactECharts
              option={getRadarOption()}
              style={{ height: 300 }}
              notMerge={true}
            />
          ) : (
            <Empty description={EMPTY_MESSAGES.NO_DATA} />
          )}
        </div>
      </div>

      {/* Monthly Trend Placeholder */}
      <div className="chart-card" style={{ marginTop: 24, textAlign: 'center', padding: '32px 24px', color: 'var(--text-muted)' }}>
        <div className="chart-title" style={{ justifyContent: 'center' }}>月度达标率趋势</div>
        <div style={{ marginTop: 16, fontSize: 13 }}>历史趋势数据待接入（功能开发中）</div>
      </div>

      {/* Tier Distribution Summary */}
      {data?.tierDistribution && (
        <div className="chart-card" style={{ marginTop: 24 }}>
          <div className="chart-title">考核等级分布</div>
          {(() => {
            const total = (data.tierDistribution['一级']?.count || 0) +
                          (data.tierDistribution['二级']?.count || 0) +
                          (data.tierDistribution['三级']?.count || 0)
            const tierColors = { '一级': '#dc2626', '二级': '#d97706', '三级': '#16a34a' }
            const tierDesc = { '一级': '关联度 ≤30%', '二级': '关联度 30-50%', '三级': '关联度 50-60%' }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
                {['一级', '二级', '三级'].map(tier => {
                  const count = data.tierDistribution[tier]?.count || 0
                  const pct = total > 0 ? (count / total * 100) : 0
                  const color = tierColors[tier]
                  return (
                    <div key={tier}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>
                          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color, marginRight: 8 }} />
                          {tier}词包
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{tierDesc[tier]}</span>
                        </span>
                        <span style={{ fontWeight: 700, color }}>
                          {count} 条 ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress percent={pct} size="small" strokeColor={color} showInfo={false} trailColor="#f3f4f6" />
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default Overview
