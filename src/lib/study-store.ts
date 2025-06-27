"use client"

import { create } from "zustand"
import type { Document } from "./library-service"

interface StudyState {
  currentView: "focus" | "library" | "graph" | "workspace" | "history" | "settings"
  focusMode: boolean
  showCommandPalette: boolean
  showInteractionDrawer: boolean
  showFloatingChat: boolean
  currentDocument: string | null
  currentTags: string[]
  documents: Document[]
  isLoadingDocuments: boolean

  setCurrentView: (view: StudyState["currentView"]) => void
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
}

export const useStudyStore = create<StudyState>((set) => ({
  currentView: "focus",
  focusMode: false,
  showCommandPalette: false,
  showInteractionDrawer: false,
  showFloatingChat: false,
  currentDocument: null,
  currentTags: ["transformer", "attention", "nlp"],
  documents: [],
  isLoadingDocuments: false,

  setCurrentView: (view) => set({ currentView: view }),
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
}))
