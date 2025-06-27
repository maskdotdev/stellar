"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface SimpleSettingsState {
  // Layout Settings
  libraryViewMode: "grid" | "list"
  sidebarCollapsed: boolean
  contextBarVisible: boolean
  
  // Display Settings
  reduceMotion: boolean
  highContrast: boolean
  compactMode: boolean
  
  // App Settings
  autoSave: boolean
  confirmDeletion: boolean
  preserveSearchHistory: boolean
  
  // Search Settings
  searchHistory: string[]
  caseSensitiveSearch: boolean
  
  // Actions
  setLibraryViewMode: (mode: "grid" | "list") => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setContextBarVisible: (visible: boolean) => void
  setReduceMotion: (reduce: boolean) => void
  setHighContrast: (contrast: boolean) => void
  setCompactMode: (compact: boolean) => void
  setAutoSave: (enabled: boolean) => void
  setConfirmDeletion: (confirm: boolean) => void
  setPreserveSearchHistory: (preserve: boolean) => void
  addSearchHistory: (query: string) => void
  clearSearchHistory: () => void
  setCaseSensitiveSearch: (sensitive: boolean) => void
}

export const useSimpleSettingsStore = create<SimpleSettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      libraryViewMode: "list",
      sidebarCollapsed: false,
      contextBarVisible: true,
      reduceMotion: false,
      highContrast: false,
      compactMode: false,
      autoSave: true,
      confirmDeletion: true,
      preserveSearchHistory: true,
      searchHistory: [],
      caseSensitiveSearch: false,
      
      // Actions
      setLibraryViewMode: (mode) => set({ libraryViewMode: mode }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setContextBarVisible: (visible) => set({ contextBarVisible: visible }),
      setReduceMotion: (reduce) => set({ reduceMotion: reduce }),
      setHighContrast: (contrast) => set({ highContrast: contrast }),
      setCompactMode: (compact) => set({ compactMode: compact }),
      setAutoSave: (enabled) => set({ autoSave: enabled }),
      setConfirmDeletion: (confirm) => set({ confirmDeletion: confirm }),
      setPreserveSearchHistory: (preserve) => set({ preserveSearchHistory: preserve }),
      addSearchHistory: (query) => {
        const state = get()
        if (!state.preserveSearchHistory) return
        const history = state.searchHistory.filter(h => h !== query)
        set({ searchHistory: [query, ...history].slice(0, 20) })
      },
      clearSearchHistory: () => set({ searchHistory: [] }),
      setCaseSensitiveSearch: (sensitive) => set({ caseSensitiveSearch: sensitive }),
    }),
    {
      name: "stellar-simple-settings",
      version: 1,
    }
  )
) 