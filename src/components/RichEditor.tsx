import React, { useState } from 'react'

interface RichEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  readOnly?: boolean
}

const RichEditor: React.FC<RichEditorProps> = ({
  value = '',
  onChange,
  placeholder = '在此输入内容...',
  readOnly = false,
}) => {
  const [text, setText] = useState(value)

  if (readOnly) {
    return (
      <div
        className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 bg-surface-elevated rounded-lg"
        style={{ fontFamily: 'Fira Sans, sans-serif' }}
        dangerouslySetInnerHTML={{ __html: value || '<p style="color: #94A3B8;">无内容</p>' }}
      />
    )
  }

  return (
    <div className="rounded-lg overflow-hidden transition-all ring-1 ring-outline focus-within:ring-2 focus-within:ring-primary-500">
      <div className="bg-surface-base border-b border-outline px-3 py-2 flex items-center gap-2">
        <button type="button" className="px-3 py-1 text-sm font-bold bg-surface-container rounded hover:bg-primary-50">B</button>
        <button type="button" className="px-3 py-1 text-sm italic bg-surface-container rounded hover:bg-primary-50">I</button>
        <button type="button" className="px-3 py-1 text-sm underline bg-surface-container rounded hover:bg-primary-50">U</button>
      </div>
      <textarea
        className="w-full min-h-[200px] max-h-[400px] p-4 bg-surface-elevated text-sm text-on-surface-primary focus:outline-none resize-none"
        style={{ fontFamily: 'Fira Sans, sans-serif' }}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          onChange?.(e.target.value)
        }}
        placeholder={placeholder}
      />
    </div>
  )
}

export default RichEditor
