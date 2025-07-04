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
} from "../config/theme-config"

export function formatNumber(number: number) {
  // Returns clean formatted numbers like 200K, 1.5M, 2.3B, etc.
  const formatWithSuffix = (value: number, suffix: string) => {
    const rounded = Math.round(value * 100) / 100; // Round to 2 decimal places
    const formatted = rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(rounded % 1 < 0.1 ? 1 : 2);
    return formatted + suffix;
  };

  if (number >= 1000000000000) {
    return formatWithSuffix(number / 1000000000000, "T");
  } else if (number >= 1000000000) {
    return formatWithSuffix(number / 1000000000, "B");
  } else if (number >= 1000000) {
    return formatWithSuffix(number / 1000000, "M");
  } else if (number >= 1000) {
    return formatWithSuffix(number / 1000, "K");
  } else {
    return number % 1 === 0 ? number.toString() : number.toFixed(2);
  }
}