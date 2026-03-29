import { Mention, type MentionNodeAttrs } from '@tiptap/extension-mention'
import type { Editor } from '@tiptap/core'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import { createApp, reactive, h, type App } from 'vue'
import MentionList from './MentionList.vue'
import type { MentionItem } from '../types'

export function createMentionExtension(
  onSearch: (query: string) => Promise<MentionItem[]>,
) {
  return Mention.configure({
    HTMLAttributes: {
      class: 'mention',
    },
    suggestion: {
      items: ({ query }: { query: string }) => {
        return [] as MentionItem[]
      },
      render: () => {
        let popup: TippyInstance | undefined
        let app: App | undefined
        let container: HTMLElement | undefined

        const state = reactive({
          items: [] as MentionItem[],
          loading: false,
          command: (() => {}) as (item: MentionItem) => void,
        })

        let componentInstance: { onKeyDown: (e: KeyboardEvent) => boolean } | null = null
        let searchAbort: AbortController | null = null

        async function fetchItems(query: string) {
          searchAbort?.abort()
          searchAbort = new AbortController()
          state.loading = true
          state.items = []
          try {
            const results = await onSearch(query)
            if (!searchAbort.signal.aborted) {
              state.items = results
            }
          } catch {
            // Ignore aborted requests
          } finally {
            if (!searchAbort.signal.aborted) {
              state.loading = false
            }
          }
        }

        return {
          onStart: (props: {
            items: MentionItem[]
            command: (item: MentionItem) => void
            clientRect?: (() => DOMRect | null) | null
            editor: { view: { dom: HTMLElement } }
            query: string
          }) => {
            state.command = props.command
            fetchItems(props.query)

            container = document.createElement('div')
            app = createApp({
              setup() {
                return () =>
                  h(MentionList, {
                    items: state.items,
                    loading: state.loading,
                    command: state.command,
                    ref: (el: unknown) => {
                      componentInstance = el as typeof componentInstance
                    },
                  })
              },
            })
            app.mount(container)

            const editorWrap =
              props.editor.view.dom.closest('[data-meld-editor]') ??
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
            items: MentionItem[]
            command: (item: MentionItem) => void
            clientRect?: (() => DOMRect | null) | null
            query: string
          }) => {
            state.command = props.command
            fetchItems(props.query)

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
            searchAbort?.abort()
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
        editor: Editor
        range: { from: number; to: number }
        props: MentionNodeAttrs
      }) => {
        editor.chain()
          .focus()
          .deleteRange(range)
          .insertContent([
            { type: 'mention', attrs: { id: props.id ?? '', label: props.label } },
            { type: 'text', text: ' ' },
          ])
          .run()
      },
    },
  })
}
