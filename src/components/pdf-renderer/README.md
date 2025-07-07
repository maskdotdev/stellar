# PDF Renderer Component

A theme-aware PDF renderer component built on top of React PDF Viewer that seamlessly integrates with the application's comprehensive theming system from `themes.css`.

## Features

- 🎨 **Full Theme Integration**: Automatically adapts to all themes from `themes.css` including stellar, space, aurora, pluto, and more
- 🌟 **Theme-Specific Enhancements**: Each theme category gets unique styling (cosmic glow, stellar effects, minimal styling, etc.)
- 🔍 **Search Functionality**: Built-in text search with highlighting that matches your theme
- 🔄 **Zoom Controls**: Theme-aware zoom controls with consistent styling
- 📱 **Responsive Design**: Mobile-friendly with adaptive layouts and theme-aware breakpoints
- 📄 **Page Navigation**: Navigate through pages with themed thumbnails and controls
- 🔄 **Rotation**: Rotate pages with theme-consistent controls
- ⚡ **Loading States**: Beautiful loading indicators that match your active theme
- ♿ **Accessibility**: Focus management and keyboard navigation with theme-aware focus rings
- 🎭 **Dynamic Theme Detection**: Automatically detects and adapts to theme changes in real-time

## Theme Integration System

### Comprehensive Theme Support

The PDF renderer supports all themes from your `themes.css`:

**Cosmic Themes** (with special glow effects):
- `space` - Deep cosmic background with purple glow
- `starfield` - Stellar background with electric glow
- `aurora` - Electric aurora effects
- `cosmos` / `dark-cosmos` - Cosmic purple with enhanced shadows
- `nebula` / `dark-nebula` - Nebular effects with colorful highlights

**Stellar Themes** (with cyan/teal styling):
- `stellar` / `light-teal` - Clean cyan accent with subtle glow
- `dark-teal` - Dark variant with enhanced contrast

**Artistic Themes** (with unique aesthetic touches):
- `starry-night` / `dark-starry-night` - Van Gogh inspired styling
- `solar-flare` / `dark-solar-flare` - Warm solar color schemes

**Minimal Themes** (clean and reduced styling):
- `pluto` / `dark-pluto` - Stark shadows with no radius
- `infinity` / `dark-infinity` - Ultra-clean monospace styling

**Colorful Themes** (vibrant and expressive):
- `catppuccin` / `dark-catppuccin` - Pastel color scheme
- `rose` - Warm rose tones
- `t3-chat` / `dark-t3-chat` - Modern chat-inspired colors

### Theme Utilities

The PDF renderer comes with a comprehensive theme utility system that you can use in other components:

```tsx
import { 
  useThemeIntegration, 
  useThemeDetection, 
  getThemeCategory, 
  createThemeStyle 
} from '@/components/pdf-renderer';

// Full theme integration hook
function MyComponent() {
  const { 
    theme,           // Current theme name
    category,        // Theme category (cosmic, stellar, minimal, etc.)
    isDark,          // Whether current theme is dark
    variables,       // CSS variables object
    shadows,         // Theme-specific shadow styles
    animations,      // Theme-specific animation settings
    getClasses,      // Function to get theme classes
    createStyle      // Function to create theme-aware styles
  } = useThemeIntegration('my-component');

  return (
    <div 
      className={cn(...getClasses(['base-class']))}
      style={createStyle({ customProperty: 'value' })}
    >
      Content styled with current theme
    </div>
  );
}
```

## Installation

The component requires the following React PDF Viewer packages (already included in the project):

```bash
npm install @react-pdf-viewer/core @react-pdf-viewer/default-layout @react-pdf-viewer/search @react-pdf-viewer/rotate @react-pdf-viewer/zoom @react-pdf-viewer/toolbar
```

## Usage

### Basic Usage with Automatic Theme Integration

```tsx
import { PdfRenderer } from '@/components/pdf-renderer';

function MyComponent() {
  return (
    <div className="h-96">
      <PdfRenderer
        fileUrl="https://example.com/document.pdf"
        title="My Document"
      />
    </div>
  );
}
```

The component automatically:
- Detects the current theme from `document.documentElement.classList`
- Applies theme-specific styling and effects
- Updates in real-time when themes change
- Uses appropriate colors, shadows, and animations for the active theme

### Advanced Usage with Theme Integration

```tsx
import { PdfRenderer, useThemeIntegration } from '@/components/pdf-renderer';
import { useToast } from '@/hooks/use-toast';

function MyComponent() {
  const { toast } = useToast();
  const { theme, category, isDark } = useThemeIntegration();

  const handleError = (error: Error) => {
    toast({
      title: "PDF Error",
      description: error.message,
      variant: "destructive",
    });
  };

  const handleLoadSuccess = (numPages: number) => {
    console.log(`PDF loaded with ${numPages} pages in ${theme} theme (${category})`);
  };

  return (
    <div className="h-screen">
      <PdfRenderer
        fileUrl="/documents/sample.pdf"
        title={`Sample Document - ${theme} theme`}
        onError={handleError}
        onDocumentLoadSuccess={handleLoadSuccess}
        className={cn(
          "border rounded-lg",
          // Add conditional styling based on theme category
          category === 'cosmic' && "shadow-xl",
          category === 'minimal' && "border-2",
        )}
      />
    </div>
  );
}
```

### Using Theme Utilities in Other Components

```tsx
import { createThemeStyle, getThemeClasses, useThemeDetection } from '@/components/pdf-renderer';

function ThemedCard() {
  const currentTheme = useThemeDetection();
  
  return (
    <div
      className={cn(...getThemeClasses(currentTheme, ['card', 'p-4']))}
      style={createThemeStyle(currentTheme, {
        '--custom-glow': '0 0 20px hsl(var(--primary)/0.3)',
      })}
    >
      This card adapts to the current theme automatically!
    </div>
  );
}
```

