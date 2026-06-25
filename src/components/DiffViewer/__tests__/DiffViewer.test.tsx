import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DiffViewer } from '..'
import type { ReviewIssue } from '@/types'

const SAMPLE_DIFF = [
  'diff --git a/x.ts b/x.ts',
  '--- a/x.ts',
  '+++ b/x.ts',
  '@@ -1 +1 @@',
  '-old',
  '+new',
].join('\n')

const issues: ReviewIssue[] = [
  { id: 'a', severity: 'warning', title: 't', description: 'd',
    filePath: 'x.ts', codeSnippet: 'new', lineNumber: 1, resolved: true },
]

describe('<DiffViewer>', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders inline layout by default', () => {
    render(<DiffViewer diff={SAMPLE_DIFF} issues={issues} currentIssueId={null} onSelectIssue={() => {}} />)
    expect(screen.getByTestId('diff-layout-inline')).toBeInTheDocument()
  })

  it('switches layout when toolbar button clicked', () => {
    render(<DiffViewer diff={SAMPLE_DIFF} issues={issues} currentIssueId={null} onSelectIssue={() => {}} />)
    fireEvent.click(screen.getByTestId('layout-side-by-side'))
    expect(screen.getByTestId('diff-layout-side-by-side')).toBeInTheDocument()
  })

  it('persists layout to localStorage', () => {
    render(<DiffViewer diff={SAMPLE_DIFF} issues={issues} currentIssueId={null} onSelectIssue={() => {}} />)
    fireEvent.click(screen.getByTestId('layout-file-explorer'))
    expect(localStorage.getItem('diffViewer.layout')).toBe('file-explorer')
  })

  it('reads layout from localStorage on mount', () => {
    localStorage.setItem('diffViewer.layout', 'side-by-side')
    render(<DiffViewer diff={SAMPLE_DIFF} issues={issues} currentIssueId={null} onSelectIssue={() => {}} />)
    expect(screen.getByTestId('diff-layout-side-by-side')).toBeInTheDocument()
  })

  it('shows empty-state when diff is empty', () => {
    render(<DiffViewer diff="" issues={[]} currentIssueId={null} onSelectIssue={() => {}} />)
    expect(screen.getByText(/无文件变更/i)).toBeInTheDocument()
  })

  it('shows green banner when AI returns no issues', () => {
    render(<DiffViewer diff={SAMPLE_DIFF} issues={[]} currentIssueId={null} onSelectIssue={() => {}} />)
    expect(screen.getByText(/未发现问题/i)).toBeInTheDocument()
  })

  it('calls scrollIntoView when currentIssueId changes', () => {
    const scrollSpy = vi.fn()
    Element.prototype.scrollIntoView = scrollSpy
    const { rerender } = render(
      <DiffViewer diff={SAMPLE_DIFF} issues={issues} currentIssueId={null} onSelectIssue={() => {}} />
    )
    rerender(
      <DiffViewer diff={SAMPLE_DIFF} issues={issues} currentIssueId="a" onSelectIssue={() => {}} />
    )
    expect(scrollSpy).toHaveBeenCalled()
  })
})