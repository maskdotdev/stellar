"use client"

import { create } from "zustand"

interface StudyState {
  currentView: "focus" | "library" | "graph" | "workspace" | "history" | "settings"
  focusMode: boolean
  showCommandPalette: boolean
  showInteractionDrawer: boolean
  currentDocument: string | null
  currentTags: string[]

  setCurrentView: (view: StudyState["currentView"]) => void
  setFocusMode: (enabled: boolean) => void
  setShowCommandPalette: (show: boolean) => void
  setShowInteractionDrawer: (show: boolean) => void
  setCurrentDocument: (doc: string | null) => void
  setCurrentTags: (tags: string[]) => void
}

export const useStudyStore = create<StudyState>((set) => ({
  currentView: "focus",
  focusMode: false,
  showCommandPalette: false,
  showInteractionDrawer: false,
  currentDocument: null,
  currentTags: ["transformer", "attention", "nlp"],

  setCurrentView: (view) => set({ currentView: view }),
  setFocusMode: (enabled) => set({ focusMode: enabled }),
  setShowCommandPalette: (show) => set({ showCommandPalette: show }),
  setShowInteractionDrawer: (show) => set({ showInteractionDrawer: show }),
  setCurrentDocument: (doc) => set({ currentDocument: doc }),
  setCurrentTags: (tags) => set({ currentTags: tags }),
}))
