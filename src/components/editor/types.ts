import type { Component } from 'vue'
import type { Editor, Extension, Mark, Node as TiptapNode } from '@tiptap/core'

// --- Mention Item ---
export interface MentionItem {
  id: string
  label: string
}

// --- Slash Command Item ---
export interface SlashCommandItem {
  title: string
  description: string
  icon: Component | string
  category?: string
  keywords?: string[]
  command: (editor: Editor) => void
}

// --- Toolbar Item ---
export interface ToolbarItem {
  key: string
  icon: Component
  label: string
  action: (editor: Editor) => void
  isActive?: (editor: Editor) => boolean
  shortcut?: string
  separator?: 'before' | 'after'
}

// --- Custom Component Registration (Phase 2) ---
export interface CustomComponentRegistration {
  name: string
  component: Component
  group?: string
  atom?: boolean
  inline?: boolean
  draggable?: boolean
  slashCommand?: Omit<SlashCommandItem, 'command'> & {
    defaultAttrs?: Record<string, unknown>
  }
  attrs?: Record<string, { default: unknown }>
}

// --- Extension opt-out config ---
export interface DefaultExtensionOptions {
  taskList?: boolean | Record<string, unknown>
  image?: boolean | Record<string, unknown>
  table?: boolean | Record<string, unknown>
  textAlign?: boolean | Record<string, unknown>
  placeholder?: boolean | string
  slashCommands?: boolean
  mention?: boolean
  chart?: boolean
  columns?: boolean
}

// --- Editor Props ---
export interface MeldEditorProps {
  modelValue?: string
  defaultExtensions?: DefaultExtensionOptions
  extraExtensions?: (Extension | Mark | TiptapNode)[]
  overrideExtensions?: (Extension | Mark | TiptapNode)[]
  extraSlashCommands?: SlashCommandItem[]
  disableSlashCommands?: string[]
  overrideSlashCommands?: SlashCommandItem[]
  toolbarItems?: ToolbarItem[]
  showToolbar?: boolean
  showBubbleMenu?: boolean
  editable?: boolean
  placeholder?: string
  /** Custom CSS classes for the editor outer container */
  editorClass?: string
  /** Callback to upload an image file. Should return the URL of the uploaded image. */
  onImageUpload?: (file: File) => Promise<string>
  /** Async callback to search mentionable items. Mention extension only loads when provided. */
  onMentionSearch?: (query: string) => Promise<MentionItem[]>
  customComponents?: CustomComponentRegistration[]
}

// --- Editor Emits ---
export type MeldEditorEmits = {
  'update:modelValue': [html: string]
  'update:json': [json: Record<string, unknown>]
  'created': [editor: Editor]
  'focus': [event: FocusEvent]
  'blur': [event: FocusEvent]
}

// --- Editor Exposed ---
export interface MeldEditorExposed {
  editor: Editor | undefined
  getHTML: () => string
  getJSON: () => Record<string, unknown>
  setContent: (content: string) => void
  focus: () => void
  blur: () => void
}
