import type { ViewDiffLine } from './types'

interface Props extends ViewDiffLine {
  highlighted: boolean
  filePath?: string
}

const PREFIX: Record<ViewDiffLine['type'], string> = {
  add: '+',
  del: '-',
  context: ' ',
}

export function DiffLine({ num, type, content, highlighted, filePath }: Props) {
  const cls = ['diff-line', type, highlighted ? 'highlight-pulse' : '']
    .filter(Boolean)
    .join(' ')
  return (
    <div
      className={cls}
      data-testid="diff-line"
      data-file-path={filePath ?? ''}
      data-line-number={num}
    >
      <span className="diff-line-num">{num || ''}</span>
      <span className="diff-line-prefix">{PREFIX[type]}</span>
      <span className="diff-line-content">{content}</span>
    </div>
  )
}
