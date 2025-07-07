import { useEffect, useState } from 'react';

/**
 * List of all available theme classes from themes.css
 */
export const THEME_CLASSES = [
  'stellar', 'rose', 'dark-teal', 'light-teal', 'space', 'aurora', 
  'starfield', 'infinity', 'dark-infinity', 'cosmos', 'dark-cosmos',
  'nebula', 'dark-nebula', 'starry-night', 'dark-starry-night',
  'solar-flare', 'dark-solar-flare', 'catppuccin', 'dark-catppuccin',
  'pluto', 'dark-pluto', 't3-chat', 'dark-t3-chat', 'dark'
] as const;

export type ThemeClass = typeof THEME_CLASSES[number];

/**
 * Theme categories for different styling approaches
 */
export const THEME_CATEGORIES = {
  cosmic: ['space', 'starfield', 'aurora', 'cosmos', 'dark-cosmos', 'nebula', 'dark-nebula'],
  stellar: ['stellar', 'light-teal', 'dark-teal'],
  artistic: ['starry-night', 'dark-starry-night', 'solar-flare', 'dark-solar-flare'],
  minimal: ['pluto', 'dark-pluto', 'infinity', 'dark-infinity'],
  colorful: ['catppuccin', 'dark-catppuccin', 'rose', 't3-chat', 'dark-t3-chat'],
} as const;

/**
 * Hook to detect and track the current theme
 */
