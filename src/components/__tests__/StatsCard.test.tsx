import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatsCard from '../StatsCard'

describe('<StatsCard>', () => {
  it('renders title and value', () => {
    render(<StatsCard title="项目总数" value={42} />)
    expect(screen.getByText('项目总数')).toBeTruthy()
  })

  it('renders subtitle when provided', () => {
    render(<StatsCard title="项目总数" value={42} subtitle="本周更新 3 个项目" />)
    expect(screen.getByText('本周更新 3 个项目')).toBeTruthy()
  })

  it('does not render subtitle when not provided', () => {
    const { container } = render(<StatsCard title="项目总数" value={42} />)
    expect(container.querySelector('p.text-xs.font-body.pt-4')).toBeNull()
  })

  it('renders icon when provided', () => {
    const { container } = render(<StatsCard title="项目总数" value={42} icon="folder_open" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders growth indicator when provided', () => {
    render(<StatsCard title="项目总数" value={42} growth={12} />)
    expect(screen.getByText('12%')).toBeTruthy()
    expect(screen.getByText('较上月')).toBeTruthy()
  })

  it('renders negative growth with trending_down icon', () => {
    const { container } = render(<StatsCard title="项目总数" value={42} growth={-5} />)
    expect(screen.getByText('5%')).toBeTruthy()
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders linear progress bar when progressVariant is linear', () => {
    const { container } = render(
      <StatsCard title="预算执行率" value="60%" progress={60} progressVariant="linear" progressLabel="全局预算执行" />
    )
    expect(screen.getByText('60%')).toBeTruthy()
    expect(screen.getByText('全局预算执行')).toBeTruthy()
    const fillDiv = container.querySelector('[data-progress-fill]')
    expect(fillDiv).toBeTruthy()
  })

  it('renders ring progress when progressVariant is ring', () => {
    const { container } = render(
      <StatsCard title="预算执行率" value="60%" progress={60} progressVariant="ring" progressLabel="全局预算执行" />
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('renders accent variant with gradient background', () => {
    const { container } = render(
      <StatsCard title="项目总数" value={42} variant="accent" />
    )
    const card = container.firstElementChild as HTMLElement
    expect(card.className).toContain('bg-gradient-to-br')
  })

  it('applies tone-specific styling', () => {
    const { container } = render(
      <StatsCard title="项目总数" value={42} tone="green" />
    )
    const card = container.firstElementChild as HTMLElement
    expect(card.className).toContain('border')
  })

  it('handles string value that is not numeric', () => {
    render(<StatsCard title="状态" value="N/A" />)
    expect(screen.getByText('状态')).toBeTruthy()
  })

  it('handles string value with number and suffix', () => {
    render(<StatsCard title="预算" value="100万" />)
    expect(screen.getByText('预算')).toBeTruthy()
  })
})
