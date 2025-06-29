"use client"

import * as React from "react"
import { HotkeyWrapper, type HotkeyWrapperProps } from "../components"
import { useHotkey } from "../core"

/**
 * Convenience hook for simple hotkey registration without wrapper
 */
export const useSimpleHotkey = (hotkey: string, onAction: () => void, options?: { group?: string; priority?: number }) => {
  return useHotkey(hotkey, onAction, options)
}

/**
 * Higher-order component for adding hotkey functionality to any component
 */
export const withHotkey = <P extends object>(
  Component: React.ComponentType<P>,
  defaultHotkeyProps?: Partial<HotkeyWrapperProps>
) => {
  const WithHotkeyComponent = React.forwardRef<any, P & Partial<HotkeyWrapperProps>>(
    ({ hotkey, onAction, ...props }, ref) => {
      if (!hotkey || !onAction) {
        return <Component ref={ref} {...(props as P)} />
      }

      return (
        <HotkeyWrapper 
          hotkey={hotkey} 
          onAction={onAction} 
          {...defaultHotkeyProps}
          {...(props as any)}
        >
          <Component ref={ref} {...(props as P)} />
        </HotkeyWrapper>
      )
    }
  )

  WithHotkeyComponent.displayName = `withHotkey(${Component.displayName || Component.name})`
  return WithHotkeyComponent
}

export { HotkeyWrapper } 