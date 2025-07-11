# PDF Renderer with Custom Toolbar

This directory contains a custom PDF renderer implementation using React PDF Viewer with a custom toolbar based on the toolbar slot pattern.

## Components

### `PdfRenderer`
The main PDF renderer component that displays PDFs with a custom toolbar.

**Props:**
- `fileUrl`: URL or path to the PDF file
- `title`: Optional title to display above the PDF
- `className`: Optional CSS classes
- `onError`: Error callback
- `onDocumentLoadSuccess`: Success callback with page count

### `CustomPdfToolbar`
A custom toolbar component that uses the React PDF Viewer toolbar slot pattern.

**Props:**
- `className`: Optional CSS classes to customize the toolbar appearance

## Usage

### Basic Usage

```tsx
import { PdfRenderer } from './components/pdf-renderer/pdf-renderer';

function App() {
  return (
    <div className="h-screen">
      <PdfRenderer
        fileUrl="/path/to/document.pdf"
        title="My Document"
        onDocumentLoadSuccess={(pages) => console.log(`Loaded ${pages} pages`)}
        onError={(error) => console.error('Failed to load PDF:', error)}
      />
    </div>
  );
}
```

### Custom Toolbar Usage

```tsx
import { toolbarPlugin } from '@react-pdf-viewer/toolbar';
import { CustomPdfToolbar } from './components/pdf-renderer/pdf-custom-toolbar';

const toolbarPluginInstance = toolbarPlugin();
const { Toolbar } = toolbarPluginInstance;

// Use the custom toolbar
<Toolbar>
  {CustomPdfToolbar({ className: 'my-custom-styles' })}
</Toolbar>
```

### Customizing Individual Toolbar Buttons

You can customize individual buttons using the slot render props:

```tsx
import { CustomPdfToolbar } from './components/pdf-renderer/pdf-custom-toolbar';

// Create a custom toolbar with some customized buttons
const MyCustomToolbar = ({ className }) => {
  return (slots) => {
    return (
      <div className={cn("flex items-center gap-2 px-4 py-2 bg-card", className)}>
        {/* Custom styled navigation */}
        <slots.GoToFirstPage>
          {(props) => (
            <button
              onClick={props.onClick}
              disabled={props.isDisabled}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              First
            </button>
          )}
        </slots.GoToFirstPage>
        
        <slots.GoToPreviousPage>
          {(props) => (
            <button
              onClick={props.onClick}
              disabled={props.isDisabled}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Previous
            </button>
          )}
        </slots.GoToPreviousPage>
        
        {/* Use default styles for other buttons */}
        <slots.GoToNextPage />
        <slots.GoToLastPage />
        
        {/* Page info */}
        <div className="flex items-center gap-2 ml-4">
          <slots.CurrentPageInput />
          <span>of</span>
          <slots.NumberOfPages />
        </div>
        
        {/* Zoom controls */}
        <div className="flex items-center gap-1 ml-4">
          <slots.ZoomOut />
          <slots.Zoom />
          <slots.ZoomIn />
        </div>
      </div>
    );
  };
};
```

## Custom Icons and Tooltips

Yes! You can easily pass custom icons and tooltips to the toolbar buttons. The `pdf-toolbar-examples.tsx` file contains multiple examples showing different approaches:

### Example 1: Custom Navigation Icons

```tsx
import { NavigationToolbarExample } from './pdf-toolbar-examples';

<Toolbar>
  {NavigationToolbarExample()}
</Toolbar>
```

This example shows:
- 🏠 Home icon for "Go to first page"
- ⬅️ MoveLeft icon for "Previous page"
- ➡️ MoveRight icon for "Next page"
- ⭐ Star icon for "Go to last page"
- Custom tooltips with emojis

### Example 2: Custom Action Icons

```tsx
import { ActionToolbarExample } from './pdf-toolbar-examples';

<Toolbar>
  {ActionToolbarExample()}
</Toolbar>
```

This example shows:
- 👁️ Eye icon for "Search"
- 💾 FileDown icon for "Download"
- 🖨️ FileText icon for "Print"
- 🖥️ Expand icon for "Fullscreen"

### Example 3: Themed Toolbar

```tsx
import { ThemedToolbarExample } from './pdf-toolbar-examples';

<Toolbar>
  {ThemedToolbarExample()}
</Toolbar>
```

Features:
- Purple gradient background
- Rounded buttons with custom hover effects
- Colored separators and badges
- Custom tooltip styling

### Example 4: Minimal Toolbar

```tsx
import { MinimalToolbarExample } from './pdf-toolbar-examples';

<Toolbar>
  {MinimalToolbarExample()}
</Toolbar>
```

Features:
- Clean layout with outline buttons
- Smaller icons (h-3 w-3)
- Positioned layout (left, center, right)
- Minimal tooltip styling

### Using the Examples

You can use any of the pre-built examples:

