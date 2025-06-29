"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useHotkey, useHotkeyPrefix, useHotkeyContext } from "../core"
import { cn } from "@/lib/utils"

type CardComponentProps = React.ComponentProps<typeof Card>

interface HotkeyCardProps extends Omit<CardComponentProps, 'ref'> {
  /** The hotkey label for this card */
  hotkey?: string
  /** Action to perform when hotkey is triggered */
  onHotkeyAction?: () => void
  /** Show hotkey indicator badge */
  showHotkeyIndicator?: boolean
  /** Position of the hotkey indicator */
  hotkeyIndicatorPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  /** Custom hotkey indicator className */
  hotkeyIndicatorClassName?: string
  /** Group name for organizing hotkeys */
  hotkeyGroup?: string
  /** Priority for prefix assignment (higher = shorter prefix) */
  hotkeyPriority?: number
  /** Make the card clickable */
  clickable?: boolean
}

const HotkeyCard = React.forwardRef<HTMLDivElement, HotkeyCardProps>(
  ({ 
    hotkey,
    onHotkeyAction,
    onClick,
    showHotkeyIndicator = true,
    hotkeyIndicatorPosition = 'top-right',
    hotkeyIndicatorClassName,
    hotkeyGroup,
    hotkeyPriority,
    clickable = false,
    className,
    children,
    ...props 
  }, forwardedRef) => {
    // Get hotkey context to check if user is actively typing
    const { mode } = useHotkeyContext();
    
    // Register hotkey if provided
    const hotkeyAction = React.useCallback(() => {
      if (onHotkeyAction) {
        onHotkeyAction()
      } else if (onClick) {
        onClick({} as React.MouseEvent<HTMLDivElement>)
      }
    }, [onHotkeyAction, onClick])

    const hotkeyRef = useHotkey(
      hotkey || '', 
      hotkey ? hotkeyAction : undefined,
      hotkey ? { group: hotkeyGroup, priority: hotkeyPriority } : undefined
    )
    
    // Get the computed prefix
    const prefix = useHotkeyPrefix(hotkey || '')
    
    // Only show indicators when user is actively typing or in leader mode
    const shouldShowIndicator = showHotkeyIndicator && prefix && (mode === 'active' || mode === 'leader');
    
    // Determine which ref to use
    const ref = hotkey ? hotkeyRef : forwardedRef
    
    // Position classes for indicator
    const positionClasses = {
      'top-right': '-top-1 -right-1',
      'top-left': '-top-1 -left-1', 
      'bottom-right': '-bottom-1 -right-1',
      'bottom-left': '-bottom-1 -left-1'
    } as const

    return (
      <Card
        ref={ref as any}
        className={cn(
          clickable && 'cursor-pointer hover:bg-accent/50 transition-colors',
          shouldShowIndicator ? 'relative' : '',
          className
        )}
        onClick={onClick}
        {...props}
      >
        {children}
        
        {/* Hotkey Indicator */}
        {shouldShowIndicator && (
          <Badge 
            variant="secondary"
            className={cn(
              "absolute font-mono text-[8px] px-1 py-0 h-4 min-w-[12px] pointer-events-none",
              "bg-primary/90 text-primary-foreground border-0 shadow-sm z-10",
              positionClasses[hotkeyIndicatorPosition],
              hotkeyIndicatorClassName
            )}
          >
            {prefix}
          </Badge>
        )}
      </Card>
    )
  }
)

HotkeyCard.displayName = "HotkeyCard"

export { HotkeyCard, type HotkeyCardProps } 