import { useMemo, useState } from 'react'
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

export function DiffLayoutFileExplorer({ diff, issues, highlightedLine, highlightedFile, onSelectIssue }: Props) {
  const parsed = useMemo(() => parseDiff(diff), [diff])
  const [selected, setSelected] = useState<string | null>(parsed.files[0]?.path ?? null)
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
      className="diff-layout-file-explorer"
      data-testid="diff-layout-file-explorer"
      style={{ display: 'grid', gridTemplateColumns: '200px 1fr 320px', flex: 1, minHeight: 0 }}
    >
      <div style={{ borderRight: '1px solid #e5e7eb', overflowY: 'auto', background: '#fafafa' }}>
        {parsed.files.map(file => {
          const fileIssues = issuesByFile.get(file.path) ?? []
          return (
            <div
              key={file.path}
              data-testid="file-tree-item"
              onClick={() => setSelected(file.path)}
              style={{
                padding: '6px 8px', cursor: 'pointer',
                background: selected === file.path ? '#dbeafe' : 'transparent',
                fontSize: 13,
              }}
            >
              📄 {file.path}
              {fileIssues.length > 0 && (
                <span style={{ marginLeft: 4, background: '#ef4444', color: 'white', borderRadius: 8, padding: '0 5px', fontSize: 10 }}>
                  {fileIssues.length}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ overflowY: 'auto' }}>
        {parsed.files
          .filter(f => f.path === selected)
          .map(file => (
            <FileSection
              key={file.path}
              file={file}
              issuesInFile={issuesByFile.get(file.path) ?? []}
              defaultOpen={true}
              highlightedLine={highlightedFile === file.path ? highlightedLine ?? undefined : undefined}
            />
          ))}
      </div>
      <div style={{ borderLeft: '1px solid #e5e7eb', overflowY: 'auto' }}>
        <IssueList issues={issues} onSelectIssue={onSelectIssue} />
      </div>
    </div>
  )
}