import { Extension } from '@tiptap/core'
import { Suggestion } from '@tiptap/suggestion'
import type { SuggestionOptions } from '@tiptap/suggestion'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import { createApp, reactive, h, type App } from 'vue'
import SlashCommandList from './SlashCommandList.vue'
import { slashCommandItems, type SlashCommandItem } from './slash-command-items'

export const SlashCommandExtension = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        items: ({ query }: { query: string }) => {
          return slashCommandItems.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase()),
          )
        },
        render: () => {
          let popup: TippyInstance | undefined
          let app: App | undefined
          let container: HTMLElement | undefined

          const state = reactive({
            items: [] as SlashCommandItem[],
            command: (() => {}) as (item: SlashCommandItem) => void,
          })

          // keep a ref to the component instance for onKeyDown
          let componentInstance: { onKeyDown: (e: KeyboardEvent) => boolean } | null = null

          return {
            onStart: (props: {
              items: SlashCommandItem[]
              command: (item: SlashCommandItem) => void
              clientRect?: (() => DOMRect | null) | null
              editor: { view: { dom: HTMLElement } }
            }) => {
              state.items = props.items
              state.command = props.command

              container = document.createElement('div')
              app = createApp({
                setup() {
                  return () =>
                    h(SlashCommandList, {
                      items: state.items,
                      command: state.command,
                      ref: (el: unknown) => {
                        componentInstance = el as typeof componentInstance
                      },
                    })
                },
              })
              app.mount(container)

              const editorWrap =
                props.editor.view.dom.closest('.notion-editor-wrap') ??
                document.body
              popup = tippy(props.editor.view.dom, {
                getReferenceClientRect: props.clientRect as (() => DOMRect),
                content: container,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                appendTo: () => editorWrap,
              })
            },

            onUpdate: (props: {
              items: SlashCommandItem[]
              command: (item: SlashCommandItem) => void
              clientRect?: (() => DOMRect | null) | null
            }) => {
              state.items = props.items
              state.command = props.command

              if (popup) {
                popup.setProps({
                  getReferenceClientRect: props.clientRect as (() => DOMRect),
                })
              }
            },

            onKeyDown: (props: { event: KeyboardEvent }) => {
              if (props.event.key === 'Escape') {
                popup?.hide()
                return true
              }
              return componentInstance?.onKeyDown(props.event) ?? false
            },

            onExit: () => {
              popup?.destroy()
              app?.unmount()
              popup = undefined
              app = undefined
              container = undefined
              componentInstance = null
            },
          }
        },
        command: ({
          editor,
          range,
          props,
        }: {
          editor: { chain: () => unknown }
          range: { from: number; to: number }
          props: SlashCommandItem
        }) => {
          const chain = editor.chain() as {
            focus: () => { deleteRange: (range: { from: number; to: number }) => { run: () => void } }
          }
          chain.focus().deleteRange(range).run()
          props.command(editor as Parameters<SlashCommandItem['command']>[0])
        },
      } satisfies Partial<SuggestionOptions<SlashCommandItem>>,
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})
