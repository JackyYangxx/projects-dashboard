import React, { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Icon, { type IconName } from './Icon'
import TruncatedText from './TruncatedText'
import { animateLogoPulse, animateStatusDot } from '@/utils/animations'

interface NavItem {
  label: string
  icon: string
  path: string
}

const navItems: NavItem[] = [
  { label: '项目看板', icon: 'dashboard', path: '/' },
  { label: '代码评审', icon: 'code', path: '/code-review' },
]

const Sidebar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const logoRef = useRef<HTMLDivElement>(null)
  const statusDotRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (logoRef.current) animateLogoPulse(logoRef.current)
    if (statusDotRef.current) animateStatusDot(statusDotRef.current)
  }, [])

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-sidebar-bg flex flex-col z-20 border-r border-sidebar-border shadow-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div
          ref={logoRef}
          className="relative w-9 h-9 rounded-md flex items-center justify-center bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 shadow-glow-sm ring-1 ring-black/5"
        >
          <span className="text-white font-heading font-bold text-sm relative z-10">P</span>
          <div className="absolute inset-0 rounded-md bg-gradient-to-tr from-white/0 to-white/30" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-heading font-semibold text-sidebar-text-strong text-sm tracking-tight truncate">
            项目管理看板
          </span>
          <span className="text-[10px] font-mono text-sidebar-text/60 truncate">
            Project Dashboard · v1.0.7
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
            const isActive = location.pathname === item.path
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

      {/* Footer accent */}
      <div className="px-5 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2 text-[11px] font-body text-sidebar-text/60">
          <span ref={statusDotRef} className="w-1.5 h-1.5 rounded-full bg-primary-400" />
          <span className="truncate">本地数据 · 已同步</span>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
