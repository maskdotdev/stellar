import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
// removed unused Input import
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
// removed unused cn import
import type { ToolbarSlot } from '@react-pdf-viewer/toolbar';
// no explicit React import needed
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronsLeft,
  Download,
  Expand,
  Eye,
  FileDown,
  FileText,
  Home,
  MoveLeft,
  MoveRight,
  Search,
  Star
} from 'lucide-react';

/**
 * Example 1: Custom Icons and Tooltips for Navigation
 */
export function NavigationToolbarExample() {
  return (slots: ToolbarSlot) => (
    <div className="flex items-center gap-2 px-4 py-2 bg-card text-card-foreground border-b border-border">
      {/* Custom Navigation with Different Icons */}
      <div className="flex items-center gap-1">
        <slots.GoToFirstPage>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    disabled={props.isDisabled}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  >
                    <Home className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>🏠 Go to first page</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.GoToFirstPage>

        <slots.GoToPreviousPage>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    disabled={props.isDisabled}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  >
                    <MoveLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>⬅️ Previous page</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.GoToPreviousPage>

        <slots.GoToNextPage>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    disabled={props.isDisabled}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  >
                    <MoveRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>➡️ Next page</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.GoToNextPage>

        <slots.GoToLastPage>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    disabled={props.isDisabled}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>⭐ Go to last page</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.GoToLastPage>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Page Info with Custom Input */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Page</span>
        <slots.CurrentPageInput />
        <span>of</span>
        <slots.NumberOfPages />
      </div>
    </div>
  );
}

/**
 * Example 2: Custom Action Buttons with Fun Icons
 */
export function ActionToolbarExample() {
  return (slots: ToolbarSlot) => (
    <div className="flex items-center gap-2 px-4 py-2 bg-card text-card-foreground border-b border-border">
      {/* Custom Action Icons */}
      <div className="flex items-center gap-1">
        <slots.ShowSearchPopover>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>🔍 Search in document</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.ShowSearchPopover>

        <slots.Download>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  >
                    <FileDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>💾 Download PDF</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.Download>

        <slots.Print>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>🖨️ Print document</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.Print>

        <slots.EnterFullScreen>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  >
                    <Expand className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>🖥️ Enter fullscreen</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.EnterFullScreen>
      </div>
    </div>
  );
}

/**
 * Example 3: Themed Toolbar with Custom Button Styles
 */
export function ThemedToolbarExample() {
  return (slots: ToolbarSlot) => (
    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-card-foreground border-b border-purple-200 dark:border-purple-800">
      {/* Themed Navigation */}
      <div className="flex items-center gap-1">
        <slots.GoToFirstPage>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    disabled={props.isDisabled}
                    className="h-8 w-8 p-0 hover:bg-purple-500/20 hover:text-purple-700 dark:hover:text-purple-300 rounded-full"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-purple-500 text-white">
                  <p>🚀 Jump to start</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.GoToFirstPage>

        <slots.GoToPreviousPage>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    disabled={props.isDisabled}
                    className="h-8 w-8 p-0 hover:bg-purple-500/20 hover:text-purple-700 dark:hover:text-purple-300 rounded-full"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-purple-500 text-white">
                  <p>⬅️ Go back</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.GoToPreviousPage>
      </div>

      <Separator orientation="vertical" className="h-6 bg-purple-300 dark:bg-purple-700" />

      {/* Themed Page Info */}
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          Page
        </Badge>
        <slots.CurrentPageInput />
        <span className="text-purple-600 dark:text-purple-400">of</span>
        <slots.NumberOfPages />
      </div>
    </div>
  );
}

/**
 * Example 4: Minimal Toolbar with Custom Icons
 */
