import { useState } from 'react'
import type { ReviewIssue, IssueSeverity } from '@/types'

interface Props {
  issues: ReviewIssue[]
  onSelectIssue: (id: string) => void
  initialFilter?: IssueSeverity | 'all'
}

type Filter = IssueSeverity | 'all'

const SEVERITY_LABEL: Record<Filter, string> = {
  all: '全部',
  critical: '严重',
  warning: '警告',
  suggestion: '建议',
}

const SEVERITY_COLOR: Record<IssueSeverity, string> = {
  critical: '#ef4444',
  warning: '#f59e0b',
  suggestion: '#3b82f6',
}

export function IssueList({ issues, onSelectIssue, initialFilter = 'all' }: Props) {
  const [filter, setFilter] = useState<Filter>(initialFilter)
  const matchesFilter = (i: ReviewIssue) => filter === 'all' || i.severity === filter

  const resolved = issues.filter(i => i.resolved && matchesFilter(i))
  const unresolved = issues.filter(i => !i.resolved && matchesFilter(i))

  return (
    <div className="issue-list" data-testid="issue-list">
      <div className="issue-list-filter" style={{ display: 'flex', gap: 4, padding: 8, borderBottom: '1px solid #e5e7eb' }}>
        {(['all', 'critical', 'warning', 'suggestion'] as Filter[]).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            data-testid={`filter-${f}`}
            style={{
              padding: '2px 8px',
              border: '1px solid #d1d5db',
              borderRadius: 4,
              background: filter === f ? '#3b82f6' : 'white',
              color: filter === f ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {SEVERITY_LABEL[f]}
          </button>
        ))}
      </div>
      <div data-testid="group-resolved" style={{ padding: 4 }}>
        {resolved.map(i => (
          <div
            key={i.id}
            data-testid="issue-item"
            data-issue-id={i.id}
            onClick={() => onSelectIssue(i.id)}
            style={{ borderLeft: `3px solid ${SEVERITY_COLOR[i.severity]}`, padding: '6px 8px', marginBottom: 4, cursor: 'pointer', background: 'white', borderRadius: 4 }}
          >
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ background: SEVERITY_COLOR[i.severity], color: 'white', borderRadius: 4, padding: '0 4px', fontSize: 11 }}>{i.severity}</span>
              <span style={{ fontWeight: 500 }}>{i.title}</span>
              {i.lineNumber !== undefined && (
                <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: 11 }}>L{i.lineNumber}</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{i.filePath}</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{i.description}</div>
          </div>
        ))}
      </div>
      {unresolved.length > 0 && (
        <div data-testid="group-unresolved" style={{ padding: 4, borderTop: '1px dashed #e5e7eb' }}>
          <div style={{ padding: 4, fontSize: 11, color: '#6b7280' }}>未定位 ({unresolved.length})</div>
          {unresolved.map(i => (
            <div
              key={i.id}
              data-testid="issue-item"
              data-issue-id={i.id}
              onClick={() => onSelectIssue(i.id)}
              style={{ borderLeft: '3px solid #9ca3af', padding: '6px 8px', marginBottom: 4, cursor: 'pointer', background: '#fafafa', borderRadius: 4, opacity: 0.85 }}
            >
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span>⊘</span>
                <span style={{ fontWeight: 500 }}>{i.title}</span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{i.filePath}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{i.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
