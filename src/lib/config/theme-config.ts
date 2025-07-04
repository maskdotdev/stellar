import { Monitor, Moon, Sun, Sparkles, Zap, Star, Flower, Circle } from "lucide-react"

// Base theme type definition
export type BaseTheme = 
  | "system" 
  | "default" 
  | "stellar" 
  | "rose" 
  | "solar-flare" 
  | "space" 
  | "aurora" 
  | "starfield" 
  | "cosmos" 
  | "nebula" 
  | "starry-night" 
  | "infinity" 
  | "pluto" 
  | "t3-chat"
  | "catppuccin"

// Full theme type including all variants
export type Theme = BaseTheme | 
  "light" | "dark" | 
  "light-teal" | "dark-teal" | 
  "dark-rose" | 
  "dark-solar-flare" | 
  "light-space" | 
  "light-aurora" | 
  "light-starfield" | 
  "dark-cosmos" | 
  "dark-nebula" | 
  "dark-starry-night" | 
  "dark-infinity" | 
  "dark-pluto" | 
  "dark-t3-chat" |
  "catppuccin" |
  "dark-catppuccin"

// Theme definition interface
export interface ThemeDefinition {
  name: BaseTheme
  label: string
  icon: any
  activeColor: string
  description: string
  variants: {
    light: string
    dark: string
  }
  // Themes that default to dark mode when no preference is set
  defaultsDark?: boolean
}

// Centralized theme configuration
export const THEME_CONFIG: Record<BaseTheme, ThemeDefinition> = {
  system: {
    name: "system",
    label: "System",
    icon: Monitor,
    activeColor: "oklch(0.554 0.046 257.417)",
    description: "Follow system preference",
    variants: {
      light: "light",
      dark: "dark"
    }
  },
  stellar: {
    name: "stellar",
    label: "Stellar",
    icon: Star,
    activeColor: "oklch(0.65 0.15 195)",
    description: "Default stellar theme",
    variants: {
      light: "light-teal",
      dark: "dark-teal"
    }
  },
  default: {
    name: "default",
    label: "Dead Space",
    icon: Moon,
    activeColor: "oklch(0.208 0.042 265.755)",
    description: "Classic dead space theme",
    variants: {
      light: "light",
      dark: "dark"
    }
  },
  "solar-flare": {
    name: "solar-flare",
    label: "Solar Flare",
    icon: Sun,
    activeColor: "oklch(0.85 0.15 60)",
    description: "Intense solar flare energy",
    variants: {
      light: "solar-flare",
      dark: "dark-solar-flare"
    }
  },
  rose: {
    name: "rose",
    label: "Supernova",
    icon: Sparkles,
    activeColor: "oklch(0.6 0.2 10)",
    description: "Explosive supernova energy",
    variants: {
      light: "rose",
      dark: "dark-rose"
    }
  },
  space: {
    name: "space",
    label: "Deep Space",
    icon: Moon,
    activeColor: "oklch(0.65 0.25 285)",
    description: "Dark cosmic space",
    variants: {
      light: "light-space",
      dark: "space"
    },
    defaultsDark: true
  },
  aurora: {
    name: "aurora",
    label: "Aurora",
    icon: Zap,
    activeColor: "oklch(0.78 0.15 85)",
    description: "Electric aurora borealis",
    variants: {
      light: "light-aurora",
      dark: "aurora"
    },
    defaultsDark: true
  },
  starfield: {
    name: "starfield",
    label: "Starfield",
    icon: Star,
    activeColor: "oklch(0.7874 0.1179 295.7538)",
    description: "Brilliant starfield",
    variants: {
      light: "light-starfield",
      dark: "starfield"
    },
    defaultsDark: true
  },
  cosmos: {
    name: "cosmos",
    label: "Cosmos",
    icon: Sparkles,
    activeColor: "oklch(0.5417 0.179 288.0332)",
    description: "Cosmic wonder",
    variants: {
      light: "cosmos",
      dark: "dark-cosmos"
    }
  },
  nebula: {
    name: "nebula",
    label: "Nebula",
    icon: Flower,
    activeColor: "oklch(0.6726 0.2904 341.4084)",
    description: "Colorful cosmic nebula",
    variants: {
      light: "nebula",
      dark: "dark-nebula"
    }
  },
  "starry-night": {
    name: "starry-night",
    label: "Starry Night",
    icon: Moon,
    activeColor: "oklch(0.4815 0.1178 263.3758)",
    description: "Van Gogh inspired starry night",
    variants: {
      light: "starry-night",
      dark: "dark-starry-night"
    }
  },
  infinity: {
    name: "infinity",
    label: "Infinity",
    icon: Zap,
    activeColor: "oklch(0.5624 0.0947 203.2755)",
    description: "Infinite possibilities",
    variants: {
      light: "infinity",
      dark: "dark-infinity"
    }
  },
  pluto: {
    name: "pluto",
    label: "Pluto",
    icon: Circle,
    activeColor: "oklch(0.6489 0.237 26.9728)",
    description: "High-contrast dwarf planet",
    variants: {
      light: "pluto",
      dark: "dark-pluto"
    }
  },
  "t3-chat": {
    name: "t3-chat",
    label: "T3 Chat",
    icon: Circle,
    activeColor: "oklch(0.9754 0.0084 325.6414)",
    description: "T3 Chat theme",
    variants: {
      light: "t3-chat",
      dark: "dark-t3-chat"
    }
  },
  catppuccin: {
    name: "catppuccin",
    label: "Catppuccin",
    icon: Circle,
    activeColor: "oklch(0.7871 0.1187 304.7693)",
    description: "Catppuccin theme",
    variants: {
      light: "catppuccin",
      dark: "dark-catppuccin"
    }
  }
}

