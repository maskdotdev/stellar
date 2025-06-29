import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export centralized theme functions
export { 
  getBaseTheme, 
  isDarkTheme, 
  toggleDarkMode, 
  setDarkModeState,
  ThemeManager 
} from "@/lib/theme-config"
