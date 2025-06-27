import React from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { createLowlight } from 'lowlight'
import { Button } from './button'
import { cn } from '@/lib/utils'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  CheckSquare,
  Code2,
} from 'lucide-react'

const lowlight = createLowlight()

interface RichTextEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  className?: string
  editable?: boolean
  minimal?: boolean
}

interface MenuBarProps {
  editor: Editor | null
  minimal?: boolean
}

const MenuBar: React.FC<MenuBarProps> = ({ editor, minimal = false }) => {
  if (!editor) {
    return null
  }

  const addLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const addImage = () => {
    const url = window.prompt('Enter image URL:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const basicButtons = [
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
      label: 'Bold',
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
      label: 'Italic',
    },
    {
      icon: Strikethrough,
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: () => editor.isActive('strike'),
      label: 'Strikethrough',
    },
    {
      icon: Code,
      action: () => editor.chain().focus().toggleCode().run(),
      isActive: () => editor.isActive('code'),
      label: 'Inline Code',
    },
  ]

  const headingButtons = [
    {
      icon: Heading1,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive('heading', { level: 1 }),
      label: 'Heading 1',
    },
    {
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 }),
      label: 'Heading 2',
    },
    {
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive('heading', { level: 3 }),
      label: 'Heading 3',
    },
  ]

  const listButtons = [
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
      label: 'Bullet List',
    },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
      label: 'Numbered List',
    },
    {
      icon: CheckSquare,
      action: () => editor.chain().focus().toggleTaskList().run(),
      isActive: () => editor.isActive('taskList'),
      label: 'Task List',
    },
  ]

  const additionalButtons = [
    {
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive('blockquote'),
      label: 'Quote',
    },
    {
      icon: Code2,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive('codeBlock'),
      label: 'Code Block',
    },
    {
      icon: LinkIcon,
      action: addLink,
      isActive: () => editor.isActive('link'),
      label: 'Link',
    },
    {
      icon: ImageIcon,
      action: addImage,
      isActive: () => false,
      label: 'Image',
    },
  ]

  const historyButtons = [
    {
      icon: Undo,
      action: () => editor.chain().focus().undo().run(),
      isActive: () => false,
      label: 'Undo',
      disabled: !editor.can().undo(),
    },
    {
      icon: Redo,
      action: () => editor.chain().focus().redo().run(),
      isActive: () => false,
      label: 'Redo',
      disabled: !editor.can().redo(),
    },
  ]

  const renderButtonGroup = (buttons: any[], key: string) => (
    <div key={key} className="flex items-center space-x-1">
      {buttons.map((button, index) => (
        <Button
          key={index}
          variant={button.isActive() ? "default" : "ghost"}
          size="sm"
          onClick={button.action}
          disabled={button.disabled}
          title={button.label}
          className="h-8 w-8 p-0"
        >
          <button.icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  )

  if (minimal) {
    return (
      <div className="border-b border-border p-2 flex items-center space-x-2 bg-muted/20">
        {renderButtonGroup(basicButtons, 'basic')}
        <div className="w-px h-6 bg-border" />
        {renderButtonGroup(headingButtons.slice(0, 2), 'headings')}
        <div className="w-px h-6 bg-border" />
        {renderButtonGroup(listButtons, 'lists')}
      </div>
    )
  }

  return (
    <div className="border-b border-border p-2 flex items-center flex-wrap gap-2 bg-muted/20">
      {renderButtonGroup(basicButtons, 'basic')}
      <div className="w-px h-6 bg-border" />
      {renderButtonGroup(headingButtons, 'headings')}
      <div className="w-px h-6 bg-border" />
      {renderButtonGroup(listButtons, 'lists')}
      <div className="w-px h-6 bg-border" />
      {renderButtonGroup(additionalButtons, 'additional')}
      <div className="w-px h-6 bg-border" />
      {renderButtonGroup(historyButtons, 'history')}
    </div>
  )
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content = '',
  onChange,
  placeholder = 'Start writing...',
  className,
  editable = true,
  minimal = false,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use the lowlight version
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Placeholder.configure({
        placeholder,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  return (
    <div className={cn('border border-border rounded-md bg-background', className)}>
      {editable && <MenuBar editor={editor} minimal={minimal} />}
      <div className="prose prose-neutral dark:prose-invert max-w-none p-4 min-h-[200px] focus-within:outline-none">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default RichTextEditor 