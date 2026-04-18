import React from 'react'

interface HeaderProps {
  title?: string
}

const Header: React.FC<HeaderProps> = ({ title = '项目概览' }) => {
  return (
    <header className="ml-64 h-16 bg-white/60 backdrop-blur-md border-b border-outline flex items-center px-6 gap-4 sticky top-0 z-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm font-body">
        <span className="text-on-surface-tertiary font-mono text-xs">precision-curator</span>
        <span className="text-on-surface-tertiary">/</span>
        <span className="text-on-surface-primary font-medium">{title}</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md ml-4">
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-tertiary text-lg transition-colors group-focus-within:text-primary-500">
            search
          </span>
          <input
            type="text"
            id="search"
            placeholder="搜索项目..."
            aria-label="搜索项目"
            className="w-full pl-10 pr-4 py-2 bg-white/80 border border-outline rounded-xl text-sm font-body text-on-surface-primary placeholder:text-on-surface-tertiary focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-200"
          />
        </div>
      </div>
    </header>
  )
}

export default Header
