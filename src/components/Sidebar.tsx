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
  { label: '项目概览', icon: 'dashboard', path: '/' },
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
    <aside className="fixed top-0 left-0 h-screen w-64 bg-sidebar-bg flex flex-col z-20 border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div
          ref={logoRef}
          className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center"
        >
          <span className="text-white font-heading font-bold text-sm">P</span>
        </div>
        <div className="flex flex-col">
          <span className="font-heading font-semibold text-sidebar-text-strong text-sm tracking-tight">
            Precision Curator
          </span>
          <span className="text-[10px] font-mono text-sidebar-text/70">v1.0.4</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'font-medium text-sidebar-text-active bg-[rgba(16,185,129,0.1)]'
                      : 'text-sidebar-text hover:text-sidebar-text-strong hover:bg-sidebar-bg-hover'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary-400 rounded-r-full" />
                  )}
                  <Icon name={item.icon as IconName} size={20} className={isActive ? 'text-primary-400' : undefined} />
                  <span>
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
        <div className="flex items-center gap-2 text-[11px] font-mono text-sidebar-text/60">
          <span ref={statusDotRef} className="w-1.5 h-1.5 rounded-full bg-primary-400" />
          <span>system online</span>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