## Props

### PdfRendererProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `fileUrl` | `string` | Yes | URL or path to the PDF file |
| `title` | `string` | No | Title to display in the header |
| `className` | `string` | No | Additional CSS classes |
| `onError` | `(error: Error) => void` | No | Error callback |
| `onDocumentLoadSuccess` | `(numPages: number) => void` | No | Success callback |

## Advanced Theming Features

### Theme-Specific Enhancements

Different theme categories get unique visual enhancements:

**Cosmic Themes:**
- Glowing effects around PDF pages
- Enhanced shadows with color bleeding
- Smooth floating animations
- Starfield-inspired backgrounds

**Stellar Themes:**
- Subtle cyan glow effects
- Clean, professional styling
- Teal accent colors throughout

**Minimal Themes:**
- Reduced visual effects for clarity
- Clean, geometric shadows (especially for Pluto theme)
- Monospace typography integration

**Artistic Themes:**
- Unique color combinations
- Enhanced visual flair
- Theme-specific shadow patterns

### CSS Custom Properties

The PDF renderer automatically maps your theme variables to PDF-viewer-specific properties:

```css
/* Automatically applied based on current theme */
.pdf-viewer-container {
  --rpv-color-primary: hsl(var(--primary));
  --rpv-color-background: hsl(var(--background));
  --rpv-border-radius: var(--radius);
  --rpv-font-family: var(--font-sans);
  --rpv-shadow-sm: var(--shadow-sm);
  /* ... and many more */
}
```

### Theme Categories and Behavior

```tsx
// Theme categories automatically detected
const THEME_CATEGORIES = {
  cosmic: ['space', 'starfield', 'aurora', 'cosmos', 'dark-cosmos', 'nebula', 'dark-nebula'],
  stellar: ['stellar', 'light-teal', 'dark-teal'],
  artistic: ['starry-night', 'dark-starry-night', 'solar-flare', 'dark-solar-flare'],
  minimal: ['pluto', 'dark-pluto', 'infinity', 'dark-infinity'],
  colorful: ['catppuccin', 'dark-catppuccin', 'rose', 't3-chat', 'dark-t3-chat'],
};
```

### Real-time Theme Detection

The component uses a `MutationObserver` to detect theme changes in real-time:

```tsx
// Automatically detects when you change themes
document.documentElement.classList.add('dark-space'); // Detected instantly
document.documentElement.classList.remove('stellar'); // Updates immediately
```

## Responsive Behavior

The component includes theme-aware responsive design:

- **Desktop**: Full toolbar with theme-appropriate styling
- **Tablet**: Condensed toolbar maintaining theme consistency
- **Mobile**: Collapsible sidebar with enhanced backdrop blur and theme colors

## Performance Optimizations

### Theme-Based Optimizations

- **Mobile**: Reduced shadows and animations for better performance
- **Cosmic themes**: GPU-accelerated glow effects
- **Minimal themes**: Simplified rendering pipeline
- **Reduced motion**: Respects `prefers-reduced-motion` setting

### Memory Management

- Automatic cleanup of theme observers
- Efficient CSS variable management
- Optimized re-renders based on theme changes

## Accessibility

Theme-aware accessibility features:

- **High Contrast**: Enhanced borders and outlines for supported themes
- **Focus Management**: Theme-consistent focus rings using `--ring` color
- **Screen Readers**: Proper ARIA labels with theme context
- **Keyboard Navigation**: Theme-appropriate visual feedback

## Browser Support

- Chrome 60+ (full theme support)
- Firefox 60+ (full theme support)
- Safari 12+ (partial CSS custom property support)
- Edge 79+ (full theme support)

## Performance Tips

1. **Theme Switching**: Use CSS transitions for smooth theme changes
2. **Large PDFs**: Cosmic themes may impact performance on very large documents
3. **Mobile**: Minimal themes perform best on mobile devices
4. **Custom Themes**: Follow the established CSS custom property patterns

## Troubleshooting

### Theme Not Applying

1. Ensure theme class is applied to `document.documentElement`
2. Check that CSS custom properties are defined in your theme
3. Verify theme name matches those in `THEME_CLASSES`

### Performance Issues

1. Try switching to a minimal theme for large PDFs
2. Disable animations with `prefers-reduced-motion`
3. Check console for theme detection errors

### Styling Conflicts

1. Ensure CSS specificity is correct for overrides
2. Use theme utilities instead of hard-coded values
3. Check that theme variables are properly scoped

## Examples

### Theme-Aware Loading States

```tsx
function ThemedLoader() {
  const { shadows, animations } = useThemeIntegration();
  
  return (
    <div 
      className="animate-spin rounded-full border-2 border-muted border-t-primary"
      style={{
        boxShadow: shadows.small,
        animationDuration: animations.duration,
        animationTimingFunction: animations.easing,
      }}
    />
  );
}
```

### Dynamic Theme Switching

```tsx
function ThemeSwitcher() {
  const { theme } = useThemeIntegration();
  
  const switchTheme = (newTheme: string) => {
    document.documentElement.className = newTheme;
  };
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={() => switchTheme('space')}>Space Theme</button>
      <button onClick={() => switchTheme('stellar')}>Stellar Theme</button>
    </div>
  );
}
```

See the `PdfRendererDemo` component for complete working examples including theme integration, error handling, and responsive behavior.

## Contributing

When contributing to the PDF renderer or theme system:

1. Test across all theme categories
2. Maintain backward compatibility with existing themes
3. Follow accessibility guidelines for new themes
4. Update theme utilities when adding new theme variables
5. Test performance impact of visual enhancements 