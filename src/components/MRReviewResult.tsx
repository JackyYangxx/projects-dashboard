import { useState } from 'react'
import type { MRReviewRecord } from '@/types'
import { DiffViewer } from './DiffViewer'

interface Props {
  record: MRReviewRecord
  onRerun?: () => void
}

export function MRReviewResult({ record, onRerun }: Props) {
  const [currentIssueId, setCurrentIssueId] = useState<string | null>(null)
  const hasDiff = record.diff && record.diff.trim().length > 0

  if (!hasDiff) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ marginBottom: 12, color: '#6b7280' }}>该记录为旧版本，无 diff 数据，无法显示代码上下文</div>
        {onRerun && (
          <button
            type="button"
            data-testid="rerun-review"
            onClick={onRerun}
            style={{ padding: '6px 14px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            重新审核升级
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>
        <strong>{record.mrTitle}</strong>
        <a href={record.mrUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, color: '#3b82f6', fontSize: 12 }}>查看 MR ↗</a>
      </div>
      <DiffViewer
        diff={record.diff}
        issues={record.issues}
        currentIssueId={currentIssueId}
        onSelectIssue={setCurrentIssueId}
      />
    </div>
  )
}
