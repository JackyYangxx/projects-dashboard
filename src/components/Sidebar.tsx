import React from 'react'

interface NavItem {
  label: string
  icon: string
  path: string
}

const navItems: NavItem[] = [
  { label: '项目概览', icon: 'grid_view', path: '/' },
  { label: '项目库', icon: 'folder', path: '/projects' },
  { label: '数据分析', icon: 'analytics', path: '/analytics' },
  { label: '团队管理', icon: 'group', path: '/team' },
]

const Sidebar: React.FC = () => {
  const [activePath, setActivePath] = React.useState('/')

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-surface-elevated flex flex-col z-20">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-outline">
        <div className="w-8 h-8 bg-primary-500 rounded-md flex items-center justify-center">
          <span className="text-white font-heading font-bold text-sm">P</span>
        </div>
        <span className="font-heading font-semibold text-on-surface-primary text-base">
          Precision Curator
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <button
                onClick={() => setActivePath(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-colors ${
                  activePath === item.path
                    ? 'bg-primary-500 text-white'
                    : 'text-on-surface-secondary hover:bg-surface-container hover:text-on-surface-primary'
                }`}
              >
                <span className="material-symbols-outlined text-lg leading-none">
                  {item.icon}
                </span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-4 border-t border-outline">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body text-on-surface-secondary hover:bg-surface-container hover:text-on-surface-primary transition-colors">
          <span className="material-symbols-outlined text-lg leading-none">help</span>
          帮助中心
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body text-on-surface-secondary hover:bg-surface-container hover:text-on-surface-primary transition-colors mt-1">
          <span className="material-symbols-outlined text-lg leading-none">logout</span>
          退出登录
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
