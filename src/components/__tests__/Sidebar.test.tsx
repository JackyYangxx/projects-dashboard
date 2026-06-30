import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from '../Sidebar'

function renderSidebar(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Sidebar />
    </MemoryRouter>
  )
}

describe('<Sidebar>', () => {
  it('renders app title and version', () => {
    renderSidebar()
    expect(screen.getByText('项目管理看板')).toBeTruthy()
    expect(screen.getByText(/v1\.0\.\d+/)).toBeTruthy()
  })

  it('renders workspace section heading', () => {
    renderSidebar()
    expect(screen.getByText('工作区')).toBeTruthy()
  })

  it('renders navigation items', () => {
    renderSidebar()
    expect(screen.getByText('项目看板')).toBeTruthy()
    expect(screen.getByText('代码评审')).toBeTruthy()
  })

  it('renders settings button', () => {
    renderSidebar()
    expect(screen.getByText('设置')).toBeTruthy()
  })

  it('highlights dashboard nav item as active when on /', () => {
    renderSidebar('/')
    const dashboardBtn = screen.getByText('项目看板').closest('button')
    expect(dashboardBtn?.getAttribute('aria-current')).toBe('page')
  })

  it('highlights code-review nav item as active when on /code-review', () => {
    renderSidebar('/code-review')
    const codeReviewBtn = screen.getByText('代码评审').closest('button')
    expect(codeReviewBtn?.getAttribute('aria-current')).toBe('page')
  })

  it('highlights settings as active when on /settings', () => {
    renderSidebar('/settings')
    const settingsBtn = screen.getByText('设置').closest('button')
    expect(settingsBtn?.getAttribute('aria-current')).toBe('page')
  })

  it('renders logo SVG', () => {
    const { container } = renderSidebar()
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
