import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FolderPlus, Edit, Trash2, GraduationCap } from "lucide-react"
import { type Category } from "@/lib/library-service"
import { DynamicIcon } from "./dynamic-icon"

interface CategoryViewProps {
  categories: Category[]
  filteredCategories: Category[]
  libraryService: any
  onCategoryClick: (category: Category) => void
  onEditCategory: (category: Category) => void
  onDeleteCategory: (categoryId: string) => void
  onCreateCategory: () => void
}

export function CategoryView({
  categories,
  filteredCategories,
  libraryService,
  onCategoryClick,
  onEditCategory,
  onDeleteCategory,
  onCreateCategory,
}: CategoryViewProps) {
  if (filteredCategories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">
          {categories.length === 0 ? "Welcome to your Study Library!" : "No categories found"}
        </h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          {categories.length === 0 
            ? "Organize your studies by creating categories for different subjects like Computer Science, Mathematics, or Literature."
            : "Try adjusting your search terms to find categories."
          }
        </p>
        {categories.length === 0 && (
          <Button onClick={onCreateCategory}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Create Your First Category
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* No Category Option */}
      <div
        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer relative group border-dashed"
        onClick={() => onCategoryClick({ id: "uncategorized", name: "No Category" } as Category)}
      >
        <div className="flex items-start space-x-3">
          <div className="p-3 rounded-lg flex-shrink-0 bg-gray-100 dark:bg-gray-800">
            <GraduationCap className="h-6 w-6 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base mb-1">No Category</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Documents and notes without a category
            </p>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                View uncategorized items
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {filteredCategories.map((category) => {
        return (
          <div
            key={category.id}
            className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer relative group"
            onClick={() => onCategoryClick(category)}
          >
            {/* Category Actions */}
            <div 
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onEditCategory(category)
                }}
                className="h-7 w-7 p-0"
                title="Edit Category"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteCategory(category.id)
                }}
                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
                title="Delete Category"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex items-start space-x-3">
              <div 
                className="p-3 rounded-lg flex-shrink-0"
                style={{ backgroundColor: category.color + '20' }}
              >
                <DynamicIcon 
                  iconKey={category.icon || "general"}
                  className="h-6 w-6" 
                  style={{ color: category.color }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-base mb-1 truncate">{category.name}</h3>
                {category.description && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {category.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {category.document_count} {category.document_count === 1 ? 'document' : 'documents'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {libraryService.formatDate(category.updated_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
} 