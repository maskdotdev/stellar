import * as React from "react"
import { Input as UIInput } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useHotkey, useHotkeyPrefix, useHotkeyContext } from "../core"
import { cn } from "@/lib/utils"
import { useForkRef } from "@/hooks/use-fork-ref"

interface InputProps extends React.ComponentProps<typeof UIInput> {
  /** The hotkey label for this input */
  hotkey?: string
  /** Custom action to perform when hotkey is triggered (defaults to focus) */
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

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    hotkey,
    onHotkeyAction,
    showHotkeyIndicator = true,
    hotkeyIndicatorPosition = 'top-right',
    type = 'text',
    hotkeyIndicatorClassName,
    hotkeyGroup,
    hotkeyPriority,
    className,
    ...props 
  }, ref) => {
    
    const { mode } = useHotkeyContext();
    const localRef = React.useRef<HTMLInputElement>(null);

    const defaultHotkeyAction = React.useCallback(() => {
        const element = localRef.current;
        if (!element) {
            return;
        }

        // Simple focus - let the browser handle it naturally
        element.focus();
        
        // Optionally select the text if it's an input
        if (element.select && element.type !== 'button') {
            element.select();
        }
    }, []);
    
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

    const inputElement = (

    <input
      ref={mergedRef}
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
    );

    // For inline indicators, we need to wrap in a container (inputs can't contain badges)
    if (shouldShowIndicator && hotkeyIndicatorPosition === 'inline') {
      return (
        <div className="flex items-center">
          {inputElement}
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
        </div>
      );
    }

    // If we need positioned indicators, wrap in a container
    if (shouldShowIndicator && hotkeyIndicatorPosition !== 'inline') {
      return (
        <div className="relative inline-flex w-full">
          {inputElement}
          
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

    return inputElement;
  }
)

Input.displayName = "Input"

export { Input, type InputProps } 
