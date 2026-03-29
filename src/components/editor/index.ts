export { default as MeldEditor } from './MeldEditor.vue'
export { createDefaultToolbarItems, resolveSlashCommands } from './defaults'
export { defaultSlashCommands } from './slash-commands/defaultSlashCommands'
export { useThemeMode } from '@/composables/useThemeMode'
export type {
  SlashCommandItem,
  ToolbarItem,
  MeldEditorProps,
  MeldEditorEmits,
  MeldEditorExposed,
  DefaultExtensionOptions,
  CustomComponentRegistration,
  MentionItem,
} from './types'
