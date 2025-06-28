"use client"

import { Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLibrary } from "./use-library"
import { LibraryHeader } from "./library-header"
import { CategoryView } from "./category-view"
import { DocumentView } from "./document-view"
import { CategoryDialog } from "./category-dialog"
import { DeleteConfirmationDialogs } from "./delete-confirmation-dialogs"
import { PdfUploadDialog } from "./pdf-upload-dialog"

export function Library() {
  const {
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
  } = useLibrary()

  if (isLoadingCategories && categories.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading your library...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <LibraryHeader
        currentCategory={currentCategory}
        libraryBreadcrumbs={libraryBreadcrumbs}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        addSearchHistory={addSearchHistory}
        viewMode={viewMode}
        setLibraryViewMode={setLibraryViewMode}
        onBackToCategories={handleBackToCategories}
        onNavigateToCategory={(id, name) => handleCategoryClick({ id, name } as any)}
        onShowCategoryDialog={() => setShowCategoryDialog(true)}
        onShowUploadDialog={() => setShowUploadDialog(true)}
        onCreateNote={handleCreateNote}
      />

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {currentCategory === null ? (
            <CategoryView
              categories={categories}
              filteredCategories={filteredCategories}
              libraryService={libraryService}
              onCategoryClick={handleCategoryClick}
              onEditCategory={handleEditCategory}
              onDeleteCategory={setDeletingCategoryId}
              onCreateCategory={() => setShowCategoryDialog(true)}
            />
          ) : (
            <DocumentView
              documents={documents}
              filteredDocuments={filteredDocuments}
              isLoadingDocuments={isLoadingDocuments}
              viewMode={viewMode}
              libraryService={libraryService}
              editingTitleId={editingTitleId}
              editingTitle={editingTitle}
              onItemClick={handleItemClick}
              onStartEditTitle={handleStartEditTitle}
              onSaveTitle={handleSaveTitle}
              onCancelEditTitle={handleCancelEditTitle}
              onDeleteDocument={setDeletingDocumentId}
              onCreateNote={handleCreateNote}
              onUploadPdf={() => setShowUploadDialog(true)}
              setEditingTitle={setEditingTitle}
            />
          )}
        </div>
      </ScrollArea>

      {/* Category Create/Edit Dialog */}
      <CategoryDialog
        open={showCategoryDialog}
        onOpenChange={setShowCategoryDialog}
        editingCategory={editingCategory}
        categoryForm={categoryForm}
        setCategoryForm={setCategoryForm}
        onCreateCategory={handleCreateCategory}
        onUpdateCategory={handleUpdateCategory}
        onSuggestedCategorySelect={handleSuggestedCategorySelect}
        onCancel={() => {
          setShowCategoryDialog(false)
          setEditingCategory(null)
          setCategoryForm({ name: "", description: "", color: "#3b82f6", icon: "folder" })
        }}
      />

      {/* Delete Confirmation Dialogs */}
      <DeleteConfirmationDialogs
        deletingCategoryId={deletingCategoryId}
        deletingDocumentId={deletingDocumentId}
        onCancelCategoryDelete={() => setDeletingCategoryId(null)}
        onCancelDocumentDelete={() => setDeletingDocumentId(null)}
        onConfirmCategoryDelete={handleDeleteCategory}
        onConfirmDocumentDelete={handleDeleteDocument}
      />

      {/* PDF Upload Dialog */}
      <PdfUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onSuccess={handleUploadSuccess}
        categories={categories}
        currentCategoryId={currentCategory}
      />
    </div>
  )
}
