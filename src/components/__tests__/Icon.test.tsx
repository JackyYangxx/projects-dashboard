import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Icon from '../Icon'
import type { IconName } from '../Icon'

describe('<Icon>', () => {
  it('renders without crashing for a valid icon name', () => {
    const { container } = render(<Icon name="dashboard" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders with a custom size', () => {
    const { container } = render(<Icon name="add" size={32} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('applies className to the icon', () => {
    const { container } = render(<Icon name="delete" className="text-red-500" />)
    const svg = container.querySelector('svg')
    expect(svg?.className.baseVal || svg?.getAttribute('class') || '').toContain('text-red-500')
  })

  it('renders spin class when spin is true', () => {
    const { container } = render(<Icon name="progress_activity" spin />)
    const svg = container.querySelector('svg')
    expect(svg?.className.baseVal || svg?.getAttribute('class') || '').toContain('animate-spin')
  })

  it('does not render spin class when spin is false', () => {
    const { container } = render(<Icon name="progress_activity" />)
    const svg = container.querySelector('svg')
    const cls = svg?.className.baseVal || svg?.getAttribute('class') || ''
    expect(cls).not.toContain('animate-spin')
  })

  it('renders each known icon without crashing', () => {
    const iconNames: IconName[] = [
      'dashboard', 'search', 'trending_up', 'trending_down', 'inbox',
      'visibility', 'edit', 'delete', 'progress_activity', 'folder_copy',
      'chevron_left', 'chevron_right', 'chevron_down', 'upload_file', 'download',
      'add', 'folder_open', 'arrow_back', 'search_off', 'group_off',
      'timeline', 'close', 'account_balance_wallet', 'settings', 'open_in_new',
      'filter_alt_off', 'filter', 'code', 'apps', 'account_tree',
      'palette', 'fact_check', 'play_circle', 'check_circle', 'pause_circle',
      'auto_awesome', 'hub', 'design_services', 'public', 'pending_actions',
    ]
    for (const name of iconNames) {
      const { container, unmount } = render(<Icon name={name} />)
      expect(container.querySelector('svg')).toBeTruthy()
      unmount()
    }
  })
})
