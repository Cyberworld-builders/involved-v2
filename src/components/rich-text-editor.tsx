'use client'

import { useEffect, useState } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { TableKit } from '@tiptap/extension-table'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

export default function RichTextEditor({ content, onChange, placeholder = 'Enter content...' }: RichTextEditorProps) {
  const [isCodeView, setIsCodeView] = useState(false)
  const [codeContent, setCodeContent] = useState(content)
  const [isInTable, setIsInTable] = useState(false)
  const [tableHasBorders, setTableHasBorders] = useState(false)
  
  // Helper function to check if cursor is in a table
  const checkIfInTable = (editor: Editor | null) => {
    if (!editor) return false
    const { selection } = editor.state
    const { $anchor } = selection
    let depth = $anchor.depth
    while (depth > 0) {
      const node = $anchor.node(depth)
      if (node.type.name === 'table') {
        return true
      }
      depth--
    }
    return false
  }

  // Helper function to check if table has borders
  const checkTableBorders = (editor: Editor | null) => {
    if (!editor) return false
    const { selection } = editor.state
    const { $anchor } = selection
    let depth = $anchor.depth
    while (depth > 0) {
      const node = $anchor.node(depth)
      if (node.type.name === 'table') {
        const attrs = node.attrs || {}
        const currentClass = attrs.class || ''
        // Check if table has border class or if cells have borders (default)
        // By default, our CSS adds borders, so we check if it's explicitly removed
        return !currentClass.includes('table-borderless')
      }
      depth--
    }
    return false
  }

  // Toggle table borders
  const toggleTableBorders = () => {
    if (!editor) return
    
    const { selection } = editor.state
    const { $anchor } = selection
    let depth = $anchor.depth
    
    // Find table node
    while (depth > 0) {
      const node = $anchor.node(depth)
      if (node.type.name === 'table') {
        const currentAttrs = node.attrs || {}
        const currentClass = (currentAttrs.class || '').toString()
        const hasBorders = !currentClass.includes('table-borderless')
        
        // Get table position
        const tablePos = $anchor.start(depth) - 1
        
        if (hasBorders) {
          // Remove borders - add borderless class
          const newClass = currentClass ? `${currentClass} table-borderless` : 'table-borderless'
          editor.chain()
            .focus()
            .command(({ tr, state }) => {
              const tableNode = state.doc.nodeAt(tablePos)
              if (tableNode && tableNode.type.name === 'table') {
                tr.setNodeMarkup(tablePos, undefined, {
                  ...tableNode.attrs,
                  class: newClass,
                })
              }
              return true
            })
            .run()
          setTableHasBorders(false)
        } else {
          // Add borders - remove borderless class
          const newClass = currentClass.replace(/table-borderless/g, '').replace(/\s+/g, ' ').trim() || undefined
          editor.chain()
            .focus()
            .command(({ tr, state }) => {
              const tableNode = state.doc.nodeAt(tablePos)
              if (tableNode && tableNode.type.name === 'table') {
                tr.setNodeMarkup(tablePos, undefined, {
                  ...tableNode.attrs,
                  class: newClass || null,
                })
              }
              return true
            })
            .run()
          setTableHasBorders(true)
        }
        break
      }
      depth--
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      TableKit,
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
      setIsInTable(checkIfInTable(editor))
      setTableHasBorders(checkTableBorders(editor))
    },
    onSelectionUpdate: ({ editor }) => {
      setIsInTable(checkIfInTable(editor))
      setTableHasBorders(checkTableBorders(editor))
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-3',
      },
    },
  })

  // Update editor content when content prop changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
      setIsInTable(checkIfInTable(editor))
      setTableHasBorders(checkTableBorders(editor))
    }
    // Also update code content if it's different
    if (content !== codeContent) {
      setCodeContent(content)
    }
  }, [content, codeContent, editor])

  // Initialize table state when editor is ready
  useEffect(() => {
    if (editor) {
      setIsInTable(checkIfInTable(editor))
      setTableHasBorders(checkTableBorders(editor))
    }
  }, [editor])

  // Sync code content when switching to code view
  useEffect(() => {
    if (isCodeView && editor) {
      setCodeContent(editor.getHTML())
    }
  }, [isCodeView, editor])

  // Handle toggle between code and WYSIWYG view
  const handleToggleView = () => {
    if (isCodeView) {
      // Switching from code to WYSIWYG - update editor with code content
      if (editor) {
        editor.commands.setContent(codeContent)
        onChange(codeContent)
      }
    } else {
      // Switching from WYSIWYG to code - update code content with editor HTML
      if (editor) {
        setCodeContent(editor.getHTML())
      }
    }
    setIsCodeView(!isCodeView)
  }

  // Handle code content change
  const handleCodeChange = (newCode: string) => {
    setCodeContent(newCode)
    onChange(newCode)
  }

  if (!editor) {
    return null
  }

  return (
    <div className="border border-gray-300 rounded-md">
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-gray-50 p-2 flex flex-wrap gap-1 items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {!isCodeView && (
            <>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={`px-2 py-1 rounded text-sm ${
                  editor.isActive('bold')
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title="Bold"
              >
                <strong>B</strong>
              </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`px-2 py-1 rounded text-sm ${
            editor.isActive('italic')
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`px-2 py-1 rounded text-sm ${
            editor.isActive('strike')
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title="Strikethrough"
        >
          <s>S</s>
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2 py-1 rounded text-sm ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 rounded text-sm ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1 rounded text-sm ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title="Heading 3"
        >
          H3
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 rounded text-sm ${
            editor.isActive('bulletList')
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title="Bullet List"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 rounded text-sm ${
            editor.isActive('orderedList')
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title="Numbered List"
        >
          1.
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-2 py-1 rounded text-sm ${
            editor.isActive('blockquote')
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title="Quote"
        >
          &quot;
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="px-2 py-1 rounded text-sm text-gray-700 hover:bg-gray-100"
          title="Horizontal Rule"
        >
          ─
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className="px-2 py-1 rounded text-sm text-gray-700 hover:bg-gray-100"
          title="Insert Table"
        >
          ⧉
        </button>
        {isInTable && (
          <>
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              disabled={!editor.can().addColumnBefore()}
              className="px-2 py-1 rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              title="Add Column Before"
            >
              +C
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              disabled={!editor.can().addColumnAfter()}
              className="px-2 py-1 rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              title="Add Column After"
            >
              C+
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              disabled={!editor.can().deleteColumn()}
              className="px-2 py-1 rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              title="Delete Column"
            >
              -C
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowBefore().run()}
              disabled={!editor.can().addRowBefore()}
              className="px-2 py-1 rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              title="Add Row Before"
            >
              +R
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              disabled={!editor.can().addRowAfter()}
              className="px-2 py-1 rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              title="Add Row After"
            >
              R+
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteRow().run()}
              disabled={!editor.can().deleteRow()}
              className="px-2 py-1 rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              title="Delete Row"
            >
              -R
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
              disabled={!editor.can().toggleHeaderColumn()}
              className={`px-2 py-1 rounded text-sm ${
                editor.isActive('tableHeader')
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              } disabled:opacity-50`}
              title="Toggle Header Column"
            >
              HC
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeaderRow().run()}
              disabled={!editor.can().toggleHeaderRow()}
              className={`px-2 py-1 rounded text-sm ${
                editor.isActive('tableHeader')
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              } disabled:opacity-50`}
              title="Toggle Header Row"
            >
              HR
            </button>
            <button
              type="button"
              onClick={toggleTableBorders}
              className={`px-2 py-1 rounded text-sm ${
                tableHasBorders
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="Toggle Table Borders"
            >
              ⧈
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteTable().run()}
              disabled={!editor.can().deleteTable()}
              className="px-2 py-1 rounded text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              title="Delete Table"
            >
              ×T
            </button>
          </>
        )}
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="px-2 py-1 rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          title="Undo"
        >
          ↶
        </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().chain().focus().redo().run()}
                className="px-2 py-1 rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                title="Redo"
              >
                ↷
              </button>
            </>
          )}
        </div>
        
        {/* Toggle View Button */}
        <button
          type="button"
          onClick={handleToggleView}
          className={`px-3 py-1 rounded text-sm font-medium ${
            isCodeView
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title={isCodeView ? 'Switch to WYSIWYG view' : 'Switch to code view'}
        >
          {isCodeView ? '👁️ WYSIWYG' : '</> Code'}
        </button>
      </div>

      {/* Editor Content or Code View */}
      {isCodeView ? (
        <div className="min-h-[150px] max-h-[400px] overflow-y-auto">
          <textarea
            value={codeContent}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="w-full h-full min-h-[150px] p-3 font-mono text-sm border-0 focus:outline-none focus:ring-0 resize-none"
            placeholder="Enter HTML markup..."
            spellCheck={false}
          />
        </div>
      ) : (
        <div className="min-h-[150px] max-h-[400px] overflow-y-auto">
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  )
}

