"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { CategoryDialog } from "../categories/category-dialog";
import { CategoryView } from "../categories/category-view";
import { DocumentView } from "../documents/document-view";
import { ProcessingStatus } from "../processing/processing-status";
import { DeleteConfirmationDialogs } from "../shared/delete-confirmation-dialogs";
import { PdfUploadDialog } from "../shared/pdf-upload-dialog";
import { LibraryHeader } from "./library-header";
import { useLibrary } from "./use-library";

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
    startCreateCategory,
    editingTitleId,
    editingTitle,
    setEditingTitle,

    // Computed state
    filteredCategories,
    filteredDocuments,
    subcategories,

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
    handleMoveDocument,
    handleSuggestedCategorySelect,
    handleEditCategory,
    showProcessingStatus,
    setShowProcessingStatus,
    handleShowProcessingStatus,
  } = useLibrary();

  if (isLoadingCategories && categories.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading your library...</p>
        </div>
      </div>
    );
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
        onNavigateToCategory={(id, name) =>
          handleCategoryClick({
            id,
            name,
            description: "",
            color: "#3b82f6",
            icon: "folder",
            created_at: "",
            updated_at: "",
            document_count: 0,
          })
        }
        onShowCategoryDialog={() => startCreateCategory()}
        onShowUploadDialog={() => setShowUploadDialog(true)}
        onCreateNote={handleCreateNote}
        onShowProcessingStatus={handleShowProcessingStatus}
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
              onCreateCategory={startCreateCategory}
              showUncategorized={true}
            />
          ) : (
            <>
              {subcategories.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Subfolders</h3>
                  <CategoryView
                    categories={categories}
                    filteredCategories={subcategories}
                    libraryService={libraryService}
                    onCategoryClick={handleCategoryClick}
                    onEditCategory={handleEditCategory}
                    onDeleteCategory={setDeletingCategoryId}
                    onCreateCategory={startCreateCategory}
                    showUncategorized={false}
                  />
                </div>
              )}
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
                onMoveDocument={handleMoveDocument}
                categories={categories}
                subcategories={subcategories}
                currentCategory={currentCategory}
              />
            </>
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
        allCategories={categories}
        onCancel={() => {
          setShowCategoryDialog(false);
          setEditingCategory(null);
          setCategoryForm({
            name: "",
            description: "",
            color: "#3b82f6",
            icon: "folder",
            parent_id: undefined,
          });
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

      {/* Processing Status Dialog */}
      <Dialog
        open={showProcessingStatus}
        onOpenChange={setShowProcessingStatus}
      >
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>PDF Processing Status</DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-0">
            <ProcessingStatus />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