// Export themes array for compatibility
export const themes = Object.values(THEME_CONFIG)

// Utility functions for theme management
export class ThemeManager {
  /**
   * Extract base theme name from a full theme string
   */
  static getBaseTheme(fullTheme: string): BaseTheme {
    if (!fullTheme) return "stellar"
    
    // Handle dark variants
    if (fullTheme.startsWith("dark-")) {
      const baseName = fullTheme.slice(5) as BaseTheme
      return THEME_CONFIG[baseName] ? baseName : "stellar"
    }
    
    // Handle light variants  
    if (fullTheme.startsWith("light-")) {
      const baseName = fullTheme.slice(6) as BaseTheme
      return THEME_CONFIG[baseName] ? baseName : "stellar"
    }
    
    // Handle special cases
    if (fullTheme === "light") return "default"
    if (fullTheme === "dark") return "default"
    if (fullTheme === "light-teal") return "stellar"
    if (fullTheme === "dark-teal") return "stellar"
    
    // Return base theme if it exists
    return THEME_CONFIG[fullTheme as BaseTheme] ? (fullTheme as BaseTheme) : "stellar"
  }

  /**
   * Check if a theme is currently in dark mode
   */
  static isDarkTheme(fullTheme: string): boolean {
    if (!fullTheme) return false
    
    // Explicit dark variants
    if (fullTheme.startsWith("dark-") || fullTheme === "dark") {
      return true
    }
    
    // System theme follows system preference
    if (fullTheme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
    }
    
    // Check if theme defaults to dark
    const baseTheme = this.getBaseTheme(fullTheme)
    const config = THEME_CONFIG[baseTheme]
    
    // If it's a theme that defaults to dark and no explicit light variant
    if (config?.defaultsDark && !fullTheme.startsWith("light-")) {
      return ["space", "aurora", "starfield"].includes(fullTheme)
    }
    
    return false
  }

  /**
   * Get the appropriate theme variant based on dark mode preference
   */
  static getThemeVariant(baseTheme: BaseTheme, isDark: boolean): string {
    // Handle system theme
    if (baseTheme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    }

    const config = THEME_CONFIG[baseTheme]
    if (!config) {
      return isDark ? "dark" : "light"
    }

    return isDark ? config.variants.dark : config.variants.light
  }

  /**
   * Toggle between light and dark variants of current theme
   */
  static toggleDarkMode(currentTheme: string, setTheme: (theme: Theme) => void): void {
    const baseTheme = this.getBaseTheme(currentTheme)
    const currentIsDark = this.isDarkTheme(currentTheme)
    
    if (baseTheme === "system") {
      // For system theme, toggle to explicit light or dark
      const systemIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setTheme(systemIsDark ? "light" : "dark")
      return
    }
    
    const newVariant = this.getThemeVariant(baseTheme, !currentIsDark)
    setTheme(newVariant as Theme)
  }

  /**
   * Set specific dark mode state for current theme
   */
  static setDarkModeState(currentTheme: string, setTheme: (theme: Theme) => void, wantsDarkMode: boolean): void {
    const baseTheme = this.getBaseTheme(currentTheme)
    
    if (baseTheme === "system") {
      // Keep system theme as is
      return
    }
    
    const newVariant = this.getThemeVariant(baseTheme, wantsDarkMode)
    setTheme(newVariant as Theme)
  }

  /**
   * Apply theme to current base theme with dark mode preference
   */
  static applyThemeWithPreference(newBaseTheme: BaseTheme, currentTheme: string, setTheme: (theme: Theme) => void): void {
    if (newBaseTheme === "system") {
      setTheme("system")
      return
    }
    
    // Preserve current dark mode preference
    const currentIsDark = this.isDarkTheme(currentTheme)
    const newVariant = this.getThemeVariant(newBaseTheme, currentIsDark)
    setTheme(newVariant as Theme)
  }

  /**
   * Get all theme classes for CSS cleanup
   */
  static getAllThemeClasses(): string[] {
    const classes: string[] = []
    
    Object.values(THEME_CONFIG).forEach(config => {
      classes.push(config.variants.light, config.variants.dark)
    })
    
    return [...new Set(classes)] // Remove duplicates
  }

  /**
   * Get theme configuration by base name
   */
  static getThemeConfig(baseTheme: BaseTheme): ThemeDefinition | undefined {
    return THEME_CONFIG[baseTheme]
  }

  /**
   * Get current theme display information
   */
  static getThemeDisplayInfo(currentTheme: string): { baseTheme: BaseTheme; config: ThemeDefinition; isDark: boolean } {
    const baseTheme = this.getBaseTheme(currentTheme)
    const config = THEME_CONFIG[baseTheme]
    const isDark = this.isDarkTheme(currentTheme)
    
    return { baseTheme, config, isDark }
  }
}

// Export individual functions for backwards compatibility
export const getBaseTheme = (fullTheme: string) => ThemeManager.getBaseTheme(fullTheme)
export const isDarkTheme = (fullTheme: string) => ThemeManager.isDarkTheme(fullTheme)
export const toggleDarkMode = (currentTheme: string, setTheme: (theme: Theme) => void) => ThemeManager.toggleDarkMode(currentTheme, setTheme)
export const setDarkModeState = (currentTheme: string, setTheme: (theme: Theme) => void, wantsDarkMode: boolean) => ThemeManager.setDarkModeState(currentTheme, setTheme, wantsDarkMode) 