export function useThemeDetection() {
  const [currentTheme, setCurrentTheme] = useState<ThemeClass | 'default'>('default');
  
  useEffect(() => {
    const detectTheme = () => {
      const html = document.documentElement;
      const classList = Array.from(html.classList);
      
      const activeTheme = classList.find(cls => 
        THEME_CLASSES.includes(cls as ThemeClass)
      ) as ThemeClass;
      
      setCurrentTheme(activeTheme || 'default');
    };
    
    detectTheme();
    
    // Listen for theme changes
    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);
  
  return currentTheme;
}

/**
 * Get theme category for a given theme
 */
export function getThemeCategory(theme: ThemeClass | 'default'): keyof typeof THEME_CATEGORIES | 'default' {
  if (theme === 'default') return 'default';
  
  for (const [category, themes] of Object.entries(THEME_CATEGORIES)) {
    if ((themes as readonly string[]).includes(theme)) {
      return category as keyof typeof THEME_CATEGORIES;
    }
  }
  
  return 'default';
}

/**
 * Check if a theme is dark mode
 */
export function isDarkTheme(theme: ThemeClass | 'default'): boolean {
  if (theme === 'default') return false;
  return theme.includes('dark') || theme === 'space' || theme === 'pluto';
}

/**
 * Get theme-specific CSS variables for component styling
 */
export function getThemeVariables(theme: ThemeClass | 'default') {
  const baseVariables = {
    '--component-bg': 'hsl(var(--background))',
    '--component-fg': 'hsl(var(--foreground))',
    '--component-card': 'hsl(var(--card))',
    '--component-card-fg': 'hsl(var(--card-foreground))',
    '--component-primary': 'hsl(var(--primary))',
    '--component-primary-fg': 'hsl(var(--primary-foreground))',
    '--component-secondary': 'hsl(var(--secondary))',
    '--component-secondary-fg': 'hsl(var(--secondary-foreground))',
    '--component-muted': 'hsl(var(--muted))',
    '--component-muted-fg': 'hsl(var(--muted-foreground))',
    '--component-accent': 'hsl(var(--accent))',
    '--component-accent-fg': 'hsl(var(--accent-foreground))',
    '--component-border': 'hsl(var(--border))',
    '--component-input': 'hsl(var(--input))',
    '--component-ring': 'hsl(var(--ring))',
    '--component-destructive': 'hsl(var(--destructive))',
    '--component-destructive-fg': 'hsl(var(--destructive-foreground))',
    '--component-radius': 'var(--radius)',
    '--component-font-sans': 'var(--font-sans)',
    '--component-font-mono': 'var(--font-mono)',
    '--component-font-serif': 'var(--font-serif)',
    '--component-shadow-sm': 'var(--shadow-sm)',
    '--component-shadow-md': 'var(--shadow-md)',
    '--component-shadow-lg': 'var(--shadow-lg)',
    '--component-shadow-xl': 'var(--shadow-xl)',
  };

  // Add sidebar-specific variables for themes that support them
  if (theme !== 'default') {
    return {
      ...baseVariables,
      '--component-sidebar-bg': 'hsl(var(--sidebar))',
      '--component-sidebar-fg': 'hsl(var(--sidebar-foreground))',
      '--component-sidebar-primary': 'hsl(var(--sidebar-primary))',
      '--component-sidebar-primary-fg': 'hsl(var(--sidebar-primary-foreground))',
      '--component-sidebar-accent': 'hsl(var(--sidebar-accent))',
      '--component-sidebar-accent-fg': 'hsl(var(--sidebar-accent-foreground))',
      '--component-sidebar-border': 'hsl(var(--sidebar-border))',
      '--component-sidebar-ring': 'hsl(var(--sidebar-ring))',
    };
  }

  return baseVariables;
}

/**
 * Get theme-specific class names for components
 */
export function getThemeClasses(theme: ThemeClass | 'default', baseClasses: string[] = []): string[] {
  const themeSpecificClasses = [...baseClasses];
  
  // Add theme-specific classes
  switch (theme) {
    case 'stellar':
    case 'light-teal':
      themeSpecificClasses.push('theme-stellar');
      break;
    case 'dark-teal':
      themeSpecificClasses.push('theme-stellar', 'theme-dark');
      break;
    case 'space':
      themeSpecificClasses.push('theme-cosmic', 'theme-space');
      break;
    case 'aurora':
      themeSpecificClasses.push('theme-cosmic', 'theme-aurora');
      break;
    case 'starfield':
      themeSpecificClasses.push('theme-cosmic', 'theme-starfield');
      break;
    case 'cosmos':
    case 'dark-cosmos':
      themeSpecificClasses.push('theme-cosmic', 'theme-cosmos');
      break;
    case 'nebula':
    case 'dark-nebula':
      themeSpecificClasses.push('theme-cosmic', 'theme-nebula');
      break;
    case 'pluto':
    case 'dark-pluto':
      themeSpecificClasses.push('theme-minimal', 'theme-pluto');
      break;
    case 'infinity':
    case 'dark-infinity':
      themeSpecificClasses.push('theme-minimal', 'theme-infinity');
      break;
    case 'catppuccin':
    case 'dark-catppuccin':
      themeSpecificClasses.push('theme-colorful', 'theme-catppuccin');
      break;
    case 'rose':
      themeSpecificClasses.push('theme-colorful', 'theme-rose');
      break;
    case 't3-chat':
    case 'dark-t3-chat':
      themeSpecificClasses.push('theme-colorful', 'theme-t3-chat');
      break;
    case 'starry-night':
    case 'dark-starry-night':
      themeSpecificClasses.push('theme-artistic', 'theme-starry-night');
      break;
    case 'solar-flare':
    case 'dark-solar-flare':
      themeSpecificClasses.push('theme-artistic', 'theme-solar-flare');
      break;
    default:
      themeSpecificClasses.push('theme-default');
  }
  
  // Add dark mode class
  if (isDarkTheme(theme)) {
    themeSpecificClasses.push('theme-dark');
  }
  
  return themeSpecificClasses;
}

/**
 * Get theme-specific shadow styles
 */
export function getThemeShadows(theme: ThemeClass | 'default') {
  const category = getThemeCategory(theme);
  
  switch (category) {
    case 'cosmic':
      return {
        small: 'var(--shadow-sm), 0 0 8px hsl(var(--primary)/0.1)',
        medium: 'var(--shadow-md), 0 0 12px hsl(var(--primary)/0.15)',
        large: 'var(--shadow-lg), 0 0 20px hsl(var(--primary)/0.2)',
      };
    case 'stellar':
      return {
        small: 'var(--shadow-sm), 0 0 4px hsl(var(--primary)/0.1)',
        medium: 'var(--shadow-md), 0 0 8px hsl(var(--primary)/0.15)',
        large: 'var(--shadow-lg), 0 0 12px hsl(var(--primary)/0.2)',
      };
    case 'minimal':
      if (theme === 'pluto' || theme === 'dark-pluto') {
        return {
          small: '4px 4px 0px 0px hsl(var(--foreground)/0.1)',
          medium: '6px 6px 0px 0px hsl(var(--foreground)/0.15)',
          large: '8px 8px 0px 0px hsl(var(--foreground)/0.2)',
        };
      }
      return {
        small: 'var(--shadow-xs)',
        medium: 'var(--shadow-sm)',
        large: 'var(--shadow-md)',
      };
    default:
      return {
        small: 'var(--shadow-sm)',
        medium: 'var(--shadow-md)',
        large: 'var(--shadow-lg)',
      };
  }
}

/**
 * Get theme-specific animation preferences
 */
export function getThemeAnimations(theme: ThemeClass | 'default') {
  const category = getThemeCategory(theme);
  
  switch (category) {
    case 'cosmic':
      return {
        duration: '0.3s',
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        enableGlow: true,
        enableFloat: true,
      };
    case 'stellar':
      return {
        duration: '0.25s',
        easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        enableGlow: true,
        enableFloat: false,
      };
    case 'minimal':
      return {
        duration: '0.15s',
        easing: 'cubic-bezier(0.4, 0, 1, 1)',
        enableGlow: false,
        enableFloat: false,
      };
    default:
      return {
        duration: '0.2s',
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        enableGlow: false,
        enableFloat: false,
      };
  }
}

/**
 * Create a theme-aware style object
 */
export function createThemeStyle(theme: ThemeClass | 'default', customStyles: Record<string, any> = {}): Record<string, any> {
  const variables = getThemeVariables(theme);
  const shadows = getThemeShadows(theme);
  const animations = getThemeAnimations(theme);
  
  return {
    ...variables,
    '--theme-shadow-sm': shadows.small,
    '--theme-shadow-md': shadows.medium,
    '--theme-shadow-lg': shadows.large,
    '--theme-animation-duration': animations.duration,
    '--theme-animation-easing': animations.easing,
    ...customStyles,
  };
}

/**
 * Hook for comprehensive theme integration
 */
export function useThemeIntegration() {
  const currentTheme = useThemeDetection();
  const category = getThemeCategory(currentTheme);
  const isDark = isDarkTheme(currentTheme);
  const variables = getThemeVariables(currentTheme);
  const shadows = getThemeShadows(currentTheme);
  const animations = getThemeAnimations(currentTheme);
  
  return {
    theme: currentTheme,
    category,
    isDark,
    variables,
    shadows,
    animations,
    getClasses: (baseClasses: string[] = []) => getThemeClasses(currentTheme, baseClasses),
    createStyle: (customStyles: Record<string, any> = {}) => createThemeStyle(currentTheme, customStyles),
  };
} 