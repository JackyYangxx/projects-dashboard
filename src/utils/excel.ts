import * as XLSX from 'xlsx'
import type { MRReviewRecord } from '@/types'

export function exportToExcel(records: MRReviewRecord[], filename: string = 'review-report.xlsx') {
  const rows: Array<{
    项目名称: string
    MR链接: string
    MR标题: string
    问题标题: string
    严重程度: string
    问题描述: string
    评审时间: string
  }> = []

  for (const record of records) {
    for (const issue of record.issues) {
      rows.push({
        项目名称: record.projectName,
        MR链接: record.mrUrl,
        MR标题: record.mrTitle,
        问题标题: issue.title,
        严重程度: issue.severity === 'critical' ? '严重' : issue.severity === 'warning' ? '警告' : '建议',
        问题描述: issue.description,
        评审时间: record.reviewedAt,
      })
    }
  }

  if (rows.length === 0) {
    rows.push({
      项目名称: '', MR链接: '', MR标题: '',
      问题标题: '', 严重程度: '', 问题描述: '', 评审时间: '',
    })
  }

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '评审报告')
  XLSX.writeFile(workbook, filename)
}