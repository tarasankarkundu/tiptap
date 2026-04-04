export { default as MeldEditor } from './MeldEditor.vue'
export { createCustomNodeExtension } from './custom-components/CustomNodeExtension'
export { ChartNode } from './chart/ChartNodeExtension'
export { createDefaultToolbarItems, resolveSlashCommands } from './defaults'
export { defaultSlashCommands } from './slash-commands/defaultSlashCommands'
export type {
  SlashCommandItem,
  ToolbarItem,
  MeldEditorProps,
  MeldEditorEmits,
  MeldEditorExposed,
  DefaultExtensionOptions,
  CustomComponentRegistration,
  DeleteDialogItem,
  MentionItem,
} from './types'
