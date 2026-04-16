import React from 'react'

interface RichTextEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  readOnly?: boolean
}

const TOOLS = [
  { id: 'bold', icon: 'format_bold', title: '粗体', command: 'bold' },
  { id: 'italic', icon: 'format_italic', title: '斜体', command: 'italic' },
  { id: 'ul', icon: 'format_list_bulleted', title: '无序列表', command: 'insertUnorderedList' },
  { id: 'ol', icon: 'format_list_numbered', title: '有序列表', command: 'insertOrderedList' },
  { id: 'link', icon: 'link', title: '链接', command: 'createLink' },
  { id: 'image', icon: 'image', title: '图片', command: 'insertImage' },
] as const

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = '在此输入内容...',
  readOnly = false,
}) => {
  const editorRef = React.useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = React.useState(false)

  const execCommand = (command: string) => {
    if (readOnly) return
    document.execCommand(command, false)
    editorRef.current?.focus()
  }

  const handleLink = () => {
    if (readOnly) return
    const url = window.prompt('请输入链接地址:')
    if (url) {
      document.execCommand('createLink', false, url)
    }
  }

  const handleImage = () => {
    if (readOnly) return
    const url = window.prompt('请输入图片地址:')
    if (url) {
      document.execCommand('insertImage', false, url)
    }
  }

  const handleInput = () => {
    if (editorRef.current) {
      onChange?.(editorRef.current.innerHTML)
    }
  }

  const handleToolbarClick = (tool: (typeof TOOLS)[number]) => {
    if (tool.id === 'link') {
      handleLink()
    } else if (tool.id === 'image') {
      handleImage()
    } else {
      execCommand(tool.command)
    }
  }

  return (
    <div
      className={`rounded-lg overflow-hidden transition-all ${
        isFocused ? 'ring-2 ring-primary-500' : 'ring-1 ring-outline'
      }`}
    >
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-1 px-3 py-2 bg-surface-base border-b border-outline">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolbarClick(tool)}
              title={tool.title}
              className="w-8 h-8 flex items-center justify-center rounded text-on-surface-secondary hover:bg-surface-container hover:text-on-surface-primary transition-colors"
            >
              <span className="material-symbols-outlined text-lg">{tool.icon}</span>
            </button>
          ))}
          <div className="w-px h-5 bg-outline mx-1" />
          <span className="text-xs font-body text-on-surface-tertiary ml-auto">
            富文本编辑器
          </span>
        </div>
      )}

      {/* Content area */}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onInput={handleInput}
        className={`min-h-[200px] max-h-[400px] overflow-y-auto p-4 bg-surface-elevated text-sm font-body text-on-surface-primary focus:outline-none ${
          readOnly ? 'cursor-default' : ''
        }`}
        style={{ fontFamily: 'Inter, sans-serif' }}
        data-placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    </div>
  )
}

export default RichTextEditor
