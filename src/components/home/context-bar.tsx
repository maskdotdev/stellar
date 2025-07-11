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
import { useStudyStore } from "@/lib/stores/study-store"
import { SessionIndicator } from "@/components/session"
import { useActionsStore, ActionsService, ActionType } from "@/lib/services/actions-service"

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
  

  
  // Actions tracking
  const actionsService = ActionsService.getInstance()
  const { currentSessionId } = useActionsStore()

  // Handle navigation with action tracking
  const handleNavigationClick = async (targetView: string, breadcrumbName: string) => {
    await actionsService.recordActionWithAutoContext(
      ActionType.VIEW_SWITCH,
      {
        fromView: currentView,
        toView: targetView,
        viewLabel: breadcrumbName,
        navigationMethod: 'breadcrumb'
      },
      {
        sessionId: currentSessionId || 'default-session'
      }
    )
    
    setCurrentView(targetView as any)
  }

  const handleCategoryNavigation = async (categoryId: string, categoryName: string) => {
    await actionsService.recordActionWithAutoContext(
      ActionType.VIEW_SWITCH,
      {
        fromView: currentView,
        toView: 'library',
        viewLabel: categoryName,
        navigationMethod: 'breadcrumb',
        categoryId: categoryId
      },
      {
        sessionId: currentSessionId || 'default-session',
        categoryIds: [categoryId]
      }
    )
    
    setCurrentView("library")
    navigateToCategory(categoryId, categoryName)
  }

  const getBreadcrumbs = () => {
    switch (currentView) {
      case "library":
        return libraryBreadcrumbs.map(breadcrumb => ({
          id: breadcrumb.id,
          name: breadcrumb.name,
          isClickable: true,
          onClick: async () => {
            if (breadcrumb.id === null) {
              await actionsService.recordActionWithAutoContext(
                ActionType.VIEW_SWITCH,
                {
                  fromView: currentView,
                  toView: 'library',
                  viewLabel: 'All Categories',
                  navigationMethod: 'breadcrumb'
                },
                {
                  sessionId: currentSessionId || 'default-session'
                }
              )
              navigateBackToCategories()
            } else {
              await handleCategoryNavigation(breadcrumb.id, breadcrumb.name)
            }
          }
        }))
      
      case "focus":
        const focusBreadcrumbs = [
          { id: "library", name: "Library", isClickable: true, onClick: async () => await handleNavigationClick("library", "Library") }
        ]
        if (currentCategory) {
          // Add category breadcrumb if we're in a category
          const categoryName = libraryBreadcrumbs.find(b => b.id === currentCategory)?.name || "Category"
          focusBreadcrumbs.push({
            id: currentCategory,
            name: categoryName,
            isClickable: true,
            onClick: async () => await handleCategoryNavigation(currentCategory, categoryName)
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
            onClick: async () => {}
          })
        }
        return focusBreadcrumbs
      
      case "settings":
        return [
          { id: "settings", name: "Settings", isClickable: false, onClick: async () => {} }
        ]
      
      case "history":
        return [
          { id: "history", name: "History", isClickable: false, onClick: async () => {} }
        ]
      
      case "graph":
        return [
          { id: "graph", name: "Graph View", isClickable: false, onClick: async () => {} }
        ]
      
      case "workspace":
        return [
          { id: "workspace", name: "Workspace", isClickable: false, onClick: async () => {} }
        ]
      
      case "sessions":
        return [
          { id: "sessions", name: "Study Sessions", isClickable: false, onClick: async () => {} }
        ]
      
      case "flashcards":
        return [
          { id: "flashcards", name: "Flashcards", isClickable: false, onClick: async () => {} }
        ]
      
      case "note-editor":
        return [
          { id: "library", name: "Library", isClickable: true, onClick: async () => await handleNavigationClick("library", "Library") },
          { id: "note-editor", name: "Note Editor", isClickable: false, onClick: async () => {} }
        ]
      
      default:
        return [{ id: "home", name: "Home", isClickable: false, onClick: async () => {} }]
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
        {/* Session Indicator */}
        <SessionIndicator />
        
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
