# Centralized Theme System

The theme system has been refactored into a centralized configuration that makes it easy to add, modify, and maintain themes.

## Core Files

- `src/lib/theme-config.ts` - **Main configuration file** containing all theme definitions and utilities
- `src/styles/themes.css` - CSS variable definitions for each theme
- `src/components/theme-provider.tsx` - React context provider for theme state
- `src/components/theme-switcher.tsx` - UI component for switching themes

## Key Features

✅ **Centralized Configuration** - All theme data in one place  
✅ **Type Safety** - Full TypeScript support with proper types  
✅ **Automatic Light/Dark Variants** - Each theme has both light and dark modes  
✅ **Easy Theme Management** - Simple utilities for theme operations  
✅ **No Code Duplication** - Theme mappings defined once, used everywhere  

## How to Add a New Theme

1. **Add the theme to the configuration** in `src/lib/theme-config.ts`:

```typescript
// Add to BaseTheme type
export type BaseTheme = 
  | "system" 
  | "stellar"
  | "my-new-theme" // Add here
  // ... other themes

// Add to THEME_CONFIG
export const THEME_CONFIG: Record<BaseTheme, ThemeDefinition> = {
  // ... existing themes
  "my-new-theme": {
    name: "my-new-theme",
    label: "My New Theme",
    icon: Star, // Import your icon
    activeColor: "oklch(0.65 0.15 195)",
    description: "My awesome new theme",
    variants: {
      light: "my-new-theme-light",
      dark: "my-new-theme-dark"
    }
  }
}
```

2. **Add CSS classes** in `src/styles/themes.css`:

```css
/* My New Theme Light */
.my-new-theme-light {
  --background: oklch(0.98 0.01 10);
  --foreground: oklch(0.15 0.08 10);
  /* ... other CSS variables */
}

/* My New Theme Dark */
.my-new-theme-dark {
  --background: oklch(0.15 0.014 235);
  --foreground: oklch(0.95 0.04 195);
  /* ... other CSS variables */
}
```

3. **That's it!** The theme will automatically appear in:
   - Theme switcher dropdown
   - Command palette
   - Settings panel
   - All theme utilities will work automatically

## Using Theme Utilities

### Basic Theme Operations

```typescript
import { ThemeManager } from '@/lib/theme-config'

// Get base theme name from full theme
const baseTheme = ThemeManager.getBaseTheme("dark-teal") // Returns "stellar"

// Check if theme is dark
const isDark = ThemeManager.isDarkTheme("dark-teal") // Returns true

// Toggle between light/dark variants
ThemeManager.toggleDarkMode(currentTheme, setTheme)

// Set specific dark mode state
ThemeManager.setDarkModeState(currentTheme, setTheme, true)

// Apply theme with current preference
ThemeManager.applyThemeWithPreference("stellar", currentTheme, setTheme)
```

### Theme Information

```typescript
// Get complete theme information
const { baseTheme, config, isDark } = ThemeManager.getThemeDisplayInfo(currentTheme)

// Get theme configuration
const config = ThemeManager.getThemeConfig("stellar")
console.log(config.label) // "Stellar"
console.log(config.variants.dark) // "dark-teal"
```

## Migration from Old System

The old theme system has been completely replaced. If you have any custom code using the old theme utilities, update them:

```typescript
// OLD ❌
import { getBaseTheme, isDarkTheme, toggleDarkMode } from '@/lib/utils'

// NEW ✅  
import { ThemeManager } from '@/lib/theme-config'
ThemeManager.getBaseTheme(theme)
ThemeManager.isDarkTheme(theme)
ThemeManager.toggleDarkMode(theme, setTheme)
```

## Theme Structure

Each theme consists of:

- **Base name** - The theme identifier (e.g., "stellar")
- **Label** - Display name shown in UI (e.g., "Stellar")
- **Icon** - Lucide React icon component
- **Active color** - Color used for theme indicators
- **Description** - Brief description shown in UI
- **Variants** - Light and dark CSS class names
- **defaultsDark** (optional) - Whether theme defaults to dark mode

## Best Practices

1. **Use ThemeManager utilities** instead of custom theme logic
2. **Follow naming conventions** - use kebab-case for theme names
3. **Test both variants** - ensure your theme works in light and dark modes
4. **Use consistent colors** - follow the OKLCH color system used throughout
5. **Update CSS variables** - don't hardcode colors in components

## CSS Variable Reference

Key CSS variables used in themes:

- `--background` / `--foreground` - Main background and text colors
- `--card` / `--card-foreground` - Card backgrounds
- `--primary` / `--primary-foreground` - Primary accent colors
- `--secondary` / `--secondary-foreground` - Secondary colors
- `--muted` / `--muted-foreground` - Muted backgrounds and text
- `--accent` / `--accent-foreground` - Accent highlights
- `--border` / `--input` / `--ring` - UI element colors
- `--destructive` - Error/danger colors
- `--sidebar-*` - Sidebar specific colors

## Troubleshooting

**Theme not appearing?**
- Check that CSS classes exist in `themes.css`
- Verify theme is added to `THEME_CONFIG`
- Ensure TypeScript types are updated

**Toggle not working?**
- Verify both light and dark variants exist
- Check theme mapping in `THEME_CONFIG.variants`
- Test with `ThemeManager.getThemeDisplayInfo()`

**Styling issues?**
- Check CSS variable definitions
- Ensure OKLCH color format is used
- Test in both light and dark modes 