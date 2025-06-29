"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { useHotkey, useHotkeyPrefix } from "../core"
import { cn } from "@/lib/utils"

interface HotkeyWrapperProps {
  hotkey: string
  onAction: () => void
  showIndicator?: boolean
  indicatorPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline'
  indicatorClassName?: string
  group?: string
  priority?: number
  className?: string
  children: React.ReactNode
}

// Simplified version without complex ref cloning
export const HotkeyWrapperDebug: React.FC<HotkeyWrapperProps> = ({ 
  hotkey,
  onAction,
  showIndicator = true,
  indicatorPosition = 'top-right',
  indicatorClassName,
  group,
  priority,
  className,
  children,
}) => {
  // Register hotkey and get ref
  const hotkeyRef = useHotkey(hotkey, onAction, { group, priority })
  
  // Get the computed prefix
  const prefix = useHotkeyPrefix(hotkey)
  
  // Debug logging
  React.useEffect(() => {
    console.log('🎯 HotkeyWrapper Debug:', {
      hotkey,
      prefix,
      hasRef: !!hotkeyRef.current,
      refElement: hotkeyRef.current?.tagName,
    })
  }, [hotkey, prefix, hotkeyRef])
  
  // Position classes
  const positionClasses = {
    'top-right': '-top-1 -right-1',
    'top-left': '-top-1 -left-1', 
    'bottom-right': '-bottom-1 -right-1',
    'bottom-left': '-bottom-1 -left-1',
    'inline': ''
  }

  return (
    <div 
      className={cn(
        'relative inline-flex',
        className
      )}
    >
      {/* Clone first child and add ref */}
      {React.Children.map(children, (child, index) => {
        if (index === 0 && React.isValidElement(child)) {
          return React.cloneElement(child as any, {
            ref: hotkeyRef,
          })
        }
        return child
      })}
      
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute -bottom-6 left-0 text-xs text-muted-foreground">
          {hotkey}: {prefix || 'no prefix'}
        </div>
      )}
      
      {/* Hotkey Indicator */}
      {showIndicator && prefix && indicatorPosition !== 'inline' && (
        <Badge 
          variant="secondary"
          className={cn(
            "absolute font-mono text-[8px] px-1 py-0 h-4 min-w-[12px] pointer-events-none z-10",
            "bg-primary text-primary-foreground border-0 shadow-sm",
            positionClasses[indicatorPosition],
            indicatorClassName
          )}
        >
          {prefix}
        </Badge>
      )}
      
      {/* Inline indicator */}
      {showIndicator && prefix && indicatorPosition === 'inline' && (
        <Badge 
          variant="outline"
          className={cn(
            "ml-2 font-mono text-xs",
            indicatorClassName
          )}
        >
          {prefix}
        </Badge>
      )}
    </div>
  )
} 