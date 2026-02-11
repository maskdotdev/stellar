"use client";

import type { Category, Document } from "@/lib/services/library-service";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Keybinding {
	id: string;
	action: string;
	category: string;
	defaultKeys: string;
	currentKeys: string;
	description: string;
}

interface NavigationState {
	view:
		| "focus"
		| "library"
		| "graph"
		| "workspace"
		| "history"
		| "analytics"
		| "sessions"
		| "settings"
		| "note-editor"
		| "debug-hotkeys"
		| "flashcards";
	focusMode?: boolean;
	currentDocument?: string | null;
	editingNoteId?: string | null;
	currentCategory?: string | null;
	settingsTab?:
		| "providers"
		| "models"
		| "chat"
		| "appearance"
		| "keybindings"
		| "pdf"
		| "data"
		| "developer";
}

const defaultKeybindings: Keybinding[] = [
	// Navigation
	{
		id: "library",
		action: "Open Library",
		category: "Navigation",
		defaultKeys: "⌘1",
		currentKeys: "⌘1",
		description: "Navigate to library view",
	},
	{
		id: "graph",
		action: "Open Graph View",
		category: "Navigation",
		defaultKeys: "⌘2",
		currentKeys: "⌘2",
		description: "Navigate to graph view",
	},
	{
		id: "workspace",
		action: "Open Workspace",
		category: "Navigation",
		defaultKeys: "⌘3",
		currentKeys: "⌘3",
		description: "Navigate to workspace view",
	},
	{
		id: "history",
		action: "Open History",
		category: "Navigation",
		defaultKeys: "⌘4",
		currentKeys: "⌘4",
		description: "Navigate to history view",
	},

	// Quick Actions
	{
		id: "import",
		action: "Import PDF",
		category: "Quick Actions",
		defaultKeys: "⌘⇧I",
		currentKeys: "⌘⇧I",
		description: "Import a PDF document",
	},
	{
		id: "new-note",
		action: "New Note",
		category: "Quick Actions",
		defaultKeys: "⌘⇧N",
		currentKeys: "⌘⇧N",
		description: "Create a new note",
	},
	{
		id: "focus",
		action: "Focus Mode",
		category: "Quick Actions",
		defaultKeys: "⌘.",
		currentKeys: "⌘.",
		description: "Enter focus mode",
	},
	{
		id: "chat",
		action: "Ask AI",
		category: "Quick Actions",
		defaultKeys: "⇧Space",
		currentKeys: "⇧Space",
		description: "Open AI chat",
	},
	{
		id: "flashcards",
		action: "Create Flashcards",
		category: "Quick Actions",
		defaultKeys: "⌘⇧F",
		currentKeys: "⌘⇧F",
		description: "Create flashcards from content",
	},
	{
		id: "toggle-dark-mode",
		action: "Toggle Dark Mode",
		category: "Quick Actions",
		defaultKeys: "⌘⇧T",
		currentKeys: "⌘⇧T",
		description: "Toggle between light and dark mode",
	},

	// Settings
	{
		id: "settings-providers",
		action: "AI Providers Settings",
		category: "Settings",
		defaultKeys: "⌘,P",
		currentKeys: "⌘,P",
		description: "Configure AI providers",
	},
	{
		id: "settings-models",
		action: "Models Settings",
		category: "Settings",
		defaultKeys: "⌘,M",
		currentKeys: "⌘,M",
		description: "Configure AI models",
	},
	// { id: "settings-chat", action: "Chat Settings", category: "Settings", defaultKeys: "⌘,C", currentKeys: "⌘,C", description: "Configure chat settings" },
	// { id: "settings-appearance", action: "Appearance Settings", category: "Settings", defaultKeys: "⌘,A", currentKeys: "⌘,A", description: "Configure appearance" },
	{
		id: "settings-keybindings",
		action: "Keybindings Settings",
		category: "Settings",
		defaultKeys: "⌘,K",
		currentKeys: "⌘,K",
		description: "Configure keybindings",
	},

	// System
	{
		id: "command-palette",
		action: "Command Palette",
		category: "System",
		defaultKeys: "⌘⇧P",
		currentKeys: "⌘⇧P",
		description: "Open command palette (also works with /)",
	},
	{
		id: "debug-hotkeys",
		action: "Debug Hotkeys",
		category: "Development",
		defaultKeys: "⌘⇧D",
		currentKeys: "⌘⇧D",
		description: "Open hotkey debugging page",
	},
	{
		id: "escape",
		action: "Close/Cancel",
		category: "System",
		defaultKeys: "Escape",
		currentKeys: "Escape",
		description: "Close dialogs or cancel actions",
	},
	{
		id: "back",
		action: "Go Back",
		category: "Navigation",
		defaultKeys: "B",
		currentKeys: "B",
		description: "Navigate to previous page",
	},
];

