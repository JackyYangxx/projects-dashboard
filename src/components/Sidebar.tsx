import React, { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Icon, { type IconName } from './Icon'
import TruncatedText from './TruncatedText'
import { animateLogoPulse } from '@/utils/animations'

interface NavItem {
  label: string
  icon: string
  path: string
}

const navItems: NavItem[] = [
  { label: '项目看板', icon: 'dashboard', path: '/' },
  { label: '项目详情', icon: 'visibility', path: '/project' },
  { label: '代码评审', icon: 'code', path: '/code-review' },
]

const Sidebar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const logoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logoRef.current) animateLogoPulse(logoRef.current)
  }, [])

  const isSettingsActive = location.pathname === '/settings'

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-sidebar-bg flex flex-col z-20 border-r border-sidebar-border shadow-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div
          ref={logoRef}
          className="relative w-9 h-9 rounded-md flex items-center justify-center bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 shadow-glow-sm ring-1 ring-black/5"
        >
          <svg viewBox="0 0 36 36" className="w-7 h-7 relative z-10 text-white" fill="none" aria-label="项目管理看板 logo">
            <line x1="9" y1="10.75" x2="27" y2="10.75" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="9" y1="18" x2="27" y2="18" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="9" y1="25.25" x2="27" y2="25.25" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 rounded-md bg-gradient-to-tr from-white/0 to-white/30" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-heading font-semibold text-sidebar-text-strong text-sm tracking-tight truncate">
            项目管理看板
          </span>
          <span className="text-[10px] font-mono text-sidebar-text/60 truncate">
            Project Dashboard · v1.0.11
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-mono uppercase tracking-wider text-sidebar-text/50">
          工作区
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.path === '/project'
              ? location.pathname.startsWith('/project')
              : location.pathname === item.path
            return (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group w-full relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-md text-sm font-body transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'font-semibold text-sidebar-text-active bg-sidebar-active-bg'
                      : 'text-sidebar-text hover:text-sidebar-text-strong hover:bg-sidebar-bg-hover'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-500 rounded-r-full" />
                  )}
                  <Icon
                    name={item.icon as IconName}
                    size={18}
                    className={`transition-colors ${isActive ? 'text-primary-600' : 'text-sidebar-text/80 group-hover:text-sidebar-text-strong'}`}
                  />
                  <span className="truncate">
                    <TruncatedText text={item.label} maxChars={12} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Settings entry (bottom) */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <button
          onClick={() => navigate('/settings')}
          aria-current={isSettingsActive ? 'page' : undefined}
          className={`group w-full relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-md text-sm font-body transition-all duration-200 cursor-pointer ${
            isSettingsActive
              ? 'font-semibold text-sidebar-text-active bg-sidebar-active-bg'
              : 'text-sidebar-text hover:text-sidebar-text-strong hover:bg-sidebar-bg-hover'
          }`}
        >
          {isSettingsActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-500 rounded-r-full" />
          )}
          <Icon
            name="settings"
            size={18}
            className={`transition-colors ${isSettingsActive ? 'text-primary-600' : 'text-sidebar-text/80 group-hover:text-sidebar-text-strong'}`}
          />
          <span className="truncate">
            <TruncatedText text="设置" maxChars={12} />
          </span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
