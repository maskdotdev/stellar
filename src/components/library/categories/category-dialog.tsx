import { Button } from "@/components/ui/button"
import { ColorPicker } from "@/components/ui/color-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Category, CreateCategoryRequest } from "@/lib/services/library-service"
import { suggestedCategories } from "../core/library-constants"
import { IconCombobox } from "../shared/icon-combobox"

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
  allCategories?: Category[]
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
  allCategories = [],
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              className="placeholder:text-foreground/30 text-foreground"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Computer Science"
            />
          </div>

          <div className="flex flex-col gap-2">
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="category-color">Color</Label>
            <ColorPicker
              value={categoryForm.color}
              onChange={(color) => setCategoryForm(prev => ({ ...prev, color }))}
              defaultValue="#3b82f6"
            />
          </div>

          {/* Parent Category Selection */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="category-parent">Parent (optional)</Label>
            <Select
              value={categoryForm.parent_id || "root"}
              onValueChange={(value) =>
                setCategoryForm(prev => ({ ...prev, parent_id: value === "root" ? undefined : value }))
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Top level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">Top level</SelectItem>
                {allCategories
                  .filter(c => !editingCategory || c.id !== editingCategory.id)
                  .map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
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