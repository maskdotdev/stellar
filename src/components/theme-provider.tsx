import * as React from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { Theme, ThemeManager } from "@/lib/config/theme-config"

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

function parseCssColorToRgba(color: string): [number, number, number, number] | null {
  const normalized = color.trim()

  const rgbaMatch = normalized.match(/^rgba?\(([^)]+)\)$/i)
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(/[\s,\/]+/).filter(Boolean)
    if (parts.length < 3) return null

    const red = Math.round(Number(parts[0]))
    const green = Math.round(Number(parts[1]))
    const blue = Math.round(Number(parts[2]))
    const alpha = parts[3] !== undefined ? Math.round(Number(parts[3]) * 255) : 255

    if ([red, green, blue, alpha].some(Number.isNaN)) return null
    return [red, green, blue, alpha]
  }

  const hexMatch = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
  if (hexMatch) {
    let hex = hexMatch[1]
    if (hex.length === 3) {
      hex = hex.split("").map((ch) => `${ch}${ch}`).join("")
    }
    if (hex.length === 6) hex = `${hex}ff`

    const red = Number.parseInt(hex.slice(0, 2), 16)
    const green = Number.parseInt(hex.slice(2, 4), 16)
    const blue = Number.parseInt(hex.slice(4, 6), 16)
    const alpha = Number.parseInt(hex.slice(6, 8), 16)

    return [red, green, blue, alpha]
  }

  return null
}

function normalizeCssColor(color: string): string {
  const canvas = window.document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) return color

  context.fillStyle = "#000000"
  context.fillStyle = color
  return context.fillStyle
}

function getThemeBackgroundColor(): [number, number, number, number] | null {
  const probe = window.document.createElement("div")
  probe.style.position = "fixed"
  probe.style.opacity = "0"
  probe.style.pointerEvents = "none"
  probe.style.backgroundColor = "var(--background)"

  window.document.body.appendChild(probe)
  const computedColor = window.getComputedStyle(probe).backgroundColor
  probe.remove()

  return parseCssColorToRgba(computedColor) ?? parseCssColorToRgba(normalizeCssColor(computedColor))
}

export function ThemeProvider({
  children,
  defaultTheme = "stellar",
  storageKey = "stellar-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  React.useEffect(() => {
    const root = window.document.documentElement

    // Remove all possible theme classes using centralized list
    const allThemeClasses = ThemeManager.getAllThemeClasses()
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

  React.useEffect(() => {
    const isTauriDesktop = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
    if (!isTauriDesktop) return

    const color = getThemeBackgroundColor()
    if (!color) return

    getCurrentWindow().setBackgroundColor(color).catch(() => {
      // Ignore failures on unsupported platforms / runtimes.
    })
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
