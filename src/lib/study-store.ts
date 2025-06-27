"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Document } from "./library-service"

export interface Keybinding {
  id: string
  action: string
  category: string
  defaultKeys: string
  currentKeys: string
  description: string
}

const defaultKeybindings: Keybinding[] = [
  // Navigation
  { id: "library", action: "Open Library", category: "Navigation", defaultKeys: "⌘1", currentKeys: "⌘1", description: "Navigate to library view" },
  { id: "graph", action: "Open Graph View", category: "Navigation", defaultKeys: "⌘2", currentKeys: "⌘2", description: "Navigate to graph view" },
  { id: "workspace", action: "Open Workspace", category: "Navigation", defaultKeys: "⌘3", currentKeys: "⌘3", description: "Navigate to workspace view" },
  { id: "history", action: "Open History", category: "Navigation", defaultKeys: "⌘4", currentKeys: "⌘4", description: "Navigate to history view" },
  
  // Quick Actions
  { id: "import", action: "Import PDF", category: "Quick Actions", defaultKeys: "⌘I", currentKeys: "⌘I", description: "Import a PDF document" },
  { id: "new-note", action: "New Note", category: "Quick Actions", defaultKeys: "⌘N", currentKeys: "⌘N", description: "Create a new note" },
  { id: "focus", action: "Focus Mode", category: "Quick Actions", defaultKeys: "⌘.", currentKeys: "⌘.", description: "Enter focus mode" },
  { id: "chat", action: "Ask AI", category: "Quick Actions", defaultKeys: "⇧Space", currentKeys: "⇧Space", description: "Open AI chat" },
  { id: "flashcards", action: "Create Flashcards", category: "Quick Actions", defaultKeys: "⌘F", currentKeys: "⌘F", description: "Create flashcards from content" },
  
  // Settings
  { id: "settings-providers", action: "AI Providers Settings", category: "Settings", defaultKeys: "⌘,P", currentKeys: "⌘,P", description: "Configure AI providers" },
  { id: "settings-models", action: "Models Settings", category: "Settings", defaultKeys: "⌘,M", currentKeys: "⌘,M", description: "Configure AI models" },
  { id: "settings-chat", action: "Chat Settings", category: "Settings", defaultKeys: "⌘,C", currentKeys: "⌘,C", description: "Configure chat settings" },
  { id: "settings-appearance", action: "Appearance Settings", category: "Settings", defaultKeys: "⌘,A", currentKeys: "⌘,A", description: "Configure appearance" },
  { id: "settings-keybindings", action: "Keybindings Settings", category: "Settings", defaultKeys: "⌘,K", currentKeys: "⌘,K", description: "Configure keybindings" },
  
  // System
  { id: "command-palette", action: "Command Palette", category: "System", defaultKeys: "⌘K", currentKeys: "⌘K", description: "Open command palette" },
  { id: "escape", action: "Close/Cancel", category: "System", defaultKeys: "Escape", currentKeys: "Escape", description: "Close dialogs or cancel actions" },
]

interface StudyState {
  currentView: "focus" | "library" | "graph" | "workspace" | "history" | "settings" | "note-editor"
  focusMode: boolean
  showCommandPalette: boolean
  showInteractionDrawer: boolean
  showFloatingChat: boolean
  currentDocument: string | null
  editingNoteId: string | null
  currentTags: string[]
  documents: Document[]
  isLoadingDocuments: boolean
  settingsTab: "providers" | "models" | "chat" | "appearance" | "keybindings"
  keybindings: Keybinding[]

  setCurrentView: (view: StudyState["currentView"]) => void
  setEditingNoteId: (noteId: string | null) => void
  setFocusMode: (enabled: boolean) => void
  setShowCommandPalette: (show: boolean) => void
  setShowInteractionDrawer: (show: boolean) => void
  setShowFloatingChat: (show: boolean) => void
  setCurrentDocument: (doc: string | null) => void
  setCurrentTags: (tags: string[]) => void
  setDocuments: (documents: Document[]) => void
  setIsLoadingDocuments: (loading: boolean) => void
  addDocument: (document: Document) => void
  updateDocument: (id: string, updatedDocument: Document) => void
  removeDocument: (id: string) => void
  setSettingsTab: (tab: StudyState["settingsTab"]) => void
  updateKeybinding: (id: string, newKeys: string) => void
  resetKeybinding: (id: string) => void
  resetAllKeybindings: () => void
}

export const useStudyStore = create<StudyState>()(
  persist(
    (set) => ({
      currentView: "focus",
      focusMode: false,
      showCommandPalette: false,
      showInteractionDrawer: false,
      showFloatingChat: false,
      currentDocument: null,
      editingNoteId: null,
      currentTags: ["transformer", "attention", "nlp"],
      documents: [],
      isLoadingDocuments: false,
      settingsTab: "providers",
      keybindings: defaultKeybindings,

      setCurrentView: (view) => set({ currentView: view }),
      setEditingNoteId: (noteId) => set({ editingNoteId: noteId }),
      setFocusMode: (enabled) => set({ focusMode: enabled }),
      setShowCommandPalette: (show) => set({ showCommandPalette: show }),
      setShowInteractionDrawer: (show) => set({ showInteractionDrawer: show }),
      setShowFloatingChat: (show) => set({ showFloatingChat: show }),
      setCurrentDocument: (doc) => set({ currentDocument: doc }),
      setCurrentTags: (tags) => set({ currentTags: tags }),
      setDocuments: (documents) => set({ documents }),
      setIsLoadingDocuments: (loading) => set({ isLoadingDocuments: loading }),
      addDocument: (document) => set((state) => ({ documents: [document, ...state.documents] })),
      updateDocument: (id, updatedDocument) => set((state) => ({
        documents: state.documents.map(doc => doc.id === id ? updatedDocument : doc)
      })),
      removeDocument: (id) => set((state) => ({
        documents: state.documents.filter(doc => doc.id !== id)
      })),
      setSettingsTab: (tab) => set({ settingsTab: tab }),
      updateKeybinding: (id, newKeys) => set((state) => ({
        keybindings: state.keybindings.map(kb => 
          kb.id === id ? { ...kb, currentKeys: newKeys } : kb
        )
      })),
      resetKeybinding: (id) => set((state) => ({
        keybindings: state.keybindings.map(kb => 
          kb.id === id ? { ...kb, currentKeys: kb.defaultKeys } : kb
        )
      })),
      resetAllKeybindings: () => set((state) => ({
        keybindings: state.keybindings.map(kb => ({ ...kb, currentKeys: kb.defaultKeys }))
      })),
    }),
    {
      name: "stellar-study-store",
      partialize: (state) => ({
        settingsTab: state.settingsTab,
        keybindings: state.keybindings,
        currentTags: state.currentTags,
      }),
    }
  )
)
