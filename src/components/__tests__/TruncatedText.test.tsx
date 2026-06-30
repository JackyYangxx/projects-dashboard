import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TruncatedText from '../TruncatedText'

describe('<TruncatedText>', () => {
  it('renders full text when shorter than maxChars', () => {
    render(<TruncatedText text="Hello" maxChars={10} />)
    expect(screen.getByText('Hello')).toBeTruthy()
  })

  it('truncates text longer than maxChars with ellipsis', () => {
    render(<TruncatedText text="Hello World" maxChars={5} />)
    expect(screen.getByText('Hello…')).toBeTruthy()
  })

  it('does not truncate when maxChars is not set', () => {
    render(<TruncatedText text="A very long text that should not be truncated" />)
    expect(screen.getByText('A very long text that should not be truncated')).toBeTruthy()
  })

  it('sets title attribute for tooltip when showTooltip is true', () => {
    const { container } = render(<TruncatedText text="Full text here" maxChars={4} showTooltip />)
    const span = container.querySelector('span')
    expect(span?.getAttribute('title')).toBe('Full text here')
  })

  it('does not set title when showTooltip is false', () => {
    const { container } = render(<TruncatedText text="Hello" showTooltip={false} />)
    const span = container.querySelector('span')
    expect(span?.getAttribute('title')).toBeNull()
  })

  it('applies custom className', () => {
    const { container } = render(<TruncatedText text="Test" className="custom-class" />)
    const span = container.querySelector('span')
    expect(span?.className).toContain('custom-class')
  })

  it('renders exact-length text without truncation', () => {
    render(<TruncatedText text="12345" maxChars={5} />)
    expect(screen.getByText('12345')).toBeTruthy()
  })
})
