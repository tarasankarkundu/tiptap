import type { Extension, Mark, Node as TiptapNode } from '@tiptap/core'
import type { ToolbarItem, SlashCommandItem, DefaultExtensionOptions, MentionItem } from './types'
import { StarterKit } from '@tiptap/starter-kit'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { TextAlign } from '@tiptap/extension-text-align'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TableOfContents } from '@tiptap/extension-table-of-contents'
import { ResizableImage } from './image/ResizableImageExtension'
import { TocNode } from './toc/TocExtension'
import { ChartNode } from './chart/ChartNodeExtension'
import { createMentionExtension } from './mention/MentionExtension'
import { createSlashCommandExtension } from './slash-commands/SlashCommandExtension'
import { defaultSlashCommands } from './slash-commands/defaultSlashCommands'
import {
  IconBold, IconItalic, IconH1, IconH2,
  IconList, IconListCheck,
} from '@meldui/tabler-vue'

export function createDefaultExtensions(options: {
  defaults?: DefaultExtensionOptions
  placeholder?: string
  slashCommands?: SlashCommandItem[]
  onRequestImageUrl?: (callback: (url: string) => void) => void
  onMentionSearch?: (query: string) => Promise<MentionItem[]>
}): (Extension | Mark | TiptapNode)[] {
  const d = options.defaults ?? {}
  const exts: (Extension | Mark | TiptapNode)[] = [StarterKit]

  if (d.taskList !== false) {
    exts.push(TaskList)
    exts.push(
      typeof d.taskList === 'object'
        ? TaskItem.configure(d.taskList)
        : TaskItem.configure({ nested: true }),
    )
  }

  if (d.image !== false) {
    const imageOpts: Record<string, unknown> = {
      onRequestImageUrl: options.onRequestImageUrl,
    }
    if (typeof d.image === 'object') Object.assign(imageOpts, d.image)
    exts.push(ResizableImage.configure(imageOpts))
  }

  if (d.table !== false) {
    exts.push(
      typeof d.table === 'object'
        ? Table.configure(d.table)
        : Table.configure({ resizable: true }),
    )
    exts.push(TableRow, TableHeader, TableCell)
  }

  // Table of Contents (always included — the node view + heading tracker)
  exts.push(TableOfContents, TocNode)

  if (d.chart !== false) {
    exts.push(ChartNode)
  }

  if (d.textAlign !== false) {
    exts.push(
      typeof d.textAlign === 'object'
        ? TextAlign.configure(d.textAlign)
        : TextAlign.configure({ types: ['heading', 'paragraph'] }),
    )
  }

  if (d.placeholder !== false) {
    const text =
      typeof d.placeholder === 'string'
        ? d.placeholder
        : options.placeholder ?? 'Type / for commands...'
    exts.push(Placeholder.configure({ placeholder: text }))
  }

  if (d.slashCommands !== false && options.slashCommands) {
    exts.push(createSlashCommandExtension(options.slashCommands))
  }

  if (d.mention !== false && options.onMentionSearch) {
    exts.push(createMentionExtension(options.onMentionSearch))
  }

  return exts
}

export function createDefaultToolbarItems(): ToolbarItem[] {
  return [
    {
      key: 'bold',
      icon: IconBold,
      label: 'Bold',
      shortcut: 'Ctrl+B',
      action: (e) => { e.chain().focus().toggleBold().run() },
      isActive: (e) => e.isActive('bold'),
    },
    {
      key: 'italic',
      icon: IconItalic,
      label: 'Italic',
      shortcut: 'Ctrl+I',
      action: (e) => { e.chain().focus().toggleItalic().run() },
      isActive: (e) => e.isActive('italic'),
      separator: 'after',
    },
    {
      key: 'h1',
      icon: IconH1,
      label: 'Heading 1',
      action: (e) => { e.chain().focus().toggleHeading({ level: 1 }).run() },
      isActive: (e) => e.isActive('heading', { level: 1 }),
    },
    {
      key: 'h2',
      icon: IconH2,
      label: 'Heading 2',
      action: (e) => { e.chain().focus().toggleHeading({ level: 2 }).run() },
      isActive: (e) => e.isActive('heading', { level: 2 }),
      separator: 'after',
    },
    {
      key: 'bullet-list',
      icon: IconList,
      label: 'Bullet List',
      action: (e) => { e.chain().focus().toggleBulletList().run() },
      isActive: (e) => e.isActive('bulletList'),
    },
    {
      key: 'task-list',
      icon: IconListCheck,
      label: 'Task List',
      action: (e) => { e.chain().focus().toggleTaskList().run() },
      isActive: (e) => e.isActive('taskList'),
    },
  ]
}

export function resolveSlashCommands(options: {
  override?: SlashCommandItem[]
  extra?: SlashCommandItem[]
  disable?: string[]
  onImageInsert?: () => void
}): SlashCommandItem[] {
  if (options.override) return options.override

  let commands = defaultSlashCommands(options.onImageInsert)

  if (options.disable?.length) {
    const disabled = new Set(options.disable)
    commands = commands.filter((c) => !disabled.has(c.title))
  }

  if (options.extra?.length) {
    commands = [...commands, ...options.extra]
  }

  return commands
}
