import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiffLine } from '../DiffLine'

describe('<DiffLine>', () => {
  it('renders added line with green styling and + prefix', () => {
    render(<DiffLine num={1} type="add" content="const x = 1" highlighted={false} />)
    const line = screen.getByTestId('diff-line')
    expect(line).toHaveTextContent('1')
    expect(line).toHaveTextContent('+')
    expect(line).toHaveTextContent('const x = 1')
    expect(line.className).toMatch(/add/)
  })

  it('renders deleted line with red styling and - prefix', () => {
    render(<DiffLine num={5} type="del" content="const old = 1" highlighted={false} />)
    expect(screen.getByTestId('diff-line').className).toMatch(/del/)
    expect(screen.getByTestId('diff-line').textContent).toContain('-')
  })

  it('renders context line with neutral styling', () => {
    render(<DiffLine num={3} type="context" content="unchanged" highlighted={false} />)
    expect(screen.getByTestId('diff-line').className).toMatch(/context/)
  })

  it('applies highlight-pulse class when highlighted=true', () => {
    render(<DiffLine num={1} type="add" content="x" highlighted={true} />)
    expect(screen.getByTestId('diff-line').className).toMatch(/highlight-pulse/)
  })

  it('does not apply highlight-pulse class when highlighted=false', () => {
    render(<DiffLine num={1} type="add" content="x" highlighted={false} />)
    expect(screen.getByTestId('diff-line').className).not.toMatch(/highlight-pulse/)
  })
})
