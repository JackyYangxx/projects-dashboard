import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockWriteFile = vi.fn()
const mockBookAppendSheet = vi.fn()
const mockBookNew = vi.fn(() => ({}))
const mockJsonToSheet = vi.fn(() => ({}))

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: (...args: unknown[]) => mockJsonToSheet(...args),
    book_new: () => mockBookNew(),
    book_append_sheet: (...args: unknown[]) => mockBookAppendSheet(...args),
  },
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
}))

import { exportToExcel } from './excel'
import type { MRReviewRecord } from '@/types'

describe('exportToExcel', () => {
  beforeEach(() => {
    mockWriteFile.mockClear()
    mockBookAppendSheet.mockClear()
    mockBookNew.mockClear()
    mockJsonToSheet.mockClear()
  })

  const makeRecord = (overrides: Partial<MRReviewRecord> = {}): MRReviewRecord => ({
    id: '1',
    projectName: '测试项目',
    mrUrl: 'https://gitlab.com/test/merge_requests/1',
    mrTitle: 'Test MR',
    issues: [
      { title: '安全问题', severity: 'critical' as const, description: 'SQL注入风险', filePath: '/app.ts', codeSnippet: '...' },
      { title: '代码风格', severity: 'warning' as const, description: '变量命名不规范', filePath: '/utils.ts', codeSnippet: '...' },
      { title: '优化建议', severity: 'info' as const, description: '可使用缓存', filePath: '/api.ts', codeSnippet: '...' },
    ],
    reviewedAt: '2024-01-15',
    ...overrides,
  })

  it('converts records with issues to rows and writes file', () => {
    exportToExcel([makeRecord()])

    expect(mockJsonToSheet).toHaveBeenCalledTimes(1)
    const rows = mockJsonToSheet.mock.calls[0][0] as Record<string, string>[]
    expect(rows).toHaveLength(3)

    expect(rows[0]['项目名称']).toBe('测试项目')
    expect(rows[0]['严重程度']).toBe('严重')
    expect(rows[0]['问题标题']).toBe('安全问题')

    expect(rows[1]['严重程度']).toBe('警告')
    expect(rows[2]['严重程度']).toBe('建议')
  })

  it('maps severity correctly for all levels', () => {
    const record: MRReviewRecord = {
      id: '2',
      projectName: '测试',
      mrUrl: '',
      mrTitle: '',
      issues: [
        { title: 'a', severity: 'critical', description: '', filePath: '', codeSnippet: '' },
        { title: 'b', severity: 'warning', description: '', filePath: '', codeSnippet: '' },
        { title: 'c', severity: 'info', description: '', filePath: '', codeSnippet: '' },
      ],
      reviewedAt: '',
    }
    exportToExcel([record])
    const rows = mockJsonToSheet.mock.calls[0][0] as Record<string, string>[]
    expect(rows[0]['严重程度']).toBe('严重')
    expect(rows[1]['严重程度']).toBe('警告')
    expect(rows[2]['严重程度']).toBe('建议')
  })

  it('writes empty row when records have no issues', () => {
    const record = makeRecord({ issues: [] })
    exportToExcel([record])

    const rows = mockJsonToSheet.mock.calls[0][0] as Record<string, string>[]
    expect(rows).toHaveLength(1)
    expect(rows[0]['项目名称']).toBe('')
  })

  it('writes empty row when records array is empty', () => {
    exportToExcel([])

    const rows = mockJsonToSheet.mock.calls[0][0] as Record<string, string>[]
    expect(rows).toHaveLength(1)
    expect(rows[0]['项目名称']).toBe('')
  })

  it('uses default filename when not provided', () => {
    exportToExcel([makeRecord()])
    expect(mockWriteFile).toHaveBeenCalledWith({}, 'review-report.xlsx')
  })

  it('uses custom filename when provided', () => {
    exportToExcel([makeRecord()], 'custom-report.xlsx')
    expect(mockWriteFile).toHaveBeenCalledWith({}, 'custom-report.xlsx')
  })

  it('includes MR link and title in each row', () => {
    exportToExcel([makeRecord()])
    const rows = mockJsonToSheet.mock.calls[0][0] as Record<string, string>[]
    expect(rows[0]['MR链接']).toBe('https://gitlab.com/test/merge_requests/1')
    expect(rows[0]['MR标题']).toBe('Test MR')
    expect(rows[0]['评审时间']).toBe('2024-01-15')
  })
})
