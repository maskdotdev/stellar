"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

// UI Layout Settings
interface LayoutSettings {
  libraryViewMode: "grid" | "list"
  sidebarCollapsed: boolean
  sidebarWidth: number
  contextBarVisible: boolean
  floatingChatPosition: { x: number; y: number }
  commandPaletteRecentItems: string[]
}

// Display & Accessibility Settings
interface DisplaySettings {
  reduceMotion: boolean
  highContrast: boolean
  fontSize: "small" | "medium" | "large"
  compactMode: boolean
  showLineNumbers: boolean
  wordWrap: boolean
}

// Application Behavior Settings
interface AppSettings {
  autoSave: boolean
  autoSaveInterval: number // in seconds
  defaultDocumentView: "focus" | "note-editor"
  confirmDeletion: boolean
  preserveSearchHistory: boolean
  maxRecentDocuments: number
  enableNotifications: boolean
  enableAnalytics: boolean
  documentMentionLimit: number // Number of documents to show in @ dropdown
}

// Search & Filter Settings
interface SearchSettings {
  defaultSearchScope: "all" | "title" | "content" | "tags"
  caseSensitiveSearch: boolean
  searchHistory: string[]
  maxSearchHistory: number
  defaultSortBy: "updated" | "created" | "title" | "type"
  defaultSortOrder: "asc" | "desc"
  defaultFilter: {
    docTypes: string[]
    tags: string[]
    status: string[]
  }
}

// Editor Settings
interface EditorSettings {
  defaultEditorMode: "minimal" | "full"
  showMarkdownPreview: boolean
  enableSpellCheck: boolean
  enableAutocomplete: boolean
  indentSize: number
  tabSize: number
  insertSpaces: boolean
  defaultNoteTemplate: string
}

// Export/Import Settings
interface DataSettings {
  exportFormat: "markdown" | "pdf" | "html"
  includeMetadata: boolean
  backupLocation: string
  autoBackup: boolean
  backupInterval: number // in hours
  backupRetention: number // in days
}

// Combined Settings Interface
interface SettingsState {
  // Settings categories
  layout: LayoutSettings
  display: DisplaySettings
  app: AppSettings
  search: SearchSettings
  editor: EditorSettings
  data: DataSettings
  
  // Metadata
  version: string
  lastUpdated: string
  
  // Actions for Layout Settings
  setLibraryViewMode: (mode: "grid" | "list") => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarWidth: (width: number) => void
  setContextBarVisible: (visible: boolean) => void
  setFloatingChatPosition: (position: { x: number; y: number }) => void
  addCommandPaletteRecentItem: (item: string) => void
  
  // Actions for Display Settings
  setReduceMotion: (reduce: boolean) => void
  setHighContrast: (contrast: boolean) => void
  setFontSize: (size: "small" | "medium" | "large") => void
  setCompactMode: (compact: boolean) => void
  setShowLineNumbers: (show: boolean) => void
  setWordWrap: (wrap: boolean) => void
  
  // Actions for App Settings
  setAutoSave: (enabled: boolean) => void
  setAutoSaveInterval: (interval: number) => void
  setDefaultDocumentView: (view: "focus" | "note-editor") => void
  setConfirmDeletion: (confirm: boolean) => void
  setPreserveSearchHistory: (preserve: boolean) => void
  setMaxRecentDocuments: (max: number) => void
  setEnableNotifications: (enabled: boolean) => void
  setEnableAnalytics: (enabled: boolean) => void
  setDocumentMentionLimit: (limit: number) => void
  
  // Actions for Search Settings
  setDefaultSearchScope: (scope: "all" | "title" | "content" | "tags") => void
  setCaseSensitiveSearch: (sensitive: boolean) => void
  addSearchHistory: (query: string) => void
  clearSearchHistory: () => void
  setDefaultSortBy: (sortBy: "updated" | "created" | "title" | "type") => void
  setDefaultSortOrder: (order: "asc" | "desc") => void
  setDefaultFilter: (filter: Partial<SearchSettings["defaultFilter"]>) => void
  
