import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Search, Filter, Grid, List, Upload, Plus, 
  ArrowLeft, FolderPlus
} from "lucide-react"

interface LibraryHeaderProps {
  currentCategory: string | null
  libraryBreadcrumbs: Array<{ id: string | null; name: string }>
  searchQuery: string
  setSearchQuery: (query: string) => void
  addSearchHistory: (query: string) => void
  viewMode: "list" | "grid"
  setLibraryViewMode: (mode: "list" | "grid") => void
  onBackToCategories: () => void
  onNavigateToCategory: (id: string, name: string) => void
  onShowCategoryDialog: () => void
  onShowUploadDialog: () => void
  onCreateNote: () => void
}

export function LibraryHeader({
  currentCategory,
  libraryBreadcrumbs,
  searchQuery,
  setSearchQuery,
  addSearchHistory,
  viewMode,
  setLibraryViewMode,
  onBackToCategories,
  onNavigateToCategory,
  onShowCategoryDialog,
  onShowUploadDialog,
  onCreateNote,
}: LibraryHeaderProps) {
  return (
    <div className="p-4 border-b">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {currentCategory && (
            <Button variant="outline" size="sm" onClick={onBackToCategories}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <h1 className="text-2xl font-bold">
            {currentCategory ? libraryBreadcrumbs[libraryBreadcrumbs.length - 1]?.name : "Study Categories"}
          </h1>
        </div>
        
        <div className="flex items-center space-x-2">
          {currentCategory === null ? (
            // Category view actions
            <Button 
              variant="outline" 
              size="sm"
              onClick={onShowCategoryDialog}
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              New Category
            </Button>
          ) : (
            // Document view actions
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onShowUploadDialog}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onCreateNote}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Note
              </Button>
              <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setLibraryViewMode("list")}>
                <List className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setLibraryViewMode("grid")}>
                <Grid className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={currentCategory === null ? "Search categories..." : "Search documents, tags, content..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                addSearchHistory(searchQuery.trim())
              }
            }}
            className="pl-10"
          />
        </div>
        {currentCategory && (
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        )}
      </div>
    </div>
  )
} 