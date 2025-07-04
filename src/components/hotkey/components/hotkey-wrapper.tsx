"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { useHotkey, useHotkeyPrefix, useHotkeyContext } from "../core"
import { cn } from "@/lib/utils/utils"

interface HotkeyWrapperProps {
  /** The hotkey label for this element */
  hotkey: string
  /** Action to perform when hotkey is triggered */
  onAction: () => void
  /** Show hotkey indicator badge */
  showIndicator?: boolean
  /** Position of the hotkey indicator */
  indicatorPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline'
  /** Custom indicator className */
  indicatorClassName?: string
  /** Group name for organizing hotkeys */
  group?: string
  /** Priority for prefix assignment (higher = shorter prefix) */
  priority?: number
  /** Wrapper element type */
  as?: React.ElementType
  /** Additional wrapper className */
  className?: string
  /** Children - can be render prop or regular children */
  children: React.ReactNode | ((props: { ref: React.RefObject<HTMLElement>, prefix: string }) => React.ReactNode)
}

const HotkeyWrapper = React.forwardRef<HTMLElement, HotkeyWrapperProps>(
  ({ 
    hotkey,
    onAction,
    showIndicator = true,
    indicatorPosition = 'top-right',
    indicatorClassName,
    group,
    priority,
    as: Component = 'div',
    className,
    children,
    ...props 
  }, forwardedRef) => {
    // Get hotkey context to check if user is actively typing
    const { mode } = useHotkeyContext();
    
    // Register hotkey
    const hotkeyRef = useHotkey(hotkey, onAction, { group, priority })
    
    // Get the computed prefix
    const prefix = useHotkeyPrefix(hotkey)
    
    // Only show indicators when user is actively typing or in leader mode
    const shouldShowIndicator = showIndicator && prefix && (mode === 'active' || mode === 'leader');
    
    // Position classes for indicator
    const positionClasses = {
      'top-right': 'absolute -top-1 -right-1',
      'top-left': 'absolute -top-1 -left-1', 
      'bottom-right': 'absolute -bottom-1 -right-1',
      'bottom-left': 'absolute -bottom-1 -left-1',
      'inline': 'ml-2'
    }

    // Handle render prop pattern
    if (typeof children === 'function') {
      const renderProps = { ref: hotkeyRef, prefix }
      return (
        <Component
          ref={forwardedRef}
          className={cn(
            shouldShowIndicator && indicatorPosition !== 'inline' ? 'relative' : '',
            className
          )}
          {...props}
        >
          {children(renderProps)}
          
          {/* Hotkey Indicator for positioned modes */}
          {shouldShowIndicator && indicatorPosition !== 'inline' && (
            <Badge 
              variant="secondary"
              className={cn(
                "font-mono text-[8px] px-1 py-0 h-4 min-w-[12px] pointer-events-none",
                "bg-primary/90 text-primary-foreground border-0 shadow-sm z-10",
                positionClasses[indicatorPosition],
                indicatorClassName
              )}
            >
              {prefix}
            </Badge>
          )}
        </Component>
      )
    }

    // Handle regular children - clone and add ref to first child if it's a React element
    const enhancedChildren = React.Children.map(children, (child, index) => {
      if (index === 0 && React.isValidElement(child)) {
        return React.cloneElement(child as React.ReactElement<any>, {
          ref: hotkeyRef,
          className: cn(
            (child.props as any)?.className,
            shouldShowIndicator && indicatorPosition !== 'inline' ? 'relative' : ''
          )
        })
      }
      return child
    })

    return (
      <Component
        ref={forwardedRef}
        className={cn(
          shouldShowIndicator && indicatorPosition !== 'inline' ? 'relative' : '',
          className
        )}
        {...props}
      >
        {enhancedChildren}
        
        {/* Hotkey Indicator */}
        {shouldShowIndicator && (
          <Badge 
            variant="secondary"
            className={cn(
              "font-mono text-[8px] px-1 py-0 h-4 min-w-[12px] pointer-events-none",
              "bg-primary/90 text-primary-foreground border-0 shadow-sm",
              indicatorPosition === 'inline' ? 'ml-2' : `absolute ${positionClasses[indicatorPosition]?.replace('absolute ', '')} z-10`,
              indicatorClassName
            )}
          >
            {prefix}
          </Badge>
        )}
      </Component>
    )
  }
)

HotkeyWrapper.displayName = "HotkeyWrapper"

export { HotkeyWrapper, type HotkeyWrapperProps } 