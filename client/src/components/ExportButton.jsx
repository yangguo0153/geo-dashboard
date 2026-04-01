import React, { useCallback } from 'react'
import { DownloadOutlined } from '@ant-design/icons'
import { message } from 'antd'

/**
 * ExportButton - Export current overview data as JSON file
 * @param {Object} data - The data to export
 * @param {string} month - Current month for filename
 */
export default function ExportButton({ data, month }) {
  const handleExport = useCallback(() => {
    if (!data) {
      message.warning('没有数据可导出')
      return
    }

    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        month: month,
        summary: data.summary,
        platformStats: data.platformStats,
        tierDistribution: data.tierDistribution,
      }

      const blob = new Blob(
        [JSON.stringify(exportData, null, 2)],
        { type: 'application/json' }
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `geo-report-${month}.json`
      a.click()
      URL.revokeObjectURL(url)

      message.success('报告已导出')
    } catch (error) {
      message.error('导出失败')
      console.error('Export error:', error)
    }
  }, [data, month])

  return (
    <button className="export-btn" onClick={handleExport}>
      <DownloadOutlined /> 导出报告
    </button>
  )
}