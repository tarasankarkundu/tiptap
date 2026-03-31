import type { Editor } from '@tiptap/core'
import type { SlashCommandItem } from '../types'
import {
  IconLetterT, IconH1, IconH2, IconH3, IconList, IconListNumbers,
  IconListCheck, IconBlockquote, IconCode, IconSeparator,
  IconTable, IconPhoto, IconListTree, IconAt, IconChartBar,
  IconColumns2, IconColumns3,
} from '@meldui/tabler-vue'

export function defaultSlashCommands(
  onImageInsert?: () => void,
): SlashCommandItem[] {
  return [
    {
      title: 'Text',
      description: 'Plain text paragraph',
      icon: IconLetterT,
      keywords: ['paragraph', 'plain', 'normal'],
      command: (editor: Editor) => {
        editor.chain().focus().clearNodes().run()
      },
    },
    {
      title: 'Heading 1',
      description: 'Large section heading',
      icon: IconH1,
      keywords: ['h1', 'title'],
      command: (editor: Editor) => {
        editor.chain().focus().toggleHeading({ level: 1 }).run()
      },
    },
    {
      title: 'Heading 2',
      description: 'Medium section heading',
      icon: IconH2,
      keywords: ['h2', 'subtitle'],
      command: (editor: Editor) => {
        editor.chain().focus().toggleHeading({ level: 2 }).run()
      },
    },
    {
      title: 'Heading 3',
      description: 'Small section heading',
      icon: IconH3,
      keywords: ['h3'],
      command: (editor: Editor) => {
        editor.chain().focus().toggleHeading({ level: 3 }).run()
      },
    },
    {
      title: 'Bullet List',
      description: 'Create a simple bullet list',
      icon: IconList,
      keywords: ['ul', 'unordered'],
      command: (editor: Editor) => {
        editor.chain().focus().toggleBulletList().run()
      },
    },
    {
      title: 'Ordered List',
      description: 'Create a numbered list',
      icon: IconListNumbers,
      keywords: ['ol', 'numbered'],
      command: (editor: Editor) => {
        editor.chain().focus().toggleOrderedList().run()
      },
    },
    {
      title: 'Task List',
      description: 'Create a to-do list with checkboxes',
      icon: IconListCheck,
      keywords: ['todo', 'checkbox'],
      command: (editor: Editor) => {
        editor.chain().focus().toggleTaskList().run()
      },
    },
    {
      title: 'Blockquote',
      description: 'Capture a quote',
      icon: IconBlockquote,
      keywords: ['quote'],
      command: (editor: Editor) => {
        editor.chain().focus().toggleBlockquote().run()
      },
    },
    {
      title: 'Code Block',
      description: 'Add a code snippet',
      icon: IconCode,
      keywords: ['pre', 'snippet'],
      command: (editor: Editor) => {
        editor.chain().focus().toggleCodeBlock().run()
      },
    },
    {
      title: 'Horizontal Rule',
      description: 'Add a visual divider',
      icon: IconSeparator,
      keywords: ['hr', 'divider', 'line'],
      command: (editor: Editor) => {
        editor.chain().focus().setHorizontalRule().run()
      },
    },
    {
      title: 'Table of Contents',
      description: 'Auto-generated from headings',
      icon: IconListTree,
      keywords: ['toc', 'outline', 'navigation'],
      command: (editor: Editor) => {
        editor.chain().focus().insertContent({ type: 'tableOfContentsNode' }).run()
      },
    },
    {
      title: 'Table',
      description: 'Insert a table',
      icon: IconTable,
      keywords: ['grid'],
      command: (editor: Editor) => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      },
    },
    {
      title: '2 Columns',
      description: 'Split into 2 columns',
      icon: IconColumns2,
      keywords: ['column', 'split', 'layout', 'two'],
      command: (editor: Editor) => {
        editor.commands.setColumns(2)
      },
    },
    {
      title: '3 Columns',
      description: 'Split into 3 columns',
      icon: IconColumns3,
      keywords: ['column', 'split', 'layout', 'three'],
      command: (editor: Editor) => {
        editor.commands.setColumns(3)
      },
    },
    {
      title: 'Chart',
      description: 'Insert a data chart',
      icon: IconChartBar,
      keywords: ['chart', 'graph', 'bar', 'line', 'pie', 'data'],
      command: (editor: Editor) => {
        editor.chain().focus().insertContent({ type: 'meldChart' }).run()
      },
    },
    {
      title: 'Mention',
      description: 'Mention a person or team',
      icon: IconAt,
      keywords: ['mention', 'user', 'person', 'tag'],
      command: (editor: Editor) => {
        editor.chain().focus().insertContent('@').run()
      },
    },
    {
      title: 'Image',
      description: 'Insert an image from URL',
      icon: IconPhoto,
      keywords: ['picture', 'photo'],
      command: (editor: Editor) => {
        if (onImageInsert) {
          onImageInsert()
        } else {
          const url = window.prompt('Image URL:')
          if (url) {
            editor.chain().focus().setImage({ src: url }).run()
          }
        }
      },
    },
  ]
}
