import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'

interface TipTapEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  readOnly?: boolean
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  value = '',
  onChange,
  placeholder = '在此输入内容...',
  readOnly = false,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Image,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  React.useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly)
    }
  }, [readOnly, editor])

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  if (!editor) {
    return (
      <div className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 bg-surface-elevated border border-outline rounded-lg">
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-surface-base rounded w-3/4" />
          <div className="h-3 bg-surface-base rounded w-1/2" />
        </div>
      </div>
    )
  }

  const toolbarButtons = [
    {
      id: 'bold',
      icon: 'format_bold',
      title: '粗体',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
    },
    {
      id: 'italic',
      icon: 'format_italic',
      title: '斜体',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
    },
    {
      id: 'ul',
      icon: 'format_list_bulleted',
      title: '无序列表',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
    },
    {
      id: 'ol',
      icon: 'format_list_numbered',
      title: '有序列表',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
    },
    {
      id: 'link',
      icon: 'link',
      title: '链接',
      action: () => {
        const url = window.prompt('请输入链接地址:')
        if (url) {
          editor.chain().focus().setLink({ href: url }).run()
        }
      },
      isActive: editor.isActive('link'),
    },
    {
      id: 'image',
      icon: 'image',
      title: '图片',
      action: () => {
        const url = window.prompt('请输入图片地址:')
        if (url) {
          editor.chain().focus().setImage({ src: url }).run()
        }
      },
      isActive: false,
    },
  ]

  return (
    <div
      className={`rounded-lg overflow-hidden transition-all ${
        editor.isFocused ? 'ring-2 ring-primary-500' : 'ring-1 ring-outline'
      }`}
    >
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-1 px-3 py-2 bg-surface-base border-b border-outline flex-wrap">
          {toolbarButtons.map((btn) => (
            <button
              key={btn.id}
              onMouseDown={(e) => {
                e.preventDefault()
                btn.action()
              }}
              title={btn.title}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors cursor-pointer ${
                btn.isActive
                  ? 'bg-primary-50 text-primary-500'
                  : 'text-on-surface-secondary hover:bg-surface-container hover:text-on-surface-primary'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{btn.icon}</span>
            </button>
          ))}
          <div className="w-px h-5 bg-outline mx-1" />
          <span className="text-xs font-body text-on-surface-tertiary ml-auto">
            富文本编辑器
          </span>
        </div>
      )}

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className={`min-h-[200px] max-h-[400px] overflow-y-auto p-4 bg-surface-elevated text-sm font-body text-on-surface-primary focus:outline-none ${
          readOnly ? 'cursor-default' : ''
        }`}
        style={{ fontFamily: 'Fira Sans, sans-serif' }}
      />
    </div>
  )
}

export default TipTapEditor