export interface StudyState {
	currentView:
		| "focus"
		| "library"
		| "graph"
		| "workspace"
		| "history"
		| "analytics"
		| "sessions"
		| "settings"
		| "note-editor"
		| "debug-hotkeys"
		| "flashcards";
	focusMode: boolean;
	showCommandPalette: boolean;
	showInteractionDrawer: boolean;
	showFloatingChat: boolean;
	initialChatText: string | null;
	currentDocument: string | null;
	editingNoteId: string | null;
	// When navigating from a note back to a document/location, we stage the target here
	pendingJump: { documentId: string; page?: number; text?: string } | null;
	currentTags: string[];
	documents: Document[];
	isLoadingDocuments: boolean;
	settingsTab:
		| "providers"
		| "models"
		| "chat"
		| "appearance"
		| "keybindings"
		| "pdf"
		| "data"
		| "developer";
	keybindings: Keybinding[];

	// Navigation history
	navigationHistory: NavigationState[];

	// Category-related state
	categories: Category[];
	isLoadingCategories: boolean;
	currentCategory: string | null; // null means showing category list, string means showing documents in category
	libraryBreadcrumbs: Array<{ id: string | null; name: string }>;

	// Global intents
	shouldOpenCreateCategoryDialog: boolean;
	shouldOpenUploadDialog: boolean;
	pendingUploadFile: File | null;

	setCurrentView: (view: StudyState["currentView"]) => void;
	setEditingNoteId: (noteId: string | null) => void;
	setFocusMode: (enabled: boolean) => void;
	setShowCommandPalette: (show: boolean) => void;
	setShowInteractionDrawer: (show: boolean) => void;
	setShowFloatingChat: (show: boolean) => void;
	setInitialChatText: (text: string | null) => void;
	setCurrentDocument: (doc: string | null) => void;
	setPendingJump: (
		target: { documentId: string; page?: number; text?: string } | null,
	) => void;
	setCurrentTags: (tags: string[]) => void;
	setDocuments: (documents: Document[]) => void;
	setIsLoadingDocuments: (loading: boolean) => void;
	addDocument: (document: Document) => void;
	updateDocument: (id: string, updatedDocument: Document) => void;
	removeDocument: (id: string) => void;
	setSettingsTab: (tab: StudyState["settingsTab"]) => void;
	updateKeybinding: (id: string, newKeys: string) => void;
	resetKeybinding: (id: string) => void;
	resetAllKeybindings: () => void;

	// Navigation history methods
	goBack: () => void;
	canGoBack: () => boolean;

	// Category-related methods
	setCategories: (categories: Category[]) => void;
	setIsLoadingCategories: (loading: boolean) => void;
	addCategory: (category: Category) => void;
	updateCategory: (id: string, updatedCategory: Category) => void;
	removeCategory: (id: string) => void;
	setCurrentCategory: (categoryId: string | null) => void;
	setLibraryBreadcrumbs: (
		breadcrumbs: Array<{ id: string | null; name: string }>,
	) => void;
	navigateToCategory: (
		categoryId: string | null,
		categoryName?: string,
	) => void;
	navigateBackToCategories: () => void;

	// Global intent setters
	setShouldOpenCreateCategoryDialog: (open: boolean) => void;
	setShouldOpenUploadDialog: (open: boolean) => void;
	setPendingUploadFile: (file: File | null) => void;
}