  // Actions for Editor Settings
  setDefaultEditorMode: (mode: "minimal" | "full") => void
  setShowMarkdownPreview: (show: boolean) => void
  setEnableSpellCheck: (enabled: boolean) => void
  setEnableAutocomplete: (enabled: boolean) => void
  setIndentSize: (size: number) => void
  setTabSize: (size: number) => void
  setInsertSpaces: (spaces: boolean) => void
  setDefaultNoteTemplate: (template: string) => void
  
  // Actions for Data Settings
  setExportFormat: (format: "markdown" | "pdf" | "html") => void
  setIncludeMetadata: (include: boolean) => void
  setBackupLocation: (location: string) => void
  setAutoBackup: (enabled: boolean) => void
  setBackupInterval: (interval: number) => void
  setBackupRetention: (retention: number) => void
  
  // Utility actions
  resetToDefaults: () => void
  exportSettings: () => string
  importSettings: (settings: string) => boolean
  updateSetting: (path: string, value: any) => void
}

// Default settings
const defaultSettings = {
  layout: {
    libraryViewMode: "list" as const,
    sidebarCollapsed: false,
    sidebarWidth: 256,
    contextBarVisible: true,
    floatingChatPosition: { x: 400, y: 100 },
    commandPaletteRecentItems: [],
  },
  display: {
    reduceMotion: false,
    highContrast: false,
    fontSize: "medium" as const,
    compactMode: false,
    showLineNumbers: false,
    wordWrap: true,
  },
  app: {
    autoSave: true,
    autoSaveInterval: 30,
    defaultDocumentView: "focus" as const,
    confirmDeletion: true,
    preserveSearchHistory: true,
    maxRecentDocuments: 10,
    enableNotifications: true,
    enableAnalytics: false,
    documentMentionLimit: 10,
  },
  search: {
    defaultSearchScope: "all" as const,
    caseSensitiveSearch: false,
    searchHistory: [],
    maxSearchHistory: 20,
    defaultSortBy: "updated" as const,
    defaultSortOrder: "desc" as const,
    defaultFilter: {
      docTypes: [],
      tags: [],
      status: [],
    },
  },
  editor: {
    defaultEditorMode: "full" as const,
    showMarkdownPreview: false,
    enableSpellCheck: true,
    enableAutocomplete: true,
    indentSize: 2,
    tabSize: 2,
    insertSpaces: true,
    defaultNoteTemplate: "",
  },
  data: {
    exportFormat: "markdown" as const,
    includeMetadata: true,
    backupLocation: "",
    autoBackup: false,
    backupInterval: 24,
    backupRetention: 30,
  },
  version: "1.0.0",
  lastUpdated: new Date().toISOString(),
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...defaultSettings,
      
      // Layout Actions
      setLibraryViewMode: (mode) => 
        set((state) => ({ 
          layout: { ...state.layout, libraryViewMode: mode },
          lastUpdated: new Date().toISOString()
        })),
        
      setSidebarCollapsed: (collapsed) => 
        set((state) => ({ 
          layout: { ...state.layout, sidebarCollapsed: collapsed },
          lastUpdated: new Date().toISOString()
        })),
        
      setSidebarWidth: (width) => 
        set((state) => ({ 
          layout: { ...state.layout, sidebarWidth: width },
          lastUpdated: new Date().toISOString()
        })),
        
      setContextBarVisible: (visible) => 
        set((state) => ({ 
          layout: { ...state.layout, contextBarVisible: visible },
          lastUpdated: new Date().toISOString()
        })),
        
      setFloatingChatPosition: (position) => 
        set((state) => ({ 
          layout: { ...state.layout, floatingChatPosition: position },
          lastUpdated: new Date().toISOString()
        })),
        
      addCommandPaletteRecentItem: (item) => 
        set((state) => {
          const items = state.layout.commandPaletteRecentItems.filter(i => i !== item)
          return {
            layout: { 
              ...state.layout, 
              commandPaletteRecentItems: [item, ...items].slice(0, 10)
            },
            lastUpdated: new Date().toISOString()
          }
        }),
      
      // Display Actions
      setReduceMotion: (reduce) => 
        set((state) => ({ 
          display: { ...state.display, reduceMotion: reduce },
          lastUpdated: new Date().toISOString()
        })),
        
      setHighContrast: (contrast) => 
        set((state) => ({ 
          display: { ...state.display, highContrast: contrast },
          lastUpdated: new Date().toISOString()
        })),
        
      setFontSize: (size) => 
        set((state) => ({ 
          display: { ...state.display, fontSize: size },
          lastUpdated: new Date().toISOString()
        })),
        
      setCompactMode: (compact) => 
        set((state) => ({ 
          display: { ...state.display, compactMode: compact },
          lastUpdated: new Date().toISOString()
        })),
        
      setShowLineNumbers: (show) => 
        set((state) => ({ 
          display: { ...state.display, showLineNumbers: show },
          lastUpdated: new Date().toISOString()
        })),
        
      setWordWrap: (wrap) => 
        set((state) => ({ 
          display: { ...state.display, wordWrap: wrap },
          lastUpdated: new Date().toISOString()
        })),
      
      // App Actions
      setAutoSave: (enabled) => 
        set((state) => ({ 
          app: { ...state.app, autoSave: enabled },
          lastUpdated: new Date().toISOString()
        })),
        
      setAutoSaveInterval: (interval) => 
        set((state) => ({ 
          app: { ...state.app, autoSaveInterval: interval },
          lastUpdated: new Date().toISOString()
        })),
        
      setDefaultDocumentView: (view) => 
        set((state) => ({ 
          app: { ...state.app, defaultDocumentView: view },
          lastUpdated: new Date().toISOString()
        })),
        
      setConfirmDeletion: (confirm) => 
        set((state) => ({ 
          app: { ...state.app, confirmDeletion: confirm },
          lastUpdated: new Date().toISOString()
        })),
        
      setPreserveSearchHistory: (preserve) => 
        set((state) => ({ 
          app: { ...state.app, preserveSearchHistory: preserve },
          lastUpdated: new Date().toISOString()
        })),
        
      setMaxRecentDocuments: (max) => 
        set((state) => ({ 
          app: { ...state.app, maxRecentDocuments: max },
          lastUpdated: new Date().toISOString()
        })),
        
      setEnableNotifications: (enabled) => 
        set((state) => ({ 
          app: { ...state.app, enableNotifications: enabled },
          lastUpdated: new Date().toISOString()
        })),
        
      setEnableAnalytics: (enabled) => 
        set((state) => ({ 
          app: { ...state.app, enableAnalytics: enabled },
          lastUpdated: new Date().toISOString()
        })),
        
      setDocumentMentionLimit: (limit) => 
        set((state) => ({ 
          app: { ...state.app, documentMentionLimit: limit },
          lastUpdated: new Date().toISOString()
        })),
      
      // Search Actions
      setDefaultSearchScope: (scope) => 
        set((state) => ({ 
          search: { ...state.search, defaultSearchScope: scope },
          lastUpdated: new Date().toISOString()
        })),
        
      setCaseSensitiveSearch: (sensitive) => 
        set((state) => ({ 
          search: { ...state.search, caseSensitiveSearch: sensitive },
          lastUpdated: new Date().toISOString()
        })),
        
      addSearchHistory: (query) => 
        set((state) => {
          if (!state.app.preserveSearchHistory) return state
          const history = state.search.searchHistory.filter(h => h !== query)
          return {
            search: { 
              ...state.search, 
              searchHistory: [query, ...history].slice(0, state.search.maxSearchHistory)
            },
            lastUpdated: new Date().toISOString()
          }
        }),
        
      clearSearchHistory: () => 
        set((state) => ({ 
          search: { ...state.search, searchHistory: [] },
          lastUpdated: new Date().toISOString()
        })),
        
      setDefaultSortBy: (sortBy) => 
        set((state) => ({ 
          search: { ...state.search, defaultSortBy: sortBy },
          lastUpdated: new Date().toISOString()
        })),
        
      setDefaultSortOrder: (order) => 
        set((state) => ({ 
          search: { ...state.search, defaultSortOrder: order },
          lastUpdated: new Date().toISOString()
        })),
        
      setDefaultFilter: (filter) => 
        set((state) => ({ 
          search: { 
            ...state.search, 
            defaultFilter: { ...state.search.defaultFilter, ...filter }
          },
          lastUpdated: new Date().toISOString()
        })),
      
      // Editor Actions
      setDefaultEditorMode: (mode) => 
        set((state) => ({ 
          editor: { ...state.editor, defaultEditorMode: mode },
          lastUpdated: new Date().toISOString()
        })),
        
      setShowMarkdownPreview: (show) => 
        set((state) => ({ 
          editor: { ...state.editor, showMarkdownPreview: show },
          lastUpdated: new Date().toISOString()
        })),
        
      setEnableSpellCheck: (enabled) => 
        set((state) => ({ 
          editor: { ...state.editor, enableSpellCheck: enabled },
          lastUpdated: new Date().toISOString()
        })),
        
      setEnableAutocomplete: (enabled) => 
        set((state) => ({ 
          editor: { ...state.editor, enableAutocomplete: enabled },
          lastUpdated: new Date().toISOString()
        })),
        
      setIndentSize: (size) => 
        set((state) => ({ 
          editor: { ...state.editor, indentSize: size },
          lastUpdated: new Date().toISOString()
        })),
        
      setTabSize: (size) => 
        set((state) => ({ 
          editor: { ...state.editor, tabSize: size },
          lastUpdated: new Date().toISOString()
        })),
        
      setInsertSpaces: (spaces) => 
        set((state) => ({ 
          editor: { ...state.editor, insertSpaces: spaces },
          lastUpdated: new Date().toISOString()
        })),
        
      setDefaultNoteTemplate: (template) => 
        set((state) => ({ 
          editor: { ...state.editor, defaultNoteTemplate: template },
          lastUpdated: new Date().toISOString()
        })),
      
      // Data Actions
      setExportFormat: (format) => 
        set((state) => ({ 
          data: { ...state.data, exportFormat: format },
          lastUpdated: new Date().toISOString()
        })),
        
      setIncludeMetadata: (include) => 
        set((state) => ({ 
          data: { ...state.data, includeMetadata: include },
          lastUpdated: new Date().toISOString()
        })),
        
      setBackupLocation: (location) => 
        set((state) => ({ 
          data: { ...state.data, backupLocation: location },
          lastUpdated: new Date().toISOString()
        })),
        
      setAutoBackup: (enabled) => 
        set((state) => ({ 
          data: { ...state.data, autoBackup: enabled },
          lastUpdated: new Date().toISOString()
        })),
        
      setBackupInterval: (interval) => 
        set((state) => ({ 
          data: { ...state.data, backupInterval: interval },
          lastUpdated: new Date().toISOString()
        })),
        
      setBackupRetention: (retention) => 
        set((state) => ({ 
          data: { ...state.data, backupRetention: retention },
          lastUpdated: new Date().toISOString()
        })),
      
      // Utility Actions
      resetToDefaults: () => set(defaultSettings),
      
      exportSettings: () => {
        const state = get()
        return JSON.stringify({
          layout: state.layout,
          display: state.display,
          app: state.app,
          search: state.search,
          editor: state.editor,
          data: state.data,
          version: state.version,
          exportedAt: new Date().toISOString()
        }, null, 2)
      },
      
      importSettings: (settingsJson) => {
        try {
          const imported = JSON.parse(settingsJson)
          if (!imported.version) {
            console.error('Invalid settings format')
            return false
          }
          
          set({
            layout: { ...defaultSettings.layout, ...imported.layout },
            display: { ...defaultSettings.display, ...imported.display },
            app: { ...defaultSettings.app, ...imported.app },
            search: { ...defaultSettings.search, ...imported.search },
            editor: { ...defaultSettings.editor, ...imported.editor },
            data: { ...defaultSettings.data, ...imported.data },
            version: imported.version,
            lastUpdated: new Date().toISOString()
          })
          
          return true
        } catch (error) {
          console.error('Failed to import settings:', error)
          return false
        }
      },
      
      updateSetting: (path, value) => {
        const pathParts = path.split('.')
        if (pathParts.length !== 2) return
        
        const [category, setting] = pathParts
        set((state) => ({
          [category]: {
            ...(state as any)[category],
            [setting]: value
          },
          lastUpdated: new Date().toISOString()
        }))
      }
    }),
    {
      name: "stellar-settings",
      version: 1,
      // Persist all settings
      partialize: (state) => ({
        layout: state.layout,
        display: state.display,
        app: state.app,
        search: state.search,
        editor: state.editor,
        data: state.data,
        version: state.version,
        lastUpdated: state.lastUpdated
      })
    }
  )
)

