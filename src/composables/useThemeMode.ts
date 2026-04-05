import { ref, type Ref } from 'vue'

export type ThemeMode = 'auto' | 'light' | 'dark'

const STORAGE_KEY = 'meld-editor-theme'

const mode = ref<ThemeMode>(
  (localStorage.getItem(STORAGE_KEY) as ThemeMode) ?? 'auto',
)

let mediaQuery: MediaQueryList | null = null
let mediaListener: ((e: MediaQueryListEvent) => void) | null = null

function updateDarkClass(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark)
}

function applyTheme(theme: ThemeMode) {
  // Clean up previous auto listener
  if (mediaQuery && mediaListener) {
    mediaQuery.removeEventListener('change', mediaListener)
    mediaListener = null
  }

  mode.value = theme
  localStorage.setItem(STORAGE_KEY, theme)

  if (theme === 'light') {
    updateDarkClass(false)
  } else if (theme === 'dark') {
    updateDarkClass(true)
  } else {
    // auto — follow system preference
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    updateDarkClass(mediaQuery.matches)
    mediaListener = (e) => updateDarkClass(e.matches)
    mediaQuery.addEventListener('change', mediaListener)
  }
}

function removeTheme() {
  if (mediaQuery && mediaListener) {
    mediaQuery.removeEventListener('change', mediaListener)
    mediaListener = null
  }
  document.documentElement.classList.remove('dark')
}

export function useThemeMode(): {
  mode: Ref<ThemeMode>
  applyTheme: (theme: ThemeMode) => void
  removeTheme: () => void
} {
  return { mode, applyTheme, removeTheme }
}
