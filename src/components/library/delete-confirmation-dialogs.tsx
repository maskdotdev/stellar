import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DeleteConfirmationDialogsProps {
  deletingCategoryId: string | null
  deletingDocumentId: string | null
  onCancelCategoryDelete: () => void
  onCancelDocumentDelete: () => void
  onConfirmCategoryDelete: (categoryId: string) => void
  onConfirmDocumentDelete: (documentId: string) => void
}

export function DeleteConfirmationDialogs({
  deletingCategoryId,
  deletingDocumentId,
  onCancelCategoryDelete,
  onCancelDocumentDelete,
  onConfirmCategoryDelete,
  onConfirmDocumentDelete,
}: DeleteConfirmationDialogsProps) {
  return (
    <>
      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deletingCategoryId} onOpenChange={() => onCancelCategoryDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? Documents in this category will be moved to "Uncategorized". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className={cn(buttonVariants({ variant: "destructive" }))}
              onClick={() => deletingCategoryId && onConfirmCategoryDelete(deletingCategoryId)}
            >
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Document Confirmation */}
      <AlertDialog open={!!deletingDocumentId} onOpenChange={() => onCancelDocumentDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className={cn(buttonVariants({ variant: "destructive" }))}
              onClick={() => deletingDocumentId && onConfirmDocumentDelete(deletingDocumentId)}
            >
              Delete Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 