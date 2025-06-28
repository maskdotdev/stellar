"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import { Pin, Share, Download, Tag } from "lucide-react"
import { useStudyStore } from "@/lib/study-store"

export function ContextBar() {
  const { 
    currentView, 
    currentDocument, 
    currentTags, 
    libraryBreadcrumbs,
    currentCategory,
    documents,
    setCurrentView,
    navigateToCategory,
    navigateBackToCategories 
  } = useStudyStore()

  const getBreadcrumbs = () => {
    switch (currentView) {
      case "library":
        return libraryBreadcrumbs.map(breadcrumb => ({
          id: breadcrumb.id,
          name: breadcrumb.name,
          isClickable: true,
          onClick: () => {
            if (breadcrumb.id === null) {
              navigateBackToCategories()
            } else {
              navigateToCategory(breadcrumb.id, breadcrumb.name)
            }
          }
        }))
      
      case "focus":
        const focusBreadcrumbs = [
          { id: "library", name: "Library", isClickable: true, onClick: () => setCurrentView("library") }
        ]
        if (currentCategory) {
          // Add category breadcrumb if we're in a category
          const categoryName = libraryBreadcrumbs.find(b => b.id === currentCategory)?.name || "Category"
          focusBreadcrumbs.push({
            id: currentCategory,
            name: categoryName,
            isClickable: true,
            onClick: () => {
              setCurrentView("library")
              navigateToCategory(currentCategory, categoryName)
            }
          })
        }
        if (currentDocument) {
          // Find the document title from the documents in the store
          const document = documents.find(doc => doc.id === currentDocument)
          const documentTitle = document?.title || currentDocument
          focusBreadcrumbs.push({
            id: "current-doc",
            name: documentTitle,
            isClickable: false,
            onClick: () => {}
          })
        }
        return focusBreadcrumbs
      
      case "settings":
        return [
          { id: "settings", name: "Settings", isClickable: false, onClick: () => {} }
        ]
      
      case "history":
        return [
          { id: "history", name: "History", isClickable: false, onClick: () => {} }
        ]
      
      case "graph":
        return [
          { id: "graph", name: "Graph View", isClickable: false, onClick: () => {} }
        ]
      
      case "workspace":
        return [
          { id: "workspace", name: "Workspace", isClickable: false, onClick: () => {} }
        ]
      
      case "note-editor":
        return [
          { id: "library", name: "Library", isClickable: true, onClick: () => setCurrentView("library") },
          { id: "note-editor", name: "Note Editor", isClickable: false, onClick: () => {} }
        ]
      
      default:
        return [{ id: "home", name: "Home", isClickable: false, onClick: () => {} }]
    }
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <div className="h-12 px-4 flex items-center justify-between bg-muted/20 border-b">
      {/* Dynamic Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((breadcrumb, index) => (
            <div key={breadcrumb.id || index} className="flex items-center">
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {breadcrumb.isClickable ? (
                  <BreadcrumbLink 
                    className="cursor-pointer hover:text-foreground" 
                    onClick={breadcrumb.onClick}
                  >
                    {breadcrumb.name}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{breadcrumb.name}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Tags and Actions */}
      <div className="flex items-center space-x-2">
        {/* Current Tags */}
        {currentTags && currentTags.length > 0 && (
          <div className="flex items-center space-x-1">
            {currentTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm">
            <Pin className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Share className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
