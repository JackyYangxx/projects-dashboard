import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IssueList } from '../IssueList'
import type { ReviewIssue } from '@/types'

const mk = (over: Partial<ReviewIssue>): ReviewIssue => ({
  id: over.id ?? 'i',
  severity: over.severity ?? 'warning',
  title: over.title ?? 'title',
  description: over.description ?? 'desc',
  filePath: over.filePath ?? 'x.ts',
  codeSnippet: over.codeSnippet ?? '',
  resolved: over.resolved ?? true,
  lineNumber: over.lineNumber,
})

describe('<IssueList>', () => {
  it('renders all issues when filter is "all"', () => {
    const issues = [mk({ id: 'a', severity: 'critical' }), mk({ id: 'b', severity: 'suggestion' })]
    render(<IssueList issues={issues} onSelectIssue={() => {}} />)
    expect(screen.getAllByTestId('issue-item')).toHaveLength(2)
  })

  it('filters issues by severity', () => {
    const issues = [mk({ id: 'a', severity: 'critical' }), mk({ id: 'b', severity: 'warning' })]
    render(<IssueList issues={issues} onSelectIssue={() => {}} initialFilter="critical" />)
    expect(screen.getAllByTestId('issue-item')).toHaveLength(1)
    expect(screen.getByTestId('issue-item')).toHaveTextContent('critical')
  })

  it('separates resolved and unresolved groups', () => {
    const issues = [
      mk({ id: 'a', resolved: true, lineNumber: 10 }),
      mk({ id: 'b', resolved: false }),
    ]
    render(<IssueList issues={issues} onSelectIssue={() => {}} />)
    expect(screen.getByTestId('group-resolved')).toBeInTheDocument()
    expect(screen.getByTestId('group-unresolved')).toBeInTheDocument()
  })

  it('calls onSelectIssue when item clicked', () => {
    const cb = vi.fn()
    const issues = [mk({ id: 'a' })]
    render(<IssueList issues={issues} onSelectIssue={cb} />)
    fireEvent.click(screen.getByTestId('issue-item'))
    expect(cb).toHaveBeenCalledWith('a')
  })
})
