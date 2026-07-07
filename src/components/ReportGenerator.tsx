import { useState } from 'react'
import { insertAgentReport, getAllMemories } from '@/db/agentDao'
import { getAllMRReviewRecords } from '@/db/codeReviewDao'
import type { AgentReport } from '@/types/agent'

interface Props {
  open: boolean
  onClose: () => void
  onGenerated: (report: AgentReport) => void
}

export default function ReportGenerator({ open, onClose, onGenerated }: Props) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'custom'>('week')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  if (!open) return null

  const handleGenerate = () => {
    let start: Date, end: Date
    end = new Date()
    switch (timeRange) {
      case 'week': start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); break
      case 'month': start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); break
      default: start = new Date(customStart); end = new Date(customEnd); break
    }

    const startISO = start.toISOString()
    const endISO = end.toISOString()

    const allRecords = getAllMRReviewRecords()
    const records = allRecords.filter(r => r.createdAt >= startISO && r.createdAt <= endISO)

    const totalIssues = records.reduce((sum, r) => sum + r.issues.length, 0)
    const bySeverity = { critical: 0, warning: 0, suggestion: 0 }
    records.forEach(r => r.issues.forEach(i => { bySeverity[i.severity]++ }))

    const memories = getAllMemories()
    const topPatterns = memories
      .filter(m => m.type === 'pattern')
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
      .slice(0, 10)
      .map(m => ({ title: m.title, count: m.occurrenceCount }))

    const statsJson = JSON.stringify({ totalIssues, bySeverity, totalMRs: records.length, totalProjects: new Set(records.map(r => r.projectId)).size })
    const topIssuesJson = JSON.stringify(topPatterns)

    const summary = `在 ${startISO.slice(0, 10)} 至 ${endISO.slice(0, 10)} 期间，共扫描 ${records.length} 个 MR，发现 ${totalIssues} 个问题（${bySeverity.critical} 严重、${bySeverity.warning} 警告、${bySeverity.suggestion} 建议）。`

    const report: AgentReport = {
      id: crypto.randomUUID(),
      timeRangeStart: startISO,
      timeRangeEnd: endISO,
      projectIds: [],
      summary,
      statsJson,
      topIssuesJson,
      createdAt: new Date().toISOString(),
    }

    insertAgentReport(report)
    onGenerated(report)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg-primary)', borderRadius: '12px', padding: '24px',
        minWidth: '400px', maxWidth: '500px',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>生成评审报告</h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary)' }}>时间范围</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { key: 'week', label: '最近一周' },
              { key: 'month', label: '最近一月' },
              { key: 'custom', label: '自定义' },
            ].map(o => (
              <button key={o.key} onClick={() => setTimeRange(o.key as typeof timeRange)}
                className={timeRange === o.key ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {timeRange === 'custom' && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>开始日期</label>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>结束日期</label>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-outline">取消</button>
          <button onClick={handleGenerate} className="btn btn-primary" disabled={timeRange === 'custom' && (!customStart || !customEnd)}>生成报告</button>
        </div>
      </div>
    </div>
  )
}
