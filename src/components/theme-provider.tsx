import * as React from "react"

type Theme = "system" | "default" | "teal" | "rose" | "solar-flare" | "space" | "aurora" | "starfield" | "cosmos" | "nebula" | "starry-night" | "infinity" | "pluto" | 
  // Theme variants
  "light" | "dark" | "light-teal" | "dark-teal" | "dark-rose" | "solar-flare" | "dark-solar-flare" | 
  "light-space" | "light-aurora" | "light-starfield" | "dark-cosmos" | "dark-nebula" | "dark-starry-night" | "dark-infinity" | "dark-pluto"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState)

// Map base themes to their light/dark variants
const getThemeVariant = (baseTheme: string, isDark: boolean): string => {
  // Handle system theme
  if (baseTheme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }

  // Themes with both light and dark variants
  const themedVariants: Record<string, { light: string; dark: string }> = {
    default: { light: "light", dark: "dark" },
    teal: { light: "light-teal", dark: "dark-teal" },
    rose: { light: "rose", dark: "dark-rose" },
    "solar-flare": { light: "solar-flare", dark: "dark-solar-flare" },
    space: { light: "light-space", dark: "space" },
    aurora: { light: "light-aurora", dark: "aurora" },
    starfield: { light: "light-starfield", dark: "starfield" },
    cosmos: { light: "cosmos", dark: "dark-cosmos" },
    nebula: { light: "nebula", dark: "dark-nebula" },
    "starry-night": { light: "starry-night", dark: "dark-starry-night" },
    infinity: { light: "infinity", dark: "dark-infinity" },
    pluto: { light: "pluto", dark: "dark-pluto" }
  }

  // If theme has variants, return appropriate one
  if (themedVariants[baseTheme]) {
    return isDark ? themedVariants[baseTheme].dark : themedVariants[baseTheme].light
  }

  // Fallback to base theme
  return baseTheme
}

// Extract base theme name from full theme name
const getBaseTheme = (fullTheme: string): string => {
  // Handle dark variants
  if (fullTheme.startsWith("dark-")) {
    return fullTheme.slice(5)
  }
  
  // Handle light variants
  if (fullTheme.startsWith("light-")) {
    return fullTheme.slice(6)
  }
  
  // Handle specific mappings
  const themeMapping: Record<string, string> = {
    "light": "default",
    "dark": "default"
  }
  
  return themeMapping[fullTheme] || fullTheme
}

export function ThemeProvider({
  children,
  defaultTheme = "teal",
  storageKey = "stellar-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  React.useEffect(() => {
    const root = window.document.documentElement

    // Remove all possible theme classes
    const allThemeClasses = [
      "light", "dark", "dark-teal", "light-teal", "rose", "dark-rose",
      "solar-flare", "dark-solar-flare", "space", "light-space", "aurora", "light-aurora", 
      "starfield", "light-starfield", "cosmos", "dark-cosmos", "nebula", "dark-nebula", 
      "starry-night", "dark-starry-night", "infinity", "dark-infinity", "pluto", "dark-pluto"
    ]
    root.classList.remove(...allThemeClasses)

    let actualTheme = theme

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      actualTheme = systemTheme as Theme
    }

    root.classList.add(actualTheme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
} 