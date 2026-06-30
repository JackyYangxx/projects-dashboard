import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProgressSlider from '../ProgressSlider'

const defaultSubProgress = {
  architecture: 80,
  uiux: 60,
  engineering: 90,
  qa: 50,
}

describe('<ProgressSlider>', () => {
  it('renders progress value as percentage', () => {
    render(
      <ProgressSlider
        value={75}
        subProgress={defaultSubProgress}
        onChange={() => {}}
      />
    )
    const pctElements = screen.getAllByText('75%')
    expect(pctElements.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('完成度')).toBeTruthy()
  })

  it('renders all 4 sub-progress items', () => {
    render(
      <ProgressSlider
        value={75}
        subProgress={defaultSubProgress}
        onChange={() => {}}
      />
    )
    expect(screen.getByText('底层架构')).toBeTruthy()
    expect(screen.getByText('UI-UX设计')).toBeTruthy()
    expect(screen.getByText('工程开发')).toBeTruthy()
    expect(screen.getByText('质量审计')).toBeTruthy()
  })

  it('renders sub-progress values', () => {
    render(
      <ProgressSlider
        value={75}
        subProgress={defaultSubProgress}
        onChange={() => {}}
      />
    )
    expect(screen.getByText('80%')).toBeTruthy()
    expect(screen.getByText('60%')).toBeTruthy()
    expect(screen.getByText('90%')).toBeTruthy()
    expect(screen.getAllByText('50%').length).toBeGreaterThanOrEqual(1)
  })

  it('renders lastUpdated when provided', () => {
    render(
      <ProgressSlider
        value={75}
        subProgress={defaultSubProgress}
        onChange={() => {}}
        lastUpdated="2024-01-15"
      />
    )
    expect(screen.getByText(/2024-01-15/)).toBeTruthy()
  })

  it('renders reset button in non-readOnly mode when onReset provided', () => {
    render(
      <ProgressSlider
        value={75}
        subProgress={defaultSubProgress}
        onChange={() => {}}
        onReset={() => {}}
      />
    )
    expect(screen.getByText('重置')).toBeTruthy()
  })

  it('does not render reset button when onReset is not provided', () => {
    render(
      <ProgressSlider
        value={75}
        subProgress={defaultSubProgress}
        onChange={() => {}}
      />
    )
    expect(screen.queryByText('重置')).toBeNull()
  })

  it('has aria attributes on slider', () => {
    render(
      <ProgressSlider
        value={30}
        subProgress={defaultSubProgress}
        onChange={() => {}}
      />
    )
    const slider = screen.getByRole('slider')
    expect(slider.getAttribute('aria-valuenow')).toBe('30')
    expect(slider.getAttribute('aria-valuemin')).toBe('0')
    expect(slider.getAttribute('aria-valuemax')).toBe('100')
  })

  it('renders percentage labels 0-100', () => {
    render(
      <ProgressSlider
        value={50}
        subProgress={defaultSubProgress}
        onChange={() => {}}
      />
    )
    expect(screen.getByText('0%')).toBeTruthy()
    expect(screen.getByText('25%')).toBeTruthy()
    expect(screen.getAllByText('50%').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('75%')).toBeTruthy()
    expect(screen.getByText('100%')).toBeTruthy()
  })

  it('renders in readOnly mode without grab cursor', () => {
    const { container } = render(
      <ProgressSlider
        value={50}
        subProgress={defaultSubProgress}
        onChange={() => {}}
        readOnly
      />
    )
    expect(screen.queryByText('重置')).toBeNull()
    const slider = screen.getByRole('slider')
    expect(slider.className).toContain('cursor-default')
  })
})
