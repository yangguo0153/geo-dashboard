import React, { useCallback } from 'react'
import { DownloadOutlined, FilePdfOutlined } from '@ant-design/icons'
import { message } from 'antd'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

/**
 * ExportButton - Export current page as PDF report
 * @param {Object} targetRef - React ref pointing to the DOM element to export
 * @param {string} month - Current month for filename
 */
export default function ExportButton({ targetRef, month }) {
  const handleExportPDF = useCallback(async () => {
    if (!targetRef?.current) {
      message.warning('没有可导出的内容')
      return
    }

    const hideLoading = message.loading('正在生成 PDF...', 0)

    try {
      // Generate canvas from DOM element
      const canvas = await html2canvas(targetRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a', // Dark background
        logging: false,
      })

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210 // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Handle multi-page content
      const pageHeight = 297 // A4 height in mm
      let heightLeft = imgHeight
      let position = 0

      // Add first page
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0,
        position,
        imgWidth,
        imgHeight
      )
      heightLeft -= pageHeight

      // Add remaining pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          0,
          position,
          imgWidth,
          imgHeight
        )
        heightLeft -= pageHeight
      }

      // Download PDF
      pdf.save(`GEO监测报告-${month}.pdf`)

      message.success('PDF 报告已导出')
    } catch (error) {
      message.error('导出失败')
      console.error('PDF export error:', error)
    } finally {
      hideLoading()
    }
  }, [targetRef, month])

  return (
    <button className="export-btn" onClick={handleExportPDF}>
      <FilePdfOutlined /> 导出 PDF 报告
    </button>
  )
}