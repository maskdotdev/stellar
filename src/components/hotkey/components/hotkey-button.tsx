"use client"

import * as React from "react"
import { Button as UIButton, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useHotkey, useHotkeyPrefix, useHotkeyContext } from "../core"
import { cn } from "@/lib/utils/utils"
import { type VariantProps } from "class-variance-authority"
import { useForkRef } from "@/hooks/use-fork-ref"

interface ButtonProps extends 
  React.ComponentProps<typeof UIButton>,
  VariantProps<typeof buttonVariants> 
{
  /** The hotkey label for this button */
  hotkey?: string
  /** Custom action to perform when hotkey is triggered (defaults to click) */
  onHotkeyAction?: () => void
  /** Show hotkey indicator badge */
  showHotkeyIndicator?: boolean
  /** Position of the hotkey indicator */
  hotkeyIndicatorPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline'
  /** Custom indicator className */
  hotkeyIndicatorClassName?: string
  /** Group name for organizing hotkeys */
  hotkeyGroup?: string
  /** Priority for prefix assignment (higher = shorter prefix) */
  hotkeyPriority?: number
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    hotkey,
    onHotkeyAction,
    showHotkeyIndicator = true,
    hotkeyIndicatorPosition = 'top-right',
    hotkeyIndicatorClassName,
    hotkeyGroup,
    hotkeyPriority,
    className,
    children,
    ...props 
  }, ref) => {
    
    // Get hotkey context to check if user is actively typing
    const { mode } = useHotkeyContext();
    const localRef = React.useRef<HTMLButtonElement>(null);

    const defaultHotkeyAction = React.useCallback(() => {
      localRef.current?.click();
    }, []);
    
    // Register hotkey if provided
    const hotkeyRef = useHotkey(
      hotkey || '', 
      hotkey ? (onHotkeyAction || defaultHotkeyAction) : undefined,
      { group: hotkeyGroup, priority: hotkeyPriority }
    );
    
    // Get the computed prefix
    const prefix = useHotkeyPrefix(hotkey || '');
    
    // Only show indicators when user is actively typing or in leader mode
    const shouldShowIndicator = showHotkeyIndicator && prefix && (mode === 'active' || mode === 'leader');
    
    // Merge refs
    const mergedRef = useForkRef(ref, localRef, hotkeyRef);

    // Position classes for indicator
    const positionClasses = {
      'top-right': 'absolute -top-1 -right-1',
      'top-left': 'absolute -top-1 -left-1', 
      'bottom-right': 'absolute -bottom-1 -right-1',
      'bottom-left': 'absolute -bottom-1 -left-1',
      'inline': 'ml-2'
    };

    const buttonElement = (
      <UIButton
        ref={mergedRef}
        className={cn(
          shouldShowIndicator && hotkeyIndicatorPosition !== 'inline' ? 'relative' : '',
          className
        )}
        {...props}
      >
        {children}
        
        {/* Inline hotkey indicator */}
        {shouldShowIndicator && hotkeyIndicatorPosition === 'inline' && (
          <Badge 
            variant="secondary"
            className={cn(
              "font-mono text-[8px] px-1 py-0 h-4 min-w-[12px] pointer-events-none",
              "bg-primary/90 text-primary-foreground border-0 shadow-sm",
              "ml-2",
              hotkeyIndicatorClassName
            )}
          >
            {prefix}
          </Badge>
        )}
      </UIButton>
    );

    // If we need positioned indicators, wrap in a container
    if (shouldShowIndicator && hotkeyIndicatorPosition !== 'inline') {
      return (
        <div className="relative inline-flex">
          {buttonElement}
          
          {/* Positioned hotkey indicator */}
          <Badge 
            variant="secondary"
            className={cn(
              "font-mono text-[8px] px-1 py-0 h-4 min-w-[12px] pointer-events-none",
              "bg-primary/90 text-primary-foreground border-0 shadow-sm z-10",
              positionClasses[hotkeyIndicatorPosition],
              hotkeyIndicatorClassName
            )}
          >
            {prefix}
          </Badge>
        </div>
      );
    }

    return buttonElement;
  }
)

Button.displayName = "Button"

export { Button, buttonVariants, type ButtonProps } 