import React, { useEffect } from 'react'
import Icon from './Icon'

interface PrevNextNavProps {
  prevId?: string
  nextId?: string
  currentIndex: number
  total: number
  onPrev: () => void
  onNext: () => void
}

const PrevNextNav: React.FC<PrevNextNavProps> = ({
  prevId,
  nextId,
  currentIndex,
  total,
  onPrev,
  onNext,
}) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft' && prevId) {
        onPrev()
      }
      if (e.altKey && e.key === 'ArrowRight' && nextId) {
        onNext()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [prevId, nextId, onPrev, onNext])

  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-white border-t border-outline flex items-center justify-between px-6">
      <button
        onClick={onPrev}
        disabled={!prevId}
        className="flex items-center gap-1.5 h-9 px-3 rounded-md transition-colors hover:bg-surface-hover text-on-surface-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:text-on-surface-tertiary"
      >
        <Icon name="chevron_left" size={16} />
        <span className="font-body text-sm font-medium">Prev</span>
      </button>

      <div className="font-mono tabular-nums text-sm text-on-surface-secondary">
        <span className="font-heading font-semibold text-on-surface-primary">{currentIndex}</span>
        <span className="mx-1 text-on-surface-tertiary">/</span>
        <span>{total}</span>
      </div>

      <button
        onClick={onNext}
        disabled={!nextId}
        className="flex items-center gap-1.5 h-9 px-3 rounded-md transition-colors hover:bg-surface-hover text-on-surface-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:text-on-surface-tertiary"
      >
        <span className="font-body text-sm font-medium">Next</span>
        <Icon name="chevron_right" size={16} />
      </button>
    </div>
  )
}

export default PrevNextNav