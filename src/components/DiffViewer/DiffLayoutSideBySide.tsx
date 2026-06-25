import { useMemo } from 'react'
import { parseDiff } from '@/utils/diffParser'
import type { ReviewIssue } from '@/types'
import { IssueList } from './IssueList'
import { FileSection } from './FileSection'

interface Props {
  diff: string
  issues: ReviewIssue[]
  highlightedIssueId: string | null
  highlightedLine: number | null
  highlightedFile: string | null
  onSelectIssue: (id: string) => void
}

export function DiffLayoutSideBySide({ diff, issues, highlightedLine, highlightedFile, onSelectIssue }: Props) {
  const parsed = useMemo(() => parseDiff(diff), [diff])
  const issuesByFile = useMemo(() => {
    const m = new Map<string, ReviewIssue[]>()
    for (const i of issues) {
      if (!i.resolved) continue
      const list = m.get(i.filePath) ?? []
      list.push(i)
      m.set(i.filePath, list)
    }
    return m
  }, [issues])

  return (
    <div
      className="diff-layout-side-by-side"
      data-testid="diff-layout-side-by-side"
      style={{ display: 'grid', gridTemplateColumns: '360px 1fr', minHeight: 0, flex: 1 }}
    >
      <div style={{ borderRight: '1px solid #e5e7eb', overflowY: 'auto' }}>
        <IssueList issues={issues} onSelectIssue={onSelectIssue} />
      </div>
      <div style={{ overflowY: 'auto' }}>
        {parsed.files.map(file => (
          <FileSection
            key={file.path}
            file={file}
            issuesInFile={issuesByFile.get(file.path) ?? []}
            defaultOpen={true}
            highlightedLine={highlightedFile === file.path ? highlightedLine ?? undefined : undefined}
          />
        ))}
      </div>
    </div>
  )
}