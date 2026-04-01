import React, { useState, useEffect, useRef } from 'react'
import { Typography, Empty, Spin } from 'antd'
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
  const { token } = useAuth()

  // Check if user is admin by comparing token
  const isAdmin = token === import.meta.env.VITE_ADMIN_TOKEN ||
                  localStorage.getItem('geo_dashboard_role') === 'admin'

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
  const handleUploadSuccess = () => {
    if (month) {
      // Refetch data after successful upload
      get(`/api/overview?month=${month}`)
        .then(setData)
        .catch(console.error)
    }
  }

  // Calculate overall pass rate from tier distribution
  const calculatePassRate = (tierDistribution) => {
    if (!tierDistribution) return null
    const total = tierDistribution['一级']?.count +
                  tierDistribution['二级']?.count +
                  tierDistribution['三级']?.count || 0
    if (total === 0) return null
    const passed = tierDistribution['一级']?.count || 0
    return ((passed / total) * 100).toFixed(1)
  }

  // KPI cards data
  const kpiData = data?.summary ? [
    {
      key: 'recommend',
      icon: <StarOutlined style={{ color: '#00d4ff' }} />,
      label: '推荐词露出率',
      value: data.summary.recommend?.exposureRate,
      sub: `${data.summary.recommend?.exposed || 0}/${data.summary.recommend?.total || 0} 条露出`,
    },
    {
      key: 'compare',
      icon: <SwapOutlined style={{ color: '#10b981' }} />,
      label: '对比词偏向智己占比',
      value: data.summary.compare?.favorRate,
      sub: `${data.summary.compare?.favor || 0}/${data.summary.compare?.total || 0} 条偏向`,
    },
    {
      key: 'sentiment',
      icon: <AlertOutlined style={{ color: '#6366f1' }} />,
      label: '舆情词正面占比',
      value: data.summary.sentiment?.positiveRate,
      sub: `${data.summary.sentiment?.positive || 0}/${data.summary.sentiment?.total || 0} 条正面`,
    },
    {
      key: 'pass',
      icon: <CheckCircleOutlined style={{ color: '#f59e0b' }} />,
      label: '整体考核通过率',
      value: calculatePassRate(data?.tierDistribution),
      sub: data?.tierDistribution ?
        `一级 ${data.tierDistribution['一级']?.count || 0} / 总计 ${
          (data.tierDistribution['一级']?.count || 0) +
          (data.tierDistribution['二级']?.count || 0) +
          (data.tierDistribution['三级']?.count || 0)
        }` : null,
    },
  ] : []

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
        backgroundColor: '#1a2332',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc' },
      },
      legend: {
        data: ['露出率', '偏向率', '正面率'],
        textStyle: { color: '#94a3b8' },
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
        axisLabel: { color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { color: '#94a3b8', formatter: '{value}%' },
        axisLine: { lineStyle: { color: '#334155' } },
        splitLine: { lineStyle: { color: '#334155', opacity: 0.3 } },
      },
      series: [
        {
          name: '露出率',
          type: 'bar',
          data: exposureRates,
          itemStyle: { color: '#00d4ff' },
          barWidth: '20%',
        },
        {
          name: '偏向率',
          type: 'bar',
          data: favorRates,
          itemStyle: { color: '#10b981' },
          barWidth: '20%',
        },
        {
          name: '正面率',
          type: 'bar',
          data: positiveRates,
          itemStyle: { color: '#6366f1' },
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
        backgroundColor: '#1a2332',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc' },
      },
      legend: {
        data: ['三类词达标率'],
        textStyle: { color: '#94a3b8' },
        top: 10,
      },
      radar: {
        indicator: [
          { name: '推荐词达标率', max: 100 },
          { name: '对比词达标率', max: 100 },
          { name: '舆情词达标率', max: 100 },
        ],
        axisName: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#334155', opacity: 0.3 } },
        splitArea: { areaStyle: { color: ['#1a2332', '#111827'] } },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      series: [
        {
          name: '三类词达标率',
          type: 'radar',
          data: [
            {
              value: [recommendRate, compareRate, sentimentRate],
              name: '三类词达标率',
              areaStyle: { color: 'rgba(0, 212, 255, 0.3)' },
              lineStyle: { color: '#00d4ff' },
              itemStyle: { color: '#00d4ff' },
            },
          ],
        },
      ],
    }
  }

  // Trend line chart for monthly pass rates (past 6 months)
  const getTrendLineOption = () => {
    if (!data?.summary) return null

    // Generate past 6 months labels
    const currentMonth = dayjs(month)
    const months = []
    for (let i = 5; i >= 0; i--) {
      months.push(currentMonth.subtract(i, 'month').format('YYYY-MM'))
    }

    // TODO: When backend supports historical data via /api/overview?months=6
    // For now, use current month data as placeholder
    const recommendRate = parseFloat(data.summary.recommend?.exposureRate) || 0
    const compareRate = parseFloat(data.summary.compare?.favorRate) || 0
    const sentimentRate = parseFloat(data.summary.sentiment?.positiveRate) || 0

    // Placeholder: use current data for all months
    // Backend should return array of monthly data in the future
    const recommendData = Array(6).fill(recommendRate)
    const compareData = Array(6).fill(compareRate)
    const sentimentData = Array(6).fill(sentimentRate)

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1a2332',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc' },
        formatter: (params) => {
          let result = `<div style="font-weight: bold; margin-bottom: 8px;">${params[0].axisValue}</div>`
          params.forEach(param => {
            result += `<div style="display: flex; justify-content: space-between; gap: 24px;">
              <span>${param.marker} ${param.seriesName}</span>
              <span style="font-weight: bold;">${param.value}%</span>
            </div>`
          })
          return result
        },
      },
      legend: {
        data: ['推荐词露出率', '对比词偏向率', '舆情词正面率'],
        textStyle: { color: '#94a3b8' },
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
        data: months,
        axisLabel: { color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { color: '#94a3b8', formatter: '{value}%' },
        axisLine: { lineStyle: { color: '#334155' } },
        splitLine: { lineStyle: { color: '#334155', opacity: 0.3 } },
      },
      series: [
        {
          name: '推荐词露出率',
          type: 'line',
          data: recommendData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#00d4ff', width: 2 },
          itemStyle: { color: '#00d4ff' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(0, 212, 255, 0.3)' },
                { offset: 1, color: 'rgba(0, 212, 255, 0.05)' },
              ],
            },
          },
        },
        {
          name: '对比词偏向率',
          type: 'line',
          data: compareData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#10b981', width: 2 },
          itemStyle: { color: '#10b981' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.05)' },
              ],
            },
          },
        },
        {
          name: '舆情词正面率',
          type: 'line',
          data: sentimentData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#6366f1', width: 2 },
          itemStyle: { color: '#6366f1' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(99, 102, 241, 0.3)' },
                { offset: 1, color: 'rgba(99, 102, 241, 0.05)' },
              ],
            },
          },
        },
      ],
    }
  }

  // Empty state when no data
  if (!loading && !error && !data) {
    return (
      <div ref={containerRef}>
        <div className="dashboard-header" style={{ marginBottom: 24 }}>
          <div>
            <Title level={4} style={{ margin: 0, color: '#f8fafc' }}>
              数据总览
            </Title>
            <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>
              {month && `考核月份: ${month}`}
            </div>
          </div>
          <div className="upload-section">
            <MonthPicker value={month} onChange={setMonth} />
            {isAdmin && <FileUpload month={month} onSuccess={handleUploadSuccess} />}
            <ScreenshotButton targetRef={containerRef} filename="overview" />
          </div>
        </div>

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
        <div className="dashboard-header" style={{ marginBottom: 24 }}>
          <div>
            <Title level={4} style={{ margin: 0, color: '#f8fafc' }}>
              数据总览
            </Title>
          </div>
          <div className="upload-section">
            <MonthPicker value={month} onChange={setMonth} />
            {isAdmin && <FileUpload month={month} onSuccess={handleUploadSuccess} />}
          </div>
        </div>

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
      <div className="dashboard-header" style={{ marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#f8fafc' }}>
            数据总览
          </Title>
          <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>
            考核月份: {month} | 关键词总数: {data?.summary?.totalKeywords || 0}
          </div>
        </div>
        <div className="upload-section">
          <MonthPicker value={month} onChange={setMonth} />
          {isAdmin && <FileUpload month={month} onSuccess={handleUploadSuccess} />}
          <ExportButton data={data} month={month} />
          <ScreenshotButton targetRef={containerRef} filename={`overview-${month}`} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-row">
        {kpiData.map((kpi, index) => (
          <KpiCard
            key={kpi.key}
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            sub={kpi.sub}
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

      {/* Monthly Trend Line Chart */}
      <div className="chart-card" style={{ marginTop: 24 }}>
        <div className="chart-title">月度达标率趋势</div>
        {getTrendLineOption() ? (
          <ReactECharts
            option={getTrendLineOption()}
            style={{ height: 300 }}
            notMerge={true}
          />
        ) : (
          <Empty description={EMPTY_MESSAGES.NO_DATA} />
        )}
      </div>

      {/* Tier Distribution Summary */}
      {data?.tierDistribution && (
        <div className="chart-card" style={{ marginTop: 24 }}>
          <div className="chart-title">考核等级分布</div>
          <div style={{ display: 'flex', gap: 24, padding: '20px 0' }}>
            {['一级', '二级', '三级'].map(tier => {
              const count = data.tierDistribution[tier]?.count || 0
              const tierColors = {
                '一级': '#10b981',
                '二级': '#f59e0b',
                '三级': '#ef4444',
              }
              return (
                <div key={tier} style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: 20,
                  background: 'var(--bg-secondary)',
                  borderRadius: 12,
                }}>
                  <div style={{
                    fontSize: 32,
                    fontWeight: 700,
                    color: tierColors[tier],
                  }}>
                    {count}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 8 }}>
                    {tier}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default Overview