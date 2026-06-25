import { useState } from 'react'
import type { ParsedFile } from '@/utils/diffParser'
import type { ReviewIssue } from '@/types'
import { DiffLine } from './DiffLine'

interface Props {
  file: ParsedFile
  issuesInFile: ReviewIssue[]
  defaultOpen: boolean
  highlightedLine?: number
}

export function FileSection({ file, issuesInFile, defaultOpen, highlightedLine }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="file-section" data-file-path={file.path}>
      <div
        className="file-section-header"
        data-testid="file-header"
        onClick={() => setOpen(o => !o)}
        style={{ cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', padding: '6px 8px', background: '#f5f5f5', borderBottom: '1px solid #e5e7eb' }}
      >
        <span className="file-section-chevron" style={{ transform: `rotate(${open ? 0 : -90}deg)`, transition: 'transform 0.15s' }}>▾</span>
        <span className="file-section-path" style={{ fontWeight: 500 }}>{file.path}</span>
        <span className="file-section-stats" style={{ color: '#6b7280', fontSize: 12 }}>+{file.additions} -{file.deletions}</span>
        {issuesInFile.length > 0 && (
          <span
            data-testid="file-issue-count"
            style={{
              background: issuesInFile.some(i => i.severity === 'critical') ? '#ef4444'
                : issuesInFile.some(i => i.severity === 'warning') ? '#f59e0b'
                : '#3b82f6',
              color: 'white', borderRadius: 8, padding: '0 6px', fontSize: 11,
            }}
          >
            {issuesInFile.length}
          </span>
        )}
      </div>
      {open && (
        <div className="file-section-body" data-testid="file-body">
          {file.hunks.flatMap(h =>
            h.lines.map((line, idx) => (
              <DiffLine
                key={`${h.startLine}-${idx}`}
                num={line.num}
                type={line.type}
                content={line.content}
                highlighted={highlightedLine === line.num}
                filePath={file.path}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