export function MinimalToolbarExample() {
  return (slots: ToolbarSlot) => (
    <div className="flex items-center justify-between px-4 py-2 bg-card text-card-foreground border-b border-border">
      {/* Left side - Navigation */}
      <div className="flex items-center gap-1">
        <slots.GoToPreviousPage>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={props.onClick}
                    disabled={props.isDisabled}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowLeft className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Previous</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.GoToPreviousPage>

        <slots.GoToNextPage>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={props.onClick}
                    disabled={props.isDisabled}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Next</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.GoToNextPage>
      </div>

      {/* Center - Page Info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <slots.CurrentPageInput />
        <span>/</span>
        <slots.NumberOfPages />
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-1">
        <slots.ShowSearchPopover>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 w-8 p-0"
                  >
                    <Search className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Search</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.ShowSearchPopover>

        <slots.Download>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 w-8 p-0"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Download</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.Download>
      </div>
    </div>
  );
}

/**
 * Example 5: Custom Input with Advanced Styling
 */
export function CustomInputToolbarExample() {
  return (slots: ToolbarSlot) => (
    <div className="flex items-center gap-2 px-4 py-2 bg-card text-card-foreground border-b border-border">
      {/* Navigation */}
      <div className="flex items-center gap-1">
        <slots.GoToPreviousPage>
          {(props) => (
            <Button
              variant="outline"
              size="sm"
              onClick={props.onClick}
              disabled={props.isDisabled}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-3 w-3" />
            </Button>
          )}
        </slots.GoToPreviousPage>

        <slots.GoToNextPage>
          {(props) => (
            <Button
              variant="outline"
              size="sm"
              onClick={props.onClick}
              disabled={props.isDisabled}
              className="h-8 w-8 p-0"
            >
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </slots.GoToNextPage>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Custom Styled Page Input */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          Page
        </Badge>

        <slots.CurrentPageInput />

        <span className="text-muted-foreground">/</span>

        <slots.NumberOfPages>
          {(props) => (
            <Badge variant="secondary" className="font-mono text-xs">
              {props.numberOfPages}
            </Badge>
          )}
        </slots.NumberOfPages>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <slots.ShowSearchPopover>
          {(props) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={props.onClick}
              className="h-8 w-8 p-0"
            >
              <Search className="h-3 w-3" />
            </Button>
          )}
        </slots.ShowSearchPopover>
      </div>
    </div>
  );
}

/**
 * Example 6: Form-style Input with Validation
 */
export function FormInputToolbarExample() {
  return (slots: ToolbarSlot) => (
    <div className="flex items-center gap-4 px-4 py-3 bg-card text-card-foreground border-b border-border">
      {/* Navigation */}
      <div className="flex items-center gap-1">
        <slots.GoToPreviousPage>
          {(props) => (
            <Button
              variant="default"
              size="sm"
              onClick={props.onClick}
              disabled={props.isDisabled}
              className="h-9 px-3"
            >
              Previous
            </Button>
          )}
        </slots.GoToPreviousPage>

        <slots.GoToNextPage>
          {(props) => (
            <Button
              variant="default"
              size="sm"
              onClick={props.onClick}
              disabled={props.isDisabled}
              className="h-9 px-3"
            >
              Next
            </Button>
          )}
        </slots.GoToNextPage>
      </div>

      {/* Form-style Page Input */}
      <div className="flex items-center gap-3">
        <label htmlFor="page-input" className="text-sm font-medium">
          Page:
        </label>

        <slots.CurrentPageInput />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-auto">
        <slots.Download>
          {(props) => (
            <Button
              variant="outline"
              size="sm"
              onClick={props.onClick}
              className="h-9 px-3"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </slots.Download>
      </div>
    </div>
  );
}

// Export all examples for easy use
export const PDF_TOOLBAR_EXAMPLES = {
  navigation: NavigationToolbarExample,
  actions: ActionToolbarExample,
  themed: ThemedToolbarExample,
  minimal: MinimalToolbarExample,
  customInput: CustomInputToolbarExample,
  formInput: FormInputToolbarExample,
};

/* 
Usage Examples:

// 1. Navigation with custom icons and custom input
<Toolbar>
  {NavigationToolbarExample()}
</Toolbar>

// 2. Actions with fun icons and emojis
<Toolbar>
  {ActionToolbarExample()}
</Toolbar>

// 3. Themed toolbar with gradient background
<Toolbar>
  {ThemedToolbarExample()}
</Toolbar>

// 4. Minimal toolbar with outline buttons
<Toolbar>
  {MinimalToolbarExample()}
</Toolbar>

// 5. Custom styled input with gradient background
<Toolbar>
  {CustomInputToolbarExample()}
</Toolbar>

// 6. Form-style input with labels
<Toolbar>
  {FormInputToolbarExample()}
</Toolbar>

// 7. Use from the exported object
<Toolbar>
  {PDF_TOOLBAR_EXAMPLES.customInput()}
</Toolbar>

// 8. Simple custom input example
const MyCustomInput = () => {
  return (slots: ToolbarSlot) => (
    <div className="flex items-center gap-2 px-4 py-2">
      <slots.CurrentPageInput>
        {(props) => (
          <Input
            type="number"
            value={props.currentPage || 1}
            onChange={(e) => props.onChange?.(parseInt(e.target.value) - 1)}
            className="w-20 h-8 text-center my-custom-input"
            placeholder="Page"
          />
        )}
      </slots.CurrentPageInput>
    </div>
  );
};
*/ 