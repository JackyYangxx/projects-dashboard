import React from 'react'

interface HeaderProps {
  title?: string
}

const Header: React.FC<HeaderProps> = ({ title = '项目概览' }) => {
  return (
    <header className="ml-64 h-16 bg-surface-elevated border-b border-outline flex items-center px-6 gap-4 sticky top-0 z-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm font-body">
        <span className="text-on-surface-tertiary">Precision Curator</span>
        <span className="text-on-surface-tertiary">/</span>
        <span className="text-on-surface-primary font-medium">{title}</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md ml-4">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-tertiary text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="搜索项目..."
            className="w-full pl-10 pr-4 py-2 bg-surface-base border border-outline rounded-lg text-sm font-body text-on-surface-primary placeholder:text-on-surface-tertiary focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
      </div>

      {/* Right icons */}
      <div className="flex items-center gap-1 ml-auto">
        <button className="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-secondary hover:bg-surface-container hover:text-on-surface-primary transition-colors">
          <span className="material-symbols-outlined text-xl">notifications</span>
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-secondary hover:bg-surface-container hover:text-on-surface-primary transition-colors">
          <span className="material-symbols-outlined text-xl">settings</span>
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-500 text-white font-heading font-semibold text-sm ml-1">
          J
        </button>
      </div>
    </header>
  )
}

export default Header