// Hook for specific setting categories
export const useLayoutSettings = () => useSettingsStore((state) => ({
  settings: state.layout,
  setLibraryViewMode: state.setLibraryViewMode,
  setSidebarCollapsed: state.setSidebarCollapsed,
  setSidebarWidth: state.setSidebarWidth,
  setContextBarVisible: state.setContextBarVisible,
  setFloatingChatPosition: state.setFloatingChatPosition,
  addCommandPaletteRecentItem: state.addCommandPaletteRecentItem,
}))

export const useDisplaySettings = () => useSettingsStore((state) => ({
  settings: state.display,
  setReduceMotion: state.setReduceMotion,
  setHighContrast: state.setHighContrast,
  setFontSize: state.setFontSize,
  setCompactMode: state.setCompactMode,
  setShowLineNumbers: state.setShowLineNumbers,
  setWordWrap: state.setWordWrap,
}))

export const useAppSettings = () => useSettingsStore((state) => ({
  settings: state.app,
  setAutoSave: state.setAutoSave,
  setAutoSaveInterval: state.setAutoSaveInterval,
  setDefaultDocumentView: state.setDefaultDocumentView,
  setConfirmDeletion: state.setConfirmDeletion,
  setPreserveSearchHistory: state.setPreserveSearchHistory,
  setMaxRecentDocuments: state.setMaxRecentDocuments,
  setEnableNotifications: state.setEnableNotifications,
  setEnableAnalytics: state.setEnableAnalytics,
  setDocumentMentionLimit: state.setDocumentMentionLimit,
}))

export const useSearchSettings = () => useSettingsStore((state) => ({
  settings: state.search,
  setDefaultSearchScope: state.setDefaultSearchScope,
  setCaseSensitiveSearch: state.setCaseSensitiveSearch,
  addSearchHistory: state.addSearchHistory,
  clearSearchHistory: state.clearSearchHistory,
  setDefaultSortBy: state.setDefaultSortBy,
  setDefaultSortOrder: state.setDefaultSortOrder,
  setDefaultFilter: state.setDefaultFilter,
}))

export const useEditorSettings = () => useSettingsStore((state) => ({
  settings: state.editor,
  setDefaultEditorMode: state.setDefaultEditorMode,
  setShowMarkdownPreview: state.setShowMarkdownPreview,
  setEnableSpellCheck: state.setEnableSpellCheck,
  setEnableAutocomplete: state.setEnableAutocomplete,
  setIndentSize: state.setIndentSize,
  setTabSize: state.setTabSize,
  setInsertSpaces: state.setInsertSpaces,
  setDefaultNoteTemplate: state.setDefaultNoteTemplate,
}))

export const useDataSettings = () => useSettingsStore((state) => ({
  settings: state.data,
  setExportFormat: state.setExportFormat,
  setIncludeMetadata: state.setIncludeMetadata,
  setBackupLocation: state.setBackupLocation,
  setAutoBackup: state.setAutoBackup,
  setBackupInterval: state.setBackupInterval,
  setBackupRetention: state.setBackupRetention,
})) 