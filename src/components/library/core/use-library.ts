import { useDebouncedSearchAction } from "@/hooks/use-debounced-action";
import { useToast } from "@/hooks/use-toast";
import {
	ActionType,
	ActionsService,
	useActionsStore,
} from "@/lib/services/actions-service";
import {
	type Category,
	type CreateCategoryRequest,
	type Document,
	LibraryService,
} from "@/lib/services/library-service";
import { useSimpleSettingsStore } from "@/lib/stores/simple-settings-store";
import { useStudyStore } from "@/lib/stores/study-store";
import { useEffect, useState } from "react";

export function useLibrary() {
	const [searchQuery, setSearchQuery] = useState("");
	const [showUploadDialog, setShowUploadDialog] = useState(false);
	const [showCategoryDialog, setShowCategoryDialog] = useState(false);
	const [editingCategory, setEditingCategory] = useState<Category | null>(null);
	const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
		null,
	);
	const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(
		null,
	);
	const [categoryForm, setCategoryForm] = useState<CreateCategoryRequest>({
		name: "",
		description: "",
		color: "#3b82f6",
		icon: "folder",
	});
	const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
	const [editingTitle, setEditingTitle] = useState("");
	const [showProcessingStatus, setShowProcessingStatus] = useState(false);

	const { toast } = useToast();

	// Actions tracking
	const actionsService = ActionsService.getInstance();
	const { currentSessionId } = useActionsStore();
	const { recordSearch } = useDebouncedSearchAction();

	// Use persistent settings for layout preferences
	const viewMode = useSimpleSettingsStore((state) => state.libraryViewMode);
	const setLibraryViewMode = useSimpleSettingsStore(
		(state) => state.setLibraryViewMode,
	);
	const addSearchHistoryOriginal = useSimpleSettingsStore(
		(state) => state.addSearchHistory,
	);

	// Wrapper function that adds action tracking to search
	const addSearchHistory = async (query: string) => {
		// Add search action tracking (debounced)
		try {
			recordSearch(
				query,
				currentCategory ? "documents" : "categories",
				currentCategory ? filteredDocuments.length : filteredCategories.length,
				{
					categoryId: currentCategory || undefined,
					sessionId: currentSessionId || undefined,
				},
			);
		} catch (error) {
			console.error("Failed to track search action:", error);
		}

		// Call original function
		addSearchHistoryOriginal(query);
	};

	const {
		setCurrentView,
		setCurrentDocument,
		setEditingNoteId,
		documents,
		isLoadingDocuments,
		setDocuments,
		setIsLoadingDocuments,
		addDocument,
		removeDocument,
		updateDocument,
		// Category state
		categories,
		isLoadingCategories,
		currentCategory,
		libraryBreadcrumbs,
		setCategories,
		setIsLoadingCategories,
		addCategory,
		updateCategory: updateCategoryInStore,
		removeCategory,
		navigateToCategory,
		navigateBackToCategories,
	} = useStudyStore();

	const libraryService = LibraryService.getInstance();

	// Initialize service and load data
	useEffect(() => {
		const initializeLibrary = async () => {
			try {
				setIsLoadingCategories(true);
				setIsLoadingDocuments(true);
				await libraryService.initialize();

				// Load categories and documents in parallel
				const [categoriesData, documentsData] = await Promise.all([
					libraryService.getAllCategories(),
					currentCategory
						? libraryService.getDocumentsByCategory(currentCategory)
						: [],
				]);

				setCategories(categoriesData);
				if (currentCategory) {
					setDocuments(documentsData);
				}
			} catch (error) {
				console.error("Failed to initialize library:", error);
				toast({
					title: "Error",
					description: "Failed to load library. Please try again.",
					variant: "destructive",
				});
			} finally {
				setIsLoadingCategories(false);
				setIsLoadingDocuments(false);
			}
		};

		initializeLibrary();
	}, []);

	// Load documents when category changes
	useEffect(() => {
		if (currentCategory) {
			const loadCategoryDocuments = async () => {
				try {
					setIsLoadingDocuments(true);
					let documentsData: Document[];

					if (currentCategory === "uncategorized") {
						// Load uncategorized documents
						documentsData = await libraryService.getUncategorizedDocuments();
					} else {
						// Load documents for specific category
						documentsData =
							await libraryService.getDocumentsByCategory(currentCategory);
					}

					setDocuments(documentsData);
				} catch (error) {
					console.error("Failed to load category documents:", error);
					toast({
						title: "Error",
						description: "Failed to load documents for this category.",
						variant: "destructive",
					});
				} finally {
					setIsLoadingDocuments(false);
				}
			};
			loadCategoryDocuments();
		}
	}, [currentCategory]);

	// Filter items based on current view
	const filteredCategories =
		currentCategory === null
			? categories.filter(
					(category) =>
						category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
						(category.description &&
							category.description
								.toLowerCase()
								.includes(searchQuery.toLowerCase())),
				)
			: [];

	const filteredDocuments =
		currentCategory !== null
			? documents.filter(
					(item) =>
						item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
						item.tags.some((tag) =>
							tag.toLowerCase().includes(searchQuery.toLowerCase()),
						) ||
						libraryService
							.getContentPreview(item.content)
							.toLowerCase()
							.includes(searchQuery.toLowerCase()),
				)
			: [];

	const handleCategoryClick = (category: Category) => {
		navigateToCategory(category.id, category.name);
	};

	const handleBackToCategories = () => {
		navigateBackToCategories();
	};

	const handleItemClick = async (item: Document) => {
		// Record document view action
		await actionsService.recordActionWithAutoContext(
			item.doc_type === "note"
				? ActionType.NOTE_EDIT
				: ActionType.DOCUMENT_VIEW,
			{
				documentId: item.id,
				documentTitle: item.title,
				documentType: item.doc_type,
				categoryId: item.category_id || undefined,
			},
			{
				sessionId: currentSessionId || "default-session",
				documentIds: [item.id],
				categoryIds: item.category_id ? [item.category_id] : undefined,
			},
		);

		if (item.doc_type === "note") {
			setEditingNoteId(item.id);
			setCurrentView("note-editor");
		} else {
			setCurrentDocument(item.id);
			setCurrentView("focus");
		}
	};

	const handleCreateCategory = async () => {
		if (!categoryForm.name.trim()) {
			toast({
				title: "Error",
				description: "Category name is required.",
				variant: "destructive",
			});
			return;
		}

		try {
			const newCategory = await libraryService.createCategory(categoryForm);

			// Record category creation action
			await actionsService.recordActionWithAutoContext(
				ActionType.CATEGORY_CREATE,
				{
					categoryId: newCategory.id,
					categoryName: newCategory.name,
					documentCount: 0,
					color: newCategory.color,
					icon: newCategory.icon,
				},
				{
					sessionId: currentSessionId || "default-session",
					categoryIds: [newCategory.id],
				},
			);

			addCategory(newCategory);
			setShowCategoryDialog(false);
			setCategoryForm({
				name: "",
				description: "",
				color: "#3b82f6",
				icon: "folder",
			});
			toast({
				title: "Success",
				description: "Category created successfully.",
			});
		} catch (error) {
			console.error("Failed to create category:", error);
			toast({
				title: "Error",
				description: "Failed to create category. Please try again.",
				variant: "destructive",
			});
		}
	};

	const handleUpdateCategory = async () => {
		if (!editingCategory || !categoryForm.name.trim()) return;

		try {
			const updatedCategory = await libraryService.updateCategory(
				editingCategory.id,
				categoryForm,
			);
			if (updatedCategory) {
				updateCategoryInStore(editingCategory.id, updatedCategory);
				setShowCategoryDialog(false);
				setEditingCategory(null);
				setCategoryForm({
					name: "",
					description: "",
					color: "#3b82f6",
					icon: "folder",
				});
				toast({
					title: "Success",
					description: "Category updated successfully.",
				});
			}
		} catch (error) {
			console.error("Failed to update category:", error);
			toast({
				title: "Error",
				description: "Failed to update category. Please try again.",
				variant: "destructive",
			});
		}
	};

	const handleDeleteCategory = async (categoryId: string) => {
		try {
			const success = await libraryService.deleteCategory(categoryId);
			if (success) {
				removeCategory(categoryId);
				toast({
					title: "Success",
					description:
						"Category deleted successfully. Documents have been moved to uncategorized.",
				});
			}
		} catch (error) {
			console.error("Failed to delete category:", error);
			toast({
				title: "Error",
				description: "Failed to delete category. Please try again.",
				variant: "destructive",
			});
		} finally {
			setDeletingCategoryId(null);
		}
	};

	const handleUploadSuccess = async (document: Document) => {
		// Record document upload action
		await actionsService.recordActionWithAutoContext(
			ActionType.DOCUMENT_UPLOAD,
			{
				documentId: document.id,
				documentTitle: document.title,
				documentType: document.doc_type,
				categoryId: document.category_id || undefined,
			},
			{
				sessionId: currentSessionId || "default-session",
				documentIds: [document.id],
				categoryIds: document.category_id ? [document.category_id] : undefined,
			},
		);

		// If document has a category and we're viewing that category, add it to the list
		if (document.category_id === currentCategory) {
			addDocument(document);
		}
		// If document has no category and we're viewing uncategorized, add it to the list
		else if (!document.category_id && currentCategory === "uncategorized") {
			addDocument(document);
		}
	};

	const handleCreateNote = () => {
		setEditingNoteId(null); // null indicates new note
		setCurrentView("note-editor");
	};

	const handleDeleteDocument = async (documentId: string) => {
		try {
			const success = await libraryService.deleteDocument(documentId);

			if (success) {
				removeDocument(documentId);
				toast({
					title: "Success",
					description: "Document deleted successfully.",
				});
			} else {
				toast({
					title: "Error",
					description: "Failed to delete document.",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Failed to delete document:", error);
			toast({
				title: "Error",
				description: "Failed to delete document. Please try again.",
				variant: "destructive",
			});
		} finally {
			setDeletingDocumentId(null);
		}
	};

	const handleStartEditTitle = (documentId: string, currentTitle: string) => {
		setEditingTitleId(documentId);
		setEditingTitle(currentTitle);
	};

	const handleSaveTitle = async (documentId: string) => {
		if (!editingTitle.trim()) {
			toast({
				title: "Error",
				description: "Title cannot be empty.",
				variant: "destructive",
			});
			return;
		}

		try {
			const document = documents.find((doc) => doc.id === documentId);
			if (!document) return;

			const updatedDocument = await libraryService.updateDocument(documentId, {
				title: editingTitle.trim(),
				content: document.content,
				file_path: document.file_path,
				doc_type: document.doc_type,
				tags: document.tags,
				status: document.status,
				category_id: document.category_id,
			});

			if (updatedDocument) {
				updateDocument(documentId, updatedDocument);
				toast({
					title: "Success",
					description: "Document title updated successfully.",
				});
			}
		} catch (error) {
			console.error("Failed to update document title:", error);
			toast({
				title: "Error",
				description: "Failed to update document title. Please try again.",
				variant: "destructive",
			});
		} finally {
			setEditingTitleId(null);
			setEditingTitle("");
		}
	};

	const handleCancelEditTitle = () => {
		setEditingTitleId(null);
		setEditingTitle("");
	};

	const handleSuggestedCategorySelect = (
		suggested: typeof import("./library-constants").suggestedCategories[0],
	) => {
		setCategoryForm({
			name: suggested.name,
			description: suggested.description,
			color: suggested.color,
			icon: suggested.icon,
		});
	};

	const handleEditCategory = (category: Category) => {
		setEditingCategory(category);
		setCategoryForm({
			name: category.name,
			description: category.description || "",
			color: category.color || "#3b82f6",
			icon: category.icon || "folder",
		});
		setShowCategoryDialog(true);
	};

	const handleShowProcessingStatus = () => {
		setShowProcessingStatus(true);
	};

	return {
		// State
		searchQuery,
		setSearchQuery,
		showUploadDialog,
		setShowUploadDialog,
		showCategoryDialog,
		setShowCategoryDialog,
		editingCategory,
		setEditingCategory,
		deletingCategoryId,
		setDeletingCategoryId,
		deletingDocumentId,
		setDeletingDocumentId,
		categoryForm,
		setCategoryForm,
		editingTitleId,
		editingTitle,
		setEditingTitle,

		// Computed state
		filteredCategories,
		filteredDocuments,

		// Settings
		viewMode,
		setLibraryViewMode,
		addSearchHistory,

		// Store state
		documents,
		isLoadingDocuments,
		categories,
		isLoadingCategories,
		currentCategory,
		libraryBreadcrumbs,
		libraryService,

		// Handlers
		handleCategoryClick,
		handleBackToCategories,
		handleItemClick,
		handleCreateCategory,
		handleUpdateCategory,
		handleDeleteCategory,
		handleUploadSuccess,
		handleCreateNote,
		handleDeleteDocument,
		handleStartEditTitle,
		handleSaveTitle,
		handleCancelEditTitle,
		handleSuggestedCategorySelect,
		handleEditCategory,
		showProcessingStatus,
		setShowProcessingStatus,
		handleShowProcessingStatus,
	};
}
