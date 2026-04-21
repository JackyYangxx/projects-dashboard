import React from 'react'

interface TruncatedTextProps {
  text: string
  maxChars?: number
  className?: string
  showTooltip?: boolean
}

const TruncatedText: React.FC<TruncatedTextProps> = ({
  text,
  maxChars,
  className = '',
  showTooltip = true,
}) => {
  const shouldTruncate = maxChars && text.length > maxChars
  const displayText = shouldTruncate ? text.slice(0, maxChars) + '…' : text

  return (
    <span
      className={`inline-block ${className}`}
      title={showTooltip ? text : undefined}
    >
      {displayText}
    </span>
  )
}

export default TruncatedText