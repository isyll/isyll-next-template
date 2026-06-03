import { create } from 'zustand'

interface UiState {
  commandMenuOpen: boolean
  setCommandMenuOpen: (open: boolean) => void
  toggleCommandMenu: () => void
}

/**
 * Example client-only store. Zustand is wired and ready: add slices here or in
 * sibling files under `lib/stores`. Reserve it for ephemeral UI state — keep
 * server data in TanStack Query / Server Components, and URL state in nuqs.
 */
export const useUiStore = create<UiState>((set) => ({
  commandMenuOpen: false,
  setCommandMenuOpen: (open) => {
    set({ commandMenuOpen: open })
  },
  toggleCommandMenu: () => {
    set((state) => ({ commandMenuOpen: !state.commandMenuOpen }))
  },
}))
