import React from 'react'

interface NavItem {
  label: string
  icon: string
  path: string
}

const navItems: NavItem[] = [
  { label: '项目概览', icon: 'dashboard', path: '/' },
]

const Sidebar: React.FC = () => {
  const [activePath, setActivePath] = React.useState('/')

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-white/80 backdrop-blur-md flex flex-col z-20 border-r border-outline shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-outline">
        <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/20">
          <span className="text-white font-heading font-bold text-sm">P</span>
        </div>
        <div className="flex flex-col">
          <span className="font-heading font-semibold text-on-surface-primary text-sm">
            Precision Curator
          </span>
          <span className="text-[10px] font-mono text-on-surface-tertiary">v1.0.0</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = activePath === item.path
            return (
              <li key={item.path}>
                <button
                  onClick={() => setActivePath(item.path)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/20'
                      : 'text-on-surface-secondary hover:bg-surface-hover hover:text-on-surface-primary'
                  }`}
                >
                  {isActive && (
                    <>
                      {/* Glow effect on icon */}
                      <span className="material-symbols-outlined text-lg leading-none text-white">
                        {item.icon}
                      </span>
                    </>
                  )}
                  {!isActive && (
                    <span className="material-symbols-outlined text-lg leading-none">
                      {item.icon}
                    </span>
                  )}
                  <span className={isActive ? 'font-medium' : ''}>{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-glow-sm" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

    </aside>
  )
}

export default Sidebar
