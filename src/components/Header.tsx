import React from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import TruncatedText from './TruncatedText'

interface HeaderProps {
  title?: string
}

const Header: React.FC<HeaderProps> = ({ title = '项目看板' }) => {
  const navigate = useNavigate()

  return (
    <header className="h-14 bg-white border-b border-outline flex items-center px-6 gap-4 sticky top-0 z-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm font-body min-w-0" aria-label="breadcrumb">
        <span className="text-on-surface-tertiary font-mono text-xs truncate">
          <TruncatedText text="项目管理看板" maxChars={20} />
        </span>
        <span className="text-on-surface-tertiary/60">/</span>
        <span className="text-on-surface-primary font-medium truncate">
          <TruncatedText text={title} maxChars={15} />
        </span>
      </nav>

      {/* Search */}
      <div className="flex-1 max-w-md ml-4">
        <div className="relative group">
          <Icon
            name="search"
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-tertiary transition-colors group-focus-within:text-primary-500"
          />
          <input
            type="text"
            id="search"
            placeholder="搜索项目…"
            aria-label="搜索项目"
            className="w-full pl-9 pr-14 py-1.5 bg-surface-base border border-outline rounded-md text-sm font-body text-on-surface-primary placeholder:text-on-surface-tertiary focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15 transition-all duration-200"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono text-on-surface-tertiary bg-white border border-outline">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => navigate('/project/new')}
          aria-label="新增项目"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 text-white rounded-md text-sm font-body font-medium hover:bg-primary-600 shadow-sm transition-all duration-200 cursor-pointer"
        >
          <Icon name="add" size={16} />
          <span>新增项目</span>
        </button>
      </div>
    </header>
  )
}

export default Header
