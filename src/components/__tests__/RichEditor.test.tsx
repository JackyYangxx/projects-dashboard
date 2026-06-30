import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RichEditor from '../RichEditor'

describe('<RichEditor>', () => {
  it('renders a textarea in edit mode', () => {
    const { container } = render(<RichEditor />)
    expect(container.querySelector('textarea')).toBeTruthy()
  })

  it('renders read-only div when readOnly=true', () => {
    const { container } = render(<RichEditor readOnly value="<p>Hello</p>" />)
    expect(container.querySelector('textarea')).toBeNull()
    expect(container.querySelector('div')).toBeTruthy()
  })

  it('renders placeholder text', () => {
    render(<RichEditor placeholder="自定义占位符" />)
    expect(screen.getByPlaceholderText('自定义占位符')).toBeTruthy()
  })

  it('renders formatting toolbar buttons', () => {
    render(<RichEditor />)
    expect(screen.getByText('B')).toBeTruthy()
    expect(screen.getByText('I')).toBeTruthy()
    expect(screen.getByText('U')).toBeTruthy()
  })

  it('does not render toolbar in readOnly mode', () => {
    render(<RichEditor readOnly />)
    expect(screen.queryByText('B')).toBeNull()
  })

  it('renders initial value in textarea', () => {
    render(<RichEditor value="initial text" />)
    const textarea = screen.getByPlaceholderText('在此输入内容...') as HTMLTextAreaElement
    expect(textarea.value).toBe('initial text')
  })

  it('calls onChange when text changes', async () => {
    const onChange = vi.fn()
    render(<RichEditor onChange={onChange} />)
    const textarea = screen.getByPlaceholderText('在此输入内容...')
    const user = userEvent.setup()
    await user.type(textarea, 'a')
    expect(onChange).toHaveBeenCalled()
  })

  it('renders read-only with empty fallback when value is empty', () => {
    const { container } = render(<RichEditor readOnly />)
    expect(container.innerHTML).toContain('无内容')
  })
})
