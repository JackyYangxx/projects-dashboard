import type { ReviewIssue } from '@/types'

const SEVERITY_COLOR: Record<ReviewIssue['severity'], string> = {
  critical: '#ef4444',
  warning: '#f59e0b',
  suggestion: '#3b82f6',
}

interface Props {
  issue: ReviewIssue
  onClick: (id: string) => void
}

export function IssueCallout({ issue, onClick }: Props) {
  return (
    <div
      data-testid="issue-callout"
      onClick={() => onClick(issue.id)}
      style={{
        borderLeft: `3px solid ${SEVERITY_COLOR[issue.severity]}`,
        background: '#fff8e1',
        padding: '6px 10px',
        margin: '2px 0 2px 72px',
        cursor: 'pointer',
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 500 }}>{issue.title}</div>
      <div style={{ color: '#6b7280', marginTop: 2 }}>{issue.description}</div>
    </div>
  )
}
