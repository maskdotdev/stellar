import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { type Category, type CreateCategoryRequest } from "@/lib/services/library-service"
import { suggestedCategories } from "./library-constants"
import { IconCombobox } from "./icon-combobox"

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingCategory: Category | null
  categoryForm: CreateCategoryRequest
  setCategoryForm: (form: CreateCategoryRequest | ((prev: CreateCategoryRequest) => CreateCategoryRequest)) => void
  onCreateCategory: () => void
  onUpdateCategory: () => void
  onSuggestedCategorySelect: (suggested: typeof suggestedCategories[0]) => void
  onCancel: () => void
}

export function CategoryDialog({
  open,
  onOpenChange,
  editingCategory,
  categoryForm,
  setCategoryForm,
  onCreateCategory,
  onUpdateCategory,
  onSuggestedCategorySelect,
  onCancel,
}: CategoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingCategory ? "Edit Category" : "Create New Category"}</DialogTitle>
          <DialogDescription>
            {editingCategory ? "Update your study category details." : "Create a new category to organize your studies."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              className="placeholder:text-foreground/30 text-foreground"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Computer Science"
            />
          </div>
          
          <div>
            <Label htmlFor="category-description">Description (optional)</Label>
            <Textarea
              className="placeholder:text-foreground/30 text-foreground"
              id="category-description"
              value={categoryForm.description}
              onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of what you'll study in this category"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="category-color">Color</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="category-color"
                type="color"
                value={categoryForm.color}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                className="w-12 h-10 rounded placeholder:text-foreground/30 text-foreground"
              />
              <Input
                value={categoryForm.color}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                placeholder="#3b82f6"
                className="flex-1 placeholder:text-foreground/30 text-foreground"
              />
            </div>
          </div>

          <IconCombobox
            selectedIcon={categoryForm.icon || "general"}
            onIconSelect={(iconKey: string) => setCategoryForm(prev => ({ ...prev, icon: iconKey }))}
            selectedColor={categoryForm.color || "#3b82f6"}
          />

          {!editingCategory && (
            <div>
              <Label>Quick Start</Label>
              <p className="text-sm text-muted-foreground mb-2">Or choose from popular categories:</p>
              <div className="grid grid-cols-2 gap-2">
                {suggestedCategories.map((suggested) => (
                  <Button
                    key={suggested.name}
                    variant="outline"
                    size="sm"
                    onClick={() => onSuggestedCategorySelect(suggested)}
                    className="justify-start h-auto p-2 text-left"
                  >
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: suggested.color }}
                      />
                      <span className="text-xs">{suggested.name}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={editingCategory ? onUpdateCategory : onCreateCategory}>
            {editingCategory ? "Update Category" : "Create Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 