import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileSection } from '../FileSection'
import type { ParsedFile } from '@/utils/diffParser'
import type { ReviewIssue } from '@/types'

const file: ParsedFile = {
  path: 'utils/cache.ts',
  additions: 2,
  deletions: 1,
  hunks: [
    {
      startLine: 1,
      lines: [
        { num: 0, type: 'del', content: 'old' },
        { num: 1, type: 'add', content: 'new1' },
        { num: 2, type: 'add', content: 'new2' },
      ],
    },
  ],
}

const issues: ReviewIssue[] = [
  {
    id: 'i1', severity: 'warning', title: 't', description: 'd',
    filePath: 'utils/cache.ts', codeSnippet: 'new1', lineNumber: 1, resolved: true,
  },
]

describe('<FileSection>', () => {
  it('renders filename and +/- stats', () => {
    render(<FileSection file={file} issuesInFile={[]} defaultOpen={true} />)
    expect(screen.getByText('utils/cache.ts')).toBeInTheDocument()
    expect(screen.getByText('+2 -1')).toBeInTheDocument()
  })

  it('shows issue count badge when issuesInFile non-empty', () => {
    render(<FileSection file={file} issuesInFile={issues} defaultOpen={true} />)
    expect(screen.getByTestId('file-issue-count')).toHaveTextContent('1')
  })

  it('expands body when defaultOpen=true', () => {
    render(<FileSection file={file} issuesInFile={[]} defaultOpen={true} />)
    expect(screen.getByTestId('file-body')).toBeVisible()
  })

  it('collapses body when defaultOpen=false', () => {
    render(<FileSection file={file} issuesInFile={[]} defaultOpen={false} />)
    expect(screen.queryByTestId('file-body')).not.toBeInTheDocument()
  })

  it('toggles on header click', () => {
    render(<FileSection file={file} issuesInFile={[]} defaultOpen={true} />)
    fireEvent.click(screen.getByTestId('file-header'))
    expect(screen.queryByTestId('file-body')).not.toBeInTheDocument()
  })

  it('renders each diff line as DiffLine', () => {
    render(<FileSection file={file} issuesInFile={[]} defaultOpen={true} />)
    expect(screen.getAllByTestId('diff-line')).toHaveLength(3)
  })
})
