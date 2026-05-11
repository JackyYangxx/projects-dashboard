import React, { useEffect } from 'react'

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
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-surface-elevated border-t border-outline flex items-center justify-between px-6">
      <button
        onClick={onPrev}
        disabled={!prevId}
        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-surface-base text-on-surface-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:text-on-surface-tertiary"
      >
        <span className="material-symbols-outlined text-xl">chevron_left</span>
        <span className="font-body text-sm font-medium">Prev</span>
      </button>

      <div className="font-mono tabular-nums text-sm text-on-surface-secondary">
        <span className="font-heading font-semibold text-on-surface-primary">{currentIndex}</span>
        <span className="mx-1">/</span>
        <span>{total}</span>
      </div>

      <button
        onClick={onNext}
        disabled={!nextId}
        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-surface-base text-on-surface-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:text-on-surface-tertiary"
      >
        <span className="font-body text-sm font-medium">Next</span>
        <span className="material-symbols-outlined text-xl">chevron_right</span>
      </button>
    </div>
  )
}

export default PrevNextNav