```tsx
import { PDF_TOOLBAR_EXAMPLES } from './pdf-toolbar-examples';

// Use different examples
<Toolbar>{PDF_TOOLBAR_EXAMPLES.navigation()}</Toolbar>
<Toolbar>{PDF_TOOLBAR_EXAMPLES.actions()}</Toolbar>
<Toolbar>{PDF_TOOLBAR_EXAMPLES.themed()}</Toolbar>
<Toolbar>{PDF_TOOLBAR_EXAMPLES.minimal()}</Toolbar>
```

### Creating Your Own Custom Icons

```tsx
import { Heart, Coffee, Zap } from 'lucide-react';

const MyCustomToolbar = () => {
  return (slots: ToolbarSlot) => (
    <div className="flex items-center gap-2 px-4 py-2 bg-card">
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
                  className="h-8 w-8 p-0"
                >
                  <Heart className="h-4 w-4 text-red-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>❤️ Go to favorite page</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </slots.GoToFirstPage>
      
      <slots.ShowSearchPopover>
        {(props) => (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={props.onClick}
                  className="h-8 w-8 p-0"
                >
                  <Zap className="h-4 w-4 text-yellow-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>⚡ Quick search</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </slots.ShowSearchPopover>
    </div>
  );
};
```

### Tooltip Customization

You can customize tooltips in several ways:

```tsx
// Different positions
<TooltipContent side="bottom">
<TooltipContent side="top">
<TooltipContent side="left">
<TooltipContent side="right">

// Custom styling
<TooltipContent className="bg-purple-500 text-white">
<TooltipContent className="bg-gradient-to-r from-blue-500 to-purple-500">

// With HTML content
<TooltipContent>
  <div className="text-center">
    <p className="font-bold">Download PDF</p>
    <p className="text-xs opacity-75">Ctrl+S</p>
  </div>
</TooltipContent>
```

### Icon Libraries

You can use any icon library:

```tsx
// Lucide React (recommended)
import { Download, Search, Print } from 'lucide-react';

// React Icons
import { FaDownload, FaSearch, FaPrint } from 'react-icons/fa';

// Heroicons
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

// Custom SVG
const CustomIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24">
    <path d="..." />
  </svg>
);
```

## Available Toolbar Slots

The following slots are available for customization:

### Navigation
- `GoToFirstPage` - Navigate to first page
- `GoToPreviousPage` - Navigate to previous page  
- `GoToNextPage` - Navigate to next page
- `GoToLastPage` - Navigate to last page

### Page Information
- `CurrentPageInput` - Input field for current page number
- `CurrentPageLabel` - Label showing current page number
- `NumberOfPages` - Total number of pages

### Zoom Controls
- `ZoomOut` - Zoom out button
- `Zoom` - Current zoom level display/button
- `ZoomIn` - Zoom in button
- `CurrentScale` - Current scale level

### Document Actions
- `Download` - Download the PDF
- `Print` - Print the PDF
- `ShowSearchPopover` - Show search interface
- `EnterFullScreen` - Enter fullscreen mode

### Layout Controls
- `SwitchScrollMode` - Switch between scroll modes
- `SwitchSelectionMode` - Switch selection mode
- `SwitchTheme` - Switch between light/dark theme

### Advanced
- `Open` - Open file dialog
- `ShowProperties` - Show document properties
- `Rotate` - Rotate document
- `RotateBackwardMenuItem` - Rotate counterclockwise
- `RotateForwardMenuItem` - Rotate clockwise

## Styling

The custom toolbar uses your application's design system through CSS classes. You can customize the appearance by:

1. **CSS Classes**: Pass custom classes via the `className` prop
2. **CSS Variables**: Override CSS custom properties for React PDF Viewer
3. **Tailwind Classes**: Use Tailwind utility classes for quick styling
4. **Render Props**: Use render props on individual slots for complete control

### CSS Custom Properties

The PDF renderer supports theme-aware styling through CSS custom properties:

```css
.pdf-viewer-container {
  --rpv-color-primary: hsl(var(--primary));
  --rpv-color-background: hsl(var(--background));
  --rpv-color-border: hsl(var(--border));
  /* ... more variables */
}
```

## TypeScript Support

All components are fully typed with TypeScript. The main types are:

- `PdfRendererProps` - Props for the main renderer
- `CustomToolbarProps` - Props for the custom toolbar
- `ToolbarSlot` - Available toolbar slots from React PDF Viewer

## Examples

Check out the React PDF Viewer documentation for more examples:
- [Toolbar slot examples](https://react-pdf-viewer.dev/examples/toolbar-slot/)
- [Custom toolbar examples](https://react-pdf-viewer.dev/examples/create-a-custom-toolbar/)

## Dependencies

This implementation requires:
- `@react-pdf-viewer/core`
- `@react-pdf-viewer/default-layout`
- `@react-pdf-viewer/toolbar`
- `@react-pdf-viewer/zoom`
- `@react-pdf-viewer/search`
- `@react-pdf-viewer/rotate`
- Your UI component library (Button, Input, etc.) 