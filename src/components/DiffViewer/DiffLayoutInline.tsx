import { useMemo } from 'react'
import { parseDiff } from '@/utils/diffParser'
import type { ReviewIssue } from '@/types'
import { DiffLine } from './DiffLine'
import { IssueCallout } from './IssueCallout'

interface Props {
  diff: string
  issues: ReviewIssue[]
  highlightedIssueId: string | null
  onSelectIssue: (id: string) => void
}

export function DiffLayoutInline({ diff, issues, highlightedIssueId, onSelectIssue }: Props) {
  const parsed = useMemo(() => parseDiff(diff), [diff])
  const highlighted = highlightedIssueId
    ? issues.find(i => i.id === highlightedIssueId)
    : undefined

  const issuesByFile = useMemo(() => {
    const map = new Map<string, ReviewIssue[]>()
    for (const i of issues) {
      if (!i.resolved) continue
      const list = map.get(i.filePath) ?? []
      list.push(i)
      map.set(i.filePath, list)
    }
    return map
  }, [issues])

  return (
    <div className="diff-layout-inline" data-testid="diff-layout-inline">
      {parsed.files.map(file => (
        <div key={file.path} className="diff-file-block">
          <div
            style={{
              padding: '6px 10px', background: '#f5f5f5',
              borderBottom: '1px solid #e5e7eb', fontWeight: 500,
            }}
          >
            📄 {file.path} <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 400 }}>+{file.additions} -{file.deletions}</span>
            {(issuesByFile.get(file.path)?.length ?? 0) > 0 && (
              <span style={{ marginLeft: 8, background: '#ef4444', color: 'white', borderRadius: 8, padding: '0 6px', fontSize: 11 }}>
                {issuesByFile.get(file.path)!.length} issues
              </span>
            )}
          </div>
          {file.hunks.flatMap(h =>
            h.lines.flatMap((line, idx) => {
              const lineIssues = (issuesByFile.get(file.path) ?? []).filter(
                i => i.lineNumber === line.num
              )
              return [
                <DiffLine
                  key={`${h.startLine}-${idx}`}
                  num={line.num}
                  type={line.type}
                  content={line.content}
                  highlighted={highlighted !== undefined && lineIssues.some(i => i.id === highlighted.id)}
                  filePath={file.path}
                />,
                ...lineIssues.map(issue => (
                  <IssueCallout key={issue.id} issue={issue} onClick={onSelectIssue} />
                )),
              ]
            })
          )}
        </div>
      ))}
    </div>
  )
}