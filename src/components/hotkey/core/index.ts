// Core hotkey system
export { HotkeyProvider, useHotkey, useHotkeyContext } from './hotkey-provider'
export { HotkeyOverlay, HotkeyIndicator, useHotkeyPrefix } from './hotkey-overlay'

// Re-export types from the main system
export type { HotkeyMode, HotkeyContextType } from '@/lib/hotkey-system' 