export const useStudyStore = create<StudyState>()(
	persist(
		(set, get) => ({
			currentView: "library",
			focusMode: false,
			showCommandPalette: false,
			showInteractionDrawer: false,
			showFloatingChat: false,
			initialChatText: null,
			currentDocument: null,
			editingNoteId: null,
			pendingJump: null,
			// currentTags: ["transformer", "attention", "nlp"],
			currentTags: [],
			documents: [],
			isLoadingDocuments: false,
			settingsTab: "providers",
			keybindings: defaultKeybindings,

			// Navigation history
			navigationHistory: [],

			// Category-related state
			categories: [],
			isLoadingCategories: false,
			currentCategory: null,
			libraryBreadcrumbs: [{ id: null, name: "Categories" }],

			// Global intents
			shouldOpenCreateCategoryDialog: false,
			shouldOpenUploadDialog: false,
			pendingUploadFile: null,

			setCurrentView: (view) =>
				set((state) => {
					// Save current state to history before changing view
					const currentState: NavigationState = {
						view: state.currentView,
						focusMode: state.focusMode,
						currentDocument: state.currentDocument,
						editingNoteId: state.editingNoteId,
						currentCategory: state.currentCategory,
						settingsTab: state.settingsTab,
					};

					// Add to history if it's different from the current view
					const newHistory =
						state.currentView !== view
							? [...state.navigationHistory, currentState].slice(-10) // Keep last 10 states
							: state.navigationHistory;

					return {
						currentView: view,
						navigationHistory: newHistory,
					};
				}),
			setEditingNoteId: (noteId) => set({ editingNoteId: noteId }),
			setFocusMode: (enabled) => set({ focusMode: enabled }),
			setShowCommandPalette: (show) => set({ showCommandPalette: show }),
			setShowInteractionDrawer: (show) => set({ showInteractionDrawer: show }),
			setShowFloatingChat: (show) => set({ showFloatingChat: show }),
			setInitialChatText: (text) => set({ initialChatText: text }),
			setCurrentDocument: (doc) => set({ currentDocument: doc }),
			setPendingJump: (target) => set({ pendingJump: target }),
			setCurrentTags: (tags) => set({ currentTags: tags }),
			setDocuments: (documents) => set({ documents }),
			setIsLoadingDocuments: (loading) => set({ isLoadingDocuments: loading }),
			addDocument: (document) =>
				set((state) => ({ documents: [document, ...state.documents] })),
			updateDocument: (id, updatedDocument) =>
				set((state) => ({
					documents: state.documents.map((doc) =>
						doc.id === id ? updatedDocument : doc,
					),
				})),
			removeDocument: (id) =>
				set((state) => ({
					documents: state.documents.filter((doc) => doc.id !== id),
				})),
			setSettingsTab: (tab) => set({ settingsTab: tab }),
			updateKeybinding: (id, newKeys) =>
				set((state) => ({
					keybindings: state.keybindings.map((kb) =>
						kb.id === id ? { ...kb, currentKeys: newKeys } : kb,
					),
				})),
			resetKeybinding: (id) =>
				set((state) => ({
					keybindings: state.keybindings.map((kb) =>
						kb.id === id ? { ...kb, currentKeys: kb.defaultKeys } : kb,
					),
				})),
			resetAllKeybindings: () =>
				set((state) => ({
					keybindings: state.keybindings.map((kb) => ({
						...kb,
						currentKeys: kb.defaultKeys,
					})),
				})),

			// Navigation history methods
			goBack: () =>
				set((state) => {
					if (state.navigationHistory.length === 0) return state;

					const previousState =
						state.navigationHistory[state.navigationHistory.length - 1];
					const newHistory = state.navigationHistory.slice(0, -1);

					return {
						...state,
						currentView: previousState.view,
						focusMode: previousState.focusMode ?? state.focusMode,
						currentDocument:
							previousState.currentDocument ?? state.currentDocument,
						editingNoteId: previousState.editingNoteId ?? state.editingNoteId,
						currentCategory:
							previousState.currentCategory ?? state.currentCategory,
						settingsTab: previousState.settingsTab ?? state.settingsTab,
						navigationHistory: newHistory,
					};
				}),
			canGoBack: () => {
				const state = get();
				return state.navigationHistory.length > 0;
			},

			// Category-related methods
			setCategories: (categories) => set({ categories }),
			setIsLoadingCategories: (loading) =>
				set({ isLoadingCategories: loading }),
			addCategory: (category) =>
				set((state) => ({ categories: [category, ...state.categories] })),
			updateCategory: (id, updatedCategory) =>
				set((state) => ({
					categories: state.categories.map((cat) =>
						cat.id === id ? updatedCategory : cat,
					),
				})),
			removeCategory: (id) =>
				set((state) => ({
					categories: state.categories.filter((cat) => cat.id !== id),
				})),
			setCurrentCategory: (categoryId) => set({ currentCategory: categoryId }),
			setLibraryBreadcrumbs: (breadcrumbs) =>
				set({ libraryBreadcrumbs: breadcrumbs }),
			navigateToCategory: (categoryId, categoryName) =>
				set((state) => {
					if (categoryId === null) {
						return {
							currentCategory: null,
							libraryBreadcrumbs: [{ id: null, name: "Categories" }],
						};
					}
					// Build ancestor chain from selected category up to root
					const byId = new Map(state.categories.map((c) => [c.id, c] as const));
					const chain: Array<{ id: string | null; name: string }> = [];
					let current = byId.get(categoryId) || null;
					// Walk up parents
					while (current) {
						chain.push({ id: current.id, name: current.name });
						current = current.parent_id
							? byId.get(current.parent_id) || null
							: null;
					}
					chain.reverse();
					const name =
						categoryName || byId.get(categoryId)?.name || "Unknown Category";
					const breadcrumbs = [
						{ id: null, name: "Categories" },
						...(chain.length ? chain : [{ id: categoryId, name }]),
					];
					return {
						currentCategory: categoryId,
						libraryBreadcrumbs: breadcrumbs,
					};
				}),
			navigateBackToCategories: () =>
				set((state) => {
					const crumbs = state.libraryBreadcrumbs;
					if (crumbs.length <= 1) {
						return state;
					}
					const newCrumbs = crumbs.slice(0, -1);
					const last = newCrumbs[newCrumbs.length - 1];
					return {
						currentCategory: last.id,
						libraryBreadcrumbs: newCrumbs,
					};
				}),

			// Global intent setters
			setShouldOpenCreateCategoryDialog: (open: boolean) =>
				set({ shouldOpenCreateCategoryDialog: open }),
			setShouldOpenUploadDialog: (open: boolean) =>
				set({ shouldOpenUploadDialog: open }),
			setPendingUploadFile: (file: File | null) =>
				set({ pendingUploadFile: file }),
		}),
		{
			name: "stellar-study-store",
			partialize: (state) => ({
				settingsTab: state.settingsTab,
				keybindings: state.keybindings,
				currentTags: state.currentTags,
			}),
		},
	),
);
