import { useEffect, useRef, useState } from 'react'
import type { ReviewIssue } from '@/types'
import { DiffLayoutInline } from './DiffLayoutInline'
import { DiffLayoutSideBySide } from './DiffLayoutSideBySide'
import { DiffLayoutFileExplorer } from './DiffLayoutFileExplorer'
import type { LayoutMode } from './types'

const STORAGE_KEY = 'diffViewer.layout'

function loadLayout(): LayoutMode {
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === 'side-by-side' || v === 'inline' || v === 'file-explorer') return v
  return 'inline'
}

interface Props {
  diff: string
  issues: ReviewIssue[]
  currentIssueId: string | null
  onSelectIssue: (id: string) => void
}

const LAYOUTS: { value: LayoutMode; label: string; testId: string }[] = [
  { value: 'side-by-side', label: '分栏', testId: 'layout-side-by-side' },
  { value: 'inline', label: '内联', testId: 'layout-inline' },
  { value: 'file-explorer', label: '文件浏览', testId: 'layout-file-explorer' },
]

export function DiffViewer({ diff, issues, currentIssueId, onSelectIssue }: Props) {
  const [layout, setLayout] = useState<LayoutMode>(loadLayout)
  const containerRef = useRef<HTMLDivElement>(null)

  const highlighted = currentIssueId ? issues.find(i => i.id === currentIssueId) : null
  const highlightedLine = highlighted?.lineNumber ?? null
  const highlightedFile = highlighted?.filePath ?? null

  useEffect(() => {
    if (!highlighted) return
    const el = containerRef.current?.querySelector(
      `[data-file-path="${CSS.escape(highlighted.filePath)}"][data-line-number="${highlighted.lineNumber ?? ''}"]`
    ) as HTMLElement | null
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentIssueId, highlighted])

  const handleLayoutChange = (l: LayoutMode) => {
    setLayout(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  const empty = !diff || diff.trim() === ''

  return (
    <div className="diff-viewer" data-testid="diff-viewer" ref={containerRef} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="diff-viewer-toolbar" style={{ display: 'flex', gap: 4, padding: 6, borderBottom: '1px solid #e5e7eb' }}>
        {LAYOUTS.map(l => (
          <button
            key={l.value}
            type="button"
            data-testid={l.testId}
            onClick={() => handleLayoutChange(l.value)}
            style={{
              padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 4,
              background: layout === l.value ? '#3b82f6' : 'white',
              color: layout === l.value ? 'white' : '#374151',
              cursor: 'pointer', fontSize: 12,
            }}
          >
            {l.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>
          {issues.filter(i => i.resolved).length} / {issues.length} 已定位
        </div>
      </div>
      {empty ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>该 MR 无文件变更</div>
      ) : issues.length === 0 ? (
        <div data-testid="no-issues-banner" style={{ padding: 12, background: '#d1fae5', color: '#065f46', textAlign: 'center', fontWeight: 500 }}>
          ✓ 未发现问题
        </div>
      ) : null}
      {!empty && (
        layout === 'inline' ? (
          <DiffLayoutInline diff={diff} issues={issues} highlightedIssueId={currentIssueId} onSelectIssue={onSelectIssue} />
        ) : layout === 'side-by-side' ? (
          <DiffLayoutSideBySide diff={diff} issues={issues} highlightedIssueId={currentIssueId} highlightedLine={highlightedLine} highlightedFile={highlightedFile} onSelectIssue={onSelectIssue} />
        ) : (
          <DiffLayoutFileExplorer diff={diff} issues={issues} highlightedIssueId={currentIssueId} highlightedLine={highlightedLine} highlightedFile={highlightedFile} onSelectIssue={onSelectIssue} />
        )
      )}
    </div>
  